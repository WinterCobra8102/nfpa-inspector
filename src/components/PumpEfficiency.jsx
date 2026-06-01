import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Activity, Droplets, TrendingUp, Calculator, 
  ShieldCheck, Gauge, CheckCircle2, XOctagon, Save, FileText, X, History 
} from 'lucide-react';
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

  // Cargar historial al iniciar
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
  // MOTOR MATEMÁTICO BLINDADO (0 Lag)
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
      const curPSI = Math.max(0, cNet - (k * (curGPM * curGPM)));
      
      const x = (curGPM / maxGPM) * w;
      const y = h - ((curPSI / maxPSI) * h);
      path += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
    }

    return {
      w, h, maxGPM, maxPSI, path,
      p0: { x: 0, y: h - (cNet / maxPSI * h) },
      p100: { x: (rGPM / maxGPM) * w, y: h - (actRatedNet / maxPSI * h) },
      p150: { x: (gpm150 / maxGPM) * w, y: h - (predicted150Net / maxPSI * h) },
      lineNFPA: h - (min150NFPA / maxPSI * h)
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
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER LIMPIO */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-4 rounded-xl text-white">
            <Calculator size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-800">Eficiencia de Caudal</h2>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Algoritmo Predictivo NFPA 25</p>
          </div>
        </div>
        {currentViewId && (
          <button onClick={clearForm} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            <X size={16}/> Nueva Prueba
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ================================================= */}
        {/* COLUMNA 1: HISTORIAL (3 columnas) */}
        {/* ================================================= */}
        <div className="xl:col-span-3">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm h-[800px] flex flex-col">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
              <History size={16} className="text-red-600"/> Historial Guardado
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {savedTests.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <FileText size={32} className="mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin registros</p>
                </div>
              ) : (
                savedTests.map(test => (
                  <div 
                    key={test.id} 
                    onClick={() => loadTest(test)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${currentViewId === test.id ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <p className="text-[9px] font-bold text-slate-400 mb-1">
                      {new Date(test.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] font-black uppercase text-slate-800 leading-tight mb-2">
                      {test.test_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${test.is_passing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
        {/* COLUMNA 2: CAPTURA DE DATOS (4 columnas) */}
        {/* ================================================= */}
        <div className="xl:col-span-4 space-y-4">
          
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-slate-800"/> Datos de Placa Nominal
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Caudal (GPM)</label>
                <input type="number" value={ratedGPM} onChange={e => setRatedGPM(e.target.value)} disabled={!!currentViewId} placeholder="500" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-red-500 text-xs disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Presión (PSI)</label>
                <input type="number" value={ratedPSI} onChange={e => setRatedPSI(e.target.value)} disabled={!!currentViewId} placeholder="120" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-red-500 text-xs disabled:opacity-50" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Gauge size={14} className="text-blue-500"/> Churn (0% Caudal)
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Succión</label>
                <input type="number" value={churnSuction} onChange={e => setChurnSuction(e.target.value)} disabled={!!currentViewId} placeholder="PSI" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 text-xs disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Descarga</label>
                <input type="number" value={churnDischarge} onChange={e => setChurnDischarge(e.target.value)} disabled={!!currentViewId} placeholder="PSI" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 text-xs disabled:opacity-50" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Droplets size={14} className="text-green-500"/> Prueba Nominal (100%)
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Succión</label>
                <input type="number" value={ratedSuction} onChange={e => setRatedSuction(e.target.value)} disabled={!!currentViewId} placeholder="PSI" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-green-500 text-xs disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Descarga</label>
                <input type="number" value={ratedDischarge} onChange={e => setRatedDischarge(e.target.value)} disabled={!!currentViewId} placeholder="PSI" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-green-500 text-xs disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Formulario de Guardado */}
          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-slate-800"/> Documentar Reporte
            </h3>
            <div className="space-y-3">
              <input type="text" value={testName} onChange={e => setTestName(e.target.value)} disabled={!!currentViewId} placeholder="NOMBRE DEL EQUIPO O CLIENTE" className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-red-500 text-xs uppercase disabled:opacity-50" />
              <textarea value={explanationText} onChange={e => setExplanationText(e.target.value)} disabled={!!currentViewId} placeholder="Notas técnicas, diagnóstico o explicación del resultado..." className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-600 outline-none focus:border-red-500 h-20 resize-none disabled:opacity-50" />
              
              {!currentViewId && (
                <button onClick={saveTestToDB} disabled={isSaving} className="w-full bg-slate-900 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                  {isSaving ? "Guardando..." : <><Save size={14}/> Guardar Resultado</>}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ================================================= */}
        {/* COLUMNA 3: GRÁFICA Y RESULTADOS (5 columnas) */}
        {/* ================================================= */}
        <div className="xl:col-span-5 h-full">
          <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-2xl h-full flex flex-col border-t-8 border-red-600 relative overflow-hidden">
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 text-white rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-xl leading-none">Curva H-Q</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis Predictivo 150%</p>
                </div>
              </div>
            </div>

            {!mathData.valid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <Activity size={64} className="text-slate-500 mb-4" />
                <p className="text-sm font-black uppercase text-slate-300 tracking-widest">Ingrese los parámetros</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 max-w-xs">La gráfica y los cálculos se generarán automáticamente al completar los datos.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-6 relative z-10">
                
                {/* Resultados Rápidos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Mínimo Exigido</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">{mathData.min150NFPA.toFixed(1)}</span>
                      <span className="text-[9px] font-bold text-slate-500">PSI</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${mathData.isPassing ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${mathData.isPassing ? 'text-green-400' : 'text-red-400'}`}>
                      Proyección 150%
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">{mathData.predicted150Net.toFixed(1)}</span>
                      <span className="text-[9px] font-bold text-white/50">PSI</span>
                    </div>
                  </div>
                </div>
                {/* Contenedor Gráfica */}
                <div className="flex-1 bg-[#0f172a] rounded-3xl border border-slate-700 p-4 min-h-[250px] flex items-center justify-center shadow-inner">
                  <div className="relative w-full aspect-video">
                    {/* Etiquetas */}
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black text-slate-500 uppercase">PSI</div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-500 uppercase">GPM</div>
                    <svg viewBox={`0 0 ${chartData.w} ${chartData.h}`} className="w-full h-full overflow-visible">
                      {/* Rejilla */}
                      <line x1="0" y1={chartData.h * 0.50} x2={chartData.w} y2={chartData.h * 0.50} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1={chartData.w * 0.50} y1="0" x2={chartData.w * 0.50} y2={chartData.h} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
                      
                      {/* Ejes */}
                      <line x1="0" y1={chartData.h} x2={chartData.w} y2={chartData.h} stroke="#64748b" strokeWidth="3" />
                      <line x1="0" y1="0" x2="0" y2={chartData.h} stroke="#64748b" strokeWidth="3" />

                      {/* Límite NFPA */}
                      <line x1="0" y1={chartData.lineNFPA} x2={chartData.w} y2={chartData.lineNFPA} stroke="#ef4444" strokeWidth="2" strokeDasharray="8,8" />
                      <text x="10" y={chartData.lineNFPA - 8} fill="#ef4444" fontSize="12" fontWeight="bold">Límite 65%</text>

                      {/* Curva Matemática */}
                      <path d={chartData.path} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />

                      {/* Puntos */}
                      <circle cx={chartData.p0.x} cy={chartData.p0.y} r="6" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
                      <circle cx={chartData.p100.x} cy={chartData.p100.y} r="6" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
                      
                      {/* Proyección 150% */}
                      <circle cx={chartData.p150.x} cy={chartData.p150.y} r="8" fill={mathData.isPassing ? "#22c55e" : "#ef4444"} stroke="#0f172a" strokeWidth="2" />
                      <text x={chartData.p150.x - 30} y={chartData.p150.y - 15} fill={mathData.isPassing ? "#4ade80" : "#f87171"} fontSize="14" fontWeight="bold">
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