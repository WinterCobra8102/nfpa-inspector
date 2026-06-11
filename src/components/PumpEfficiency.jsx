import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Activity, Droplets, TrendingUp, Calculator, 
  ShieldCheck, Gauge, CheckCircle2, Save, FileText, X, History, Info, Clock 
} from 'lucide-react'; // <-- ¡AQUÍ ESTABA EL DETALLE! Faltaba importar Clock
import toast from 'react-hot-toast';

export default function PumpEfficiency() {
  // --- ESTADOS DE ENTRADA ---
  const [ratedGPM, setRatedGPM] = useState('');
  const [ratedPSI, setRatedPSI] = useState('');
  const [churnSuction, setChurnSuction] = useState('');
  const [churnDischarge, setChurnDischarge] = useState('');
  const [ratedSuction, setRatedSuction] = useState('');
  const [ratedDischarge, setRatedDischarge] = useState('');
  
  // --- ESTADOS DE GUARDADO E HISTORIAL ---
  const [testName, setTestName] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [savedTests, setSavedTests] = useState([]);
  const [currentViewId, setCurrentViewId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('pump_tests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setSavedTests(data);
  };

  // =======================================================================
  // MOTOR MATEMÁTICO BLINDADO
  // =======================================================================
  const mathData = useMemo(() => {
    const isComplete = ratedGPM !== '' && ratedPSI !== '' && 
                       churnSuction !== '' && churnDischarge !== '' && 
                       ratedSuction !== '' && ratedDischarge !== '';

    if (!isComplete) return { valid: false };

    const rGPM = Number(ratedGPM);
    const rPSI = Number(ratedPSI);

    if (rGPM <= 0) return { valid: false };

    const cNet = Number(churnDischarge) - Number(churnSuction);
    const actRatedNet = Number(ratedDischarge) - Number(ratedSuction);

    const k = (cNet - actRatedNet) / (rGPM * rGPM);
    const gpm150 = rGPM * 1.5;
    const predicted150Net = cNet - (k * (gpm150 * gpm150));
    const min150NFPA = rPSI * 0.65;
    
    return {
      valid: true,
      cNet, actRatedNet, gpm150, predicted150Net, min150NFPA,
      isPassing: predicted150Net >= min150NFPA,
      k, rGPM, rPSI
    };
  }, [ratedGPM, ratedPSI, churnSuction, churnDischarge, ratedSuction, ratedDischarge]);

  // =======================================================================
  // GENERADOR DE GRÁFICA VECTORIAL
  // =======================================================================
  const chartData = useMemo(() => {
    if (!mathData.valid) return null;

    const { rGPM, rPSI, cNet, actRatedNet, gpm150, predicted150Net, min150NFPA, k } = mathData;

    const w = 800; 
    const h = 400; 
    const maxGPM = gpm150 * 1.15; 
    const maxPSI = Math.max(cNet, rPSI) * 1.2; 

    let path = "";
    const steps = 60; 
    for (let i = 0; i <= steps; i++) {
      const curGPM = (maxGPM / steps) * i;
      // Matemáticas seguras para no dibujar fuera del canvas
      const curPSI = Math.max(0, cNet - (k * (curGPM * curGPM))); 
      const x = (curGPM / maxGPM) * w;
      const y = h - ((curPSI / maxPSI) * h);
      path += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
    }

    return {
      w, h, maxGPM, maxPSI, path,
      p0: { x: 0, y: Math.max(0, h - (cNet / maxPSI * h)) },
      p100: { x: (rGPM / maxGPM) * w, y: Math.max(0, h - (actRatedNet / maxPSI * h)) },
      p150: { x: (gpm150 / maxGPM) * w, y: Math.max(0, h - (predicted150Net / maxPSI * h)) },
      lineNFPA: Math.max(0, h - (min150NFPA / maxPSI * h))
    };
  }, [mathData]);

  // =======================================================================
  // FUNCIONES DE BASE DE DATOS
  // =======================================================================
  const saveTestToDB = async () => {
    if (!mathData.valid) {
      toast.error("⚠️ Llene todos los parámetros operativos."); return;
    }
    if (!testName) {
      toast.error("⚠️ Asigne un nombre al reporte."); return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Guardando reporte en la nube...");

    try {
      const { error } = await supabase.from('pump_tests').insert([{
        test_name: testName.toUpperCase(),
        explanation: explanationText,
        rated_gpm: Number(ratedGPM),
        rated_psi: Number(ratedPSI),
        churn_suction: Number(churnSuction),
        churn_discharge: Number(churnDischarge),
        rated_suction: Number(ratedSuction),
        rated_discharge: Number(ratedDischarge),
        predicted_psi: mathData.predicted150Net,
        is_passing: mathData.isPassing
      }]);

      if (error) throw error;

      toast.success("Reporte guardado exitosamente", { id: loadingToast });
      clearForm();
      fetchHistory();
    } catch (err) {
      toast.error("Error al guardar: " + err.message, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const loadTest = (test) => {
    setRatedGPM(test.rated_gpm); setRatedPSI(test.rated_psi);
    setChurnSuction(test.churn_suction); setChurnDischarge(test.churn_discharge);
    setRatedSuction(test.rated_suction); setRatedDischarge(test.rated_discharge);
    setTestName(test.test_name); setExplanationText(test.explanation || '');
    setCurrentViewId(test.id);
  };

  const clearForm = () => {
    setRatedGPM(''); setRatedPSI(''); setChurnSuction(''); setChurnDischarge(''); 
    setRatedSuction(''); setRatedDischarge(''); setTestName(''); setExplanationText('');
    setCurrentViewId(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER LIMPIO Y PROFESIONAL */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="bg-red-600 p-4 rounded-2xl text-white shadow-lg shadow-red-600/20">
            <Calculator size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-800">Eficiencia de Caudal</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Análisis Predictivo NFPA 25</p>
          </div>
        </div>
        {currentViewId && (
          <button onClick={clearForm} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95">
            <X size={16}/> Nuevo Análisis
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================================================= */}
        {/* COLUMNA 1: HISTORIAL (3/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-md h-[800px] flex flex-col">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
              <History size={16} className="text-slate-800"/> Historial de Pruebas
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {savedTests.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <FileText size={32} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin registros</p>
                </div>
              ) : (
                savedTests.map(test => (
                  <div 
                    key={test.id} 
                    onClick={() => loadTest(test)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 ${currentViewId === test.id ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                  >
                    <p className="text-[9px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock size={10}/> {new Date(test.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] font-black uppercase text-slate-800 leading-tight mb-3">
                      {test.test_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${test.is_passing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {test.is_passing ? 'Aprobado' : 'Fallo'}
                      </span>
                      <span className="text-[10px] font-black text-slate-500">{test.predicted_psi?.toFixed(1)} PSI</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* COLUMNA 2: CAPTURA DE DATOS (3/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Tarjeta 1: Placa Nominal */}
          <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-800"></div>
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <ShieldCheck size={14} className="text-slate-800"/> Placa Nominal
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Caudal (GPM)</label>
                <input type="number" value={ratedGPM} onChange={e => setRatedGPM(e.target.value)} disabled={!!currentViewId} placeholder="Ej: 500" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-red-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Presión (PSI)</label>
                <input type="number" value={ratedPSI} onChange={e => setRatedPSI(e.target.value)} disabled={!!currentViewId} placeholder="Ej: 120" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-red-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Churn */}
          <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <Gauge size={14} className="text-blue-500"/> Churn (0% Caudal)
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Succión (PSI)</label>
                <input type="number" value={churnSuction} onChange={e => setChurnSuction(e.target.value)} disabled={!!currentViewId} placeholder="0" className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl font-black text-slate-700 outline-none focus:border-blue-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Descarga (PSI)</label>
                <input type="number" value={churnDischarge} onChange={e => setChurnDischarge(e.target.value)} disabled={!!currentViewId} placeholder="0" className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl font-black text-slate-700 outline-none focus:border-blue-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Prueba Nominal */}
          <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <Droplets size={14} className="text-green-500"/> Flujo Nominal (100%)
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Succión (PSI)</label>
                <input type="number" value={ratedSuction} onChange={e => setRatedSuction(e.target.value)} disabled={!!currentViewId} placeholder="0" className="w-full p-3 bg-green-50/50 border border-green-100 rounded-xl font-black text-slate-700 outline-none focus:border-green-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 mb-1.5 block tracking-wider">Descarga (PSI)</label>
                <input type="number" value={ratedDischarge} onChange={e => setRatedDischarge(e.target.value)} disabled={!!currentViewId} placeholder="0" className="w-full p-3 bg-green-50/50 border border-green-100 rounded-xl font-black text-slate-700 outline-none focus:border-green-400 focus:bg-white text-xs transition-colors disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Tarjeta 4: Guardar Reporte */}
          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-slate-800"/> Documentar Reporte
            </h3>
            <div className="space-y-3">
              <input type="text" value={testName} onChange={e => setTestName(e.target.value)} disabled={!!currentViewId} placeholder="NOMBRE DEL EQUIPO O SUCURSAL" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-red-400 text-[10px] uppercase tracking-wider disabled:opacity-50" />
              <textarea value={explanationText} onChange={e => setExplanationText(e.target.value)} disabled={!!currentViewId} placeholder="Notas técnicas o diagnóstico del resultado..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-red-400 h-20 resize-none disabled:opacity-50 custom-scrollbar" />
              
              {!currentViewId && (
                <button onClick={saveTestToDB} disabled={isSaving} className="w-full py-4 mt-2 bg-slate-900 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  {isSaving ? "Guardando..." : <><Save size={16}/> Guardar Resultado</>}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ================================================= */}
        {/* COLUMNA 3: GRÁFICA Y RESULTADOS (6/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-6 h-[800px] flex flex-col">
          <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col border-t-8 border-red-600 relative overflow-hidden">
            
            {/* Decal de fondo para diseño */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-red-600/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-2xl border border-white/5">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-2xl leading-none">Curva H-Q</h3>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Simulador de Desempeño</p>
                </div>
              </div>
            </div>

            {!mathData.valid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Activity size={80} className="text-slate-600 mb-6" />
                <p className="text-sm font-black uppercase text-slate-300 tracking-widest">Esperando Parámetros</p>
                <p className="text-xs font-medium text-slate-500 mt-2 max-w-xs leading-relaxed">El motor predictivo generará la gráfica automáticamente al completar los datos del equipo.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6 relative z-10">
                
                {/* Resultados Rápidos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={12} className="text-slate-400"/>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Mínimo Exigido NFPA</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white tracking-tighter">{mathData.min150NFPA.toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PSI</span>
                    </div>
                  </div>
                  
                  <div className={`p-5 rounded-3xl border backdrop-blur-sm ${mathData.isPassing ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {mathData.isPassing ? <CheckCircle2 size={12} className="text-green-400"/> : <Activity size={12} className="text-red-400"/>}
                      <p className={`text-[9px] font-black uppercase tracking-widest ${mathData.isPassing ? 'text-green-400' : 'text-red-400'}`}>
                        Proyección 150%
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white tracking-tighter">{mathData.predicted150Net.toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">PSI</span>
                    </div>
                  </div>
                </div>

                {/* Contenedor Gráfica Mejorado */}
                <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 p-6 flex items-center justify-center shadow-inner relative overflow-hidden">
                  
                  <div className="relative w-full h-full min-h-[300px]">
                    {/* Etiquetas Ejes */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-black text-slate-500 uppercase tracking-widest">Presión (PSI)</div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Caudal (GPM)</div>
                    
                    <svg viewBox={`0 0 ${chartData.w} ${chartData.h}`} className="w-full h-full overflow-hidden">
                      {/* Rejilla Fina */}
                      <line x1="0" y1={chartData.h * 0.25} x2={chartData.w} y2={chartData.h * 0.25} stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1={chartData.h * 0.50} x2={chartData.w} y2={chartData.h * 0.50} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="0" y1={chartData.h * 0.75} x2={chartData.w} y2={chartData.h * 0.75} stroke="#1e293b" strokeWidth="1" />
                      <line x1={chartData.w * 0.50} y1="0" x2={chartData.w * 0.50} y2={chartData.h} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                      
                      {/* Ejes Principales */}
                      <line x1="0" y1={chartData.h} x2={chartData.w} y2={chartData.h} stroke="#475569" strokeWidth="3" />
                      <line x1="0" y1="0" x2="0" y2={chartData.h} stroke="#475569" strokeWidth="3" />

                      {/* Límite NFPA (Línea Roja) */}
                      <line x1="0" y1={chartData.lineNFPA} x2={chartData.w} y2={chartData.lineNFPA} stroke="#ef4444" strokeWidth="2" strokeDasharray="8,8" opacity="0.8" />
                      <text x="10" y={chartData.lineNFPA - 10} fill="#ef4444" fontSize="12" fontWeight="bold" opacity="0.8">Límite 65% NFPA</text>

                      {/* Curva Matemática Azul */}
                      <path d={chartData.path} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />

                      {/* Puntos Clave de Medición */}
                      {/* Punto 0% */}
                      <circle cx={chartData.p0.x} cy={chartData.p0.y} r="6" fill="#3b82f6" stroke="#020617" strokeWidth="3" />
                      
                      {/* Punto 100% */}
                      <circle cx={chartData.p100.x} cy={chartData.p100.y} r="6" fill="#3b82f6" stroke="#020617" strokeWidth="3" />
                      
                      {/* Punto de Proyección 150% */}
                      <circle cx={chartData.p150.x} cy={chartData.p150.y} r="8" fill={mathData.isPassing ? "#22c55e" : "#ef4444"} stroke="#020617" strokeWidth="3" />
                      
                      {/* Etiqueta de Resultado Final (Acomodada) */}
                      <text 
                        x={chartData.p150.x + 15} 
                        y={chartData.p150.y + 5} 
                        fill={mathData.isPassing ? "#4ade80" : "#f87171"} 
                        fontSize="14" 
                        fontWeight="900"
                        className="drop-shadow-md"
                      >
                        {mathData.isPassing ? 'PASA' : 'FALLA'}
                      </text>
                    </svg>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}