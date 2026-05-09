import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import { 
  Camera, MapPin, Save, RefreshCcw, 
  ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle, 
  X, Check, ClipboardList, Scissors, MessageSquare, PlusCircle, Trash2,
  AlertOctagon, ShieldAlert, Zap, Info, Droplets, Bell, Activity, Waves, 
  Box, ToggleRight, CloudRain, Clipboard, ArrowLeft
} from 'lucide-react';
import { db } from '../db'; 

// --- CATÁLOGO ORGANIZADO POR NORMAS Y CATEGORÍAS (ARQUITECTURA DE INGENIERÍA) ---
const IPM_CATALOG = [
  { 
    id: 'IPM-01', 
    standard: 'NFPA 25',
    category: 'BOMBAS',
    icon: <Activity size={20} />,
    name: 'SERVICIO MENSUAL A BOMBA DIESEL', 
    formCode: 'F-SER-014',
    multiUnit: false,
    sections: [
      { title: "INSPECCIÓN Y MANTENIMIENTO", points: ["Ejercitar válvulas normalmente abiertas del cuarto de bombas (Cerrar 1/4 de vuelta al final)","Ejercitar y verificar indicador de nivel del tanque de agua (Libre movimiento)","Tanque de agua libre de materiales extraños o desechos en superficie","Operar manualmente válvula de llenado automático del tanque de agua","Ejercitar y verificar indicador de nivel del tanque de combustible (Libre movimiento)","Probar el interruptor aislador del controlador jockey","Activar protección térmica del controlador jockey utilizando el medio de prueba","Ejercitar interruptores de suministro AC del controlador diesel","Ejercitar interruptores de baterías del controlador diesel","Inspeccionar componentes internos del controlador diesel (Sin daño físico)","Rellenar con agua destilada celdas de baterías con bajo electrolito","Retirar corrosión de la batería y limpiar carcasa","Limpieza de filtros de la línea de suministro de agua del intercambiador","Realizar limpieza general del cuarto de bombas"] },
      { title: "PRUEBAS", points: ["Protecciones térmicas, disyuntores y fusibles operaron correctamente","Verificar que el cargador está trabajando correctamente","Verificar que las baterías no sufren de temperatura excesiva"] }
    ]
  },
  { 
    id: 'IPM-08', 
    standard: 'NFPA 25',
    category: 'BOMBAS',
    icon: <Activity size={20} />,
    name: 'SERVICIO SEMANAL A BOMBA DIESEL', 
    formCode: 'F-SER-015', 
    multiUnit: false, 
    sections: [
      { title: "INSPECCIÓN Y MANTENIMIENTO (GENERAL)", points: ["Equipos de bombeo operativos", "Medios de circulación de agua para pruebas", "Ventilación adecuada en cuarto de bombas", "Drenar materiales y agua de tanque combustible", "Equipo, tuberías y mangueras sin daños", "Controlador jockey en AUTOMÁTICO", "Controlador principal en AUTOMÁTICO", "Válvulas supervisadas", "Sin alarmas activas", "Válvulas identificadas y accesibles", "Almacenamiento de agua sin daños", "Medidor de nivel operativo", "Área libre de inflamables", "Baterías y precalentador OK"] },
      { title: "VERIFICACIÓN DE VÁLVULAS ABIERTAS", points: ["Succión bomba incendio", "Descarga bomba incendio", "Succión bomba jockey", "Descarga bomba jockey", "Suministro combustible", "Enfriamiento motor", "Posición correcta válvulas restantes"] },
      { title: "MEDICIONES Y PRUEBAS", points: ["Arranque AUTOMÁTICO (30 seg caída presión)", "Arranque MANUAL (Cranks 1 y 2)", "Protección sobrevelocidad (67%)", "Válvula solenoide enfriamiento", "Goteo prensaestopas (1 gota/seg)", "Marcha modo prueba 30 min", "Lecturas presión y temperatura en operación"] }
    ] 
  },
  { 
    id: 'IPM-02', 
    standard: 'NFPA 25',
    category: 'MANGUERAS',
    icon: <Box size={20} />,
    name: 'SERVICIO A SISTEMA DE GABINETES Y RACKS DE MANGUERAS', 
    formCode: 'F-SER-016', 
    multiUnit: false,
    sections: [
      { title: "INSPECCIÓN", points: ["Estado de gabinete ó rack y bolsa de manguera", "Revisión de etiqueta de mantenimiento", "Inspección del estado de la manguera","Verificar buen estado del chiflón","Revision de válvula","Soportería en buen estado","Manguera colocada correctamente"] },
      { title: "MANTENIMIENTO", points: ["Servicio de limpieza a gabinete ó rack y bolsa de manguera","Recorrido de dobleces de manguera"] }
    ] 
  },
  { 
    id: 'IPM-04', 
    standard: 'NFPA 25',
    category: 'HIDRANTES',
    icon: <Waves size={20} />,
    name: 'SERVICIO A HIDRANTES', 
    formCode: 'F-SER-039', 
    multiUnit: true, 
    sections: [
      { title: "SECCIÓN 1: INSPECCIONES", points: ["El hidrante tiene libre acceso y suficiente espacio para colocar mangueras","Las tapas giran libremente","Verificar que el barril del hidrante este libre de agua o hielo","Estado físico del hidrante","Desgaste de roscas en conectores de descarga y tapas","Estado físico de tuerca de la válvula","Empaques y empaquetaduras en buen estado","Disponibilidad de la llave del hidrante"] },
      { title: "SECCIÓN 2: PRUEBA Y MANTENIMIENTO", points: ["Inspeccionar el equipo de bombeo contra incendios y confirmar condiciones adecuadas","Asegurar que la prueba se pueda llevar a cabo de manera segura","Lubricar vástago de la válvula, tapa, conexiones y roscas del hidrante","Abrir válvula al 100% y dejar fluir agua 1 min hasta que salga clara","Cerrar 100% la válvula lentamente para evitar golpe de ariete","Comprobar que el drenaje del barril funciona (Máximo 60 minutos)"] }
    ]
  },
  { 
    id: 'IPM-05', 
    standard: 'NFPA 25',
    category: 'VÁLVULAS',
    icon: <ToggleRight size={20} />,
    name: 'SERVICIO A VÁLVULAS DE CONTROL', 
    formCode: 'F-SER-041', 
    multiUnit: true, 
    sections: [
      { title: "SECCIÓN 1: INSPECCIÓN", points: ["La válvula se encuentra operativa y libre de daño físico visible","La válvula está accesible y libre de obstrucciones","La válvula cuenta con placa de identificación del sistema que controla"] }
    ]
  },
  { 
    id: 'IPM-06', 
    standard: 'NFPA 25',
    category: 'ROCIADORES',
    icon: <CloudRain size={20} />,
    name: 'SERVICIO A SISTEMAS DE ROCIADORES', 
    formCode: 'F-SER-021', 
    multiUnit: true, 
    sections: [
      { title: "INSPECCIONES", points: ["1. Condición del Sistema (Verificar operativo)","2. Presión de Suministro del riser (Anotar valor PSI)","4. Válvula de Alarma (Fugas y daño físico)","7. Placa de Identificación del Riser (Datos presentes)"] }
    ]
  },
  { 
    id: 'IPM-07', 
    standard: 'NFPA 25',
    category: 'OBSERVACIONES',
    icon: <Clipboard size={20} />,
    name: 'REPORTES DE OBSERVACIONES TÉCNICAS', 
    formCode: 'F-SER-045', 
    isObservations: true, 
    multiUnit: false,
    sections: [] 
  },
  { 
    id: 'IPM-03', 
    standard: 'NFPA 72',
    category: 'ALARMAS',
    icon: <Bell size={20} />,
    name: 'SERVICIO A SISTEMAS DE ALARMAS', 
    formCode: 'F-SER-019', 
    multiUnit: false,
    sections: [
      { title: "SECCIÓN 1: INSPECCIONES", points: ["Tablero de control en buen estado y operativo","Dispositivos de activación manual operativos","Detectores de incendio operativos"] }
    ]
  },
];

export default function NewInspection() {
  const [step, setStep] = useState(1); // 1: Elegir Norma, 2: Elegir Servicio, 3: Formulario
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedIPM, setSelectedIPM] = useState(null);
  
  // Estados de datos (Funcionalidad intacta)
  const [responses, setResponses] = useState({});
  const [pointNotes, setPointNotes] = useState({});
  const [units, setUnits] = useState(['Unidad 1']); 
  const [voltages, setVoltages] = useState(Array.from({ length: 6 }, () => ({ min: '', max: '' })));
  const [observations, setObservations] = useState('');
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [obsCards, setObsCards] = useState([{ area: '', sistema: '', equipo: '', estado: 'ACTIVO', cot: 'NO', observacion: '', impacto: '', accion: '', nfpa: 'DNC', formato: '' }]);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleDeleteUnit = (uIdx) => {
    const unitToDelete = units[uIdx];
    const remainingUnitsRaw = units.filter((_, i) => i !== uIdx);
    let label = 'Unidad';
    if (selectedIPM.id === 'IPM-04') label = 'Hidrante';
    if (selectedIPM.id === 'IPM-05') label = 'Válvula';
    if (selectedIPM.id === 'IPM-06') label = 'Sistema';
    const newUnits = remainingUnitsRaw.map((_, i) => `${label} ${i + 1}`);
    const newResponses = { ...responses };
    const newPointNotes = { ...pointNotes };
    Object.keys(newResponses).forEach(key => { if (key.startsWith(`${unitToDelete}-`)) delete newResponses[key]; });
    Object.keys(newPointNotes).forEach(key => { if (key.startsWith(`${unitToDelete}-`)) delete newPointNotes[key]; });
    setUnits(newUnits);
    setResponses(newResponses);
    setPointNotes(newPointNotes);
  };

  const captureGPS = () => {
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        setLocation({ lat: latitude, lng: longitude, address: data.display_name });
      } catch {
        setLocation({ lat: latitude, lng: longitude, address: `${latitude}, ${longitude}` });
      } finally { setIsCapturingGps(false); }
    }, () => { alert("Error de GPS."); setIsCapturingGps(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const getCroppedImg = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image(); img.src = imageToCrop;
    await new Promise(r => img.onload = r);
    canvas.width = croppedAreaPixels.width; canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
    setPhoto(canvas.toDataURL('image/jpeg'));
    setImageToCrop(null);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const reportId = crypto.randomUUID();
    const reportData = {
      id: reportId,
      date: new Date().toISOString(),
      serviceCode: selectedIPM.id,
      equipmentName: selectedIPM.name,
      norm: selectedIPM.formCode,
      standard: selectedIPM.standard, // Guardamos la norma para filtros
      units,
      sections: selectedIPM.sections, 
      responses,
      pointNotes,
      obsCards: selectedIPM.id === 'IPM-07' ? obsCards : null,
      voltages: selectedIPM.id === 'IPM-01' ? voltages : null,
      overallStatus: selectedIPM.id === 'IPM-07' && obsCards.some(c => c.nfpa === 'D') ? 'CRÍTICO' : 'ÓPTIMO',
      technician: "Isai Moo",
      observations,
      photo,
      location,
      synced: 0 
    };

    try { 
      await db.inspections.add(reportData); 
      alert("✅ REPORTE GUARDADO LOCALMENTE"); 
      setStep(1); 
      setSelectedStandard(null);
      setSelectedIPM(null);
      setResponses({});
      setPointNotes({});
      setObservations('');
      setPhoto(null);
      setLocation(null);
    } catch (e) { alert("Error: " + e.message); } finally { setIsSaving(false); }
  };

  // --- VISTA 1: SELECTOR DE NORMA (DIBUJO IZQUIERDA) ---
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
        <div className="text-center py-6">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">TLETL PCI</h2>
          <div className="w-20 h-1.5 bg-red-600 mx-auto mt-2 rounded-full"></div>
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">Normas Técnicas</p>
        </div>
        
        <div className="grid gap-4">
          {[
            { id: 'NFPA 25', name: 'Sistemas Basados en Agua', icon: <Droplets size={32}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'NFPA 72', name: 'Alarmas y Detección', icon: <Bell size={32}/>, color: 'text-red-600', bg: 'bg-red-50' }
          ].map(std => (
            <button key={std.id} onClick={() => { setSelectedStandard(std.id); setStep(2); }} 
              className="flex items-center justify-between p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-red-600 transition-all group shadow-xl active:scale-95">
              <div className="flex items-center gap-6">
                <div className={`${std.bg} ${std.color} p-5 rounded-3xl group-hover:bg-red-600 group-hover:text-white transition-all`}>
                  {std.icon}
                </div>
                <div className="text-left">
                  <h3 className="font-black text-2xl text-slate-700 tracking-tight">{std.id}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">{std.name}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-2 transition-transform" size={28} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA 2: SELECTOR DE SERVICIO POR CATEGORÍA (DIBUJO DERECHA) ---
  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard === selectedStandard);
    // Agrupar por categoría
    const categories = [...new Set(services.map(s => s.category))];

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in slide-in-from-right duration-300">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600">
          <ArrowLeft size={14}/> Volver a Normas
        </button>

        <h2 className="text-2xl font-black text-slate-800 border-l-8 border-red-600 pl-4 uppercase tracking-tighter">
          Servicios {selectedStandard}
        </h2>

        {categories.map(cat => (
          <div key={cat} className="space-y-3">
            <h4 className="text-[10px] font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-full inline-block tracking-widest">
              {cat}
            </h4>
            <div className="grid gap-2">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { 
                  setSelectedIPM(item); 
                  setUnits(item.multiUnit ? [`${cat.slice(0,-1)} 1`] : ['Servicio Único']);
                  setStep(3); 
                }} className="flex items-center justify-between p-5 bg-white border-2 border-slate-50 rounded-3xl hover:border-red-600 transition-all group shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-slate-300 group-hover:text-red-600 transition-colors">
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.id}</span>
                      <h3 className="font-bold text-slate-700 uppercase text-xs leading-tight">{item.name}</h3>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- VISTA 3: EL FORMULARIO (ESTRUCTURA ORIGINAL FUNCIONAL) ---
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 animate-in fade-in">
      <div className={`${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden`}>
        <button onClick={() => setStep(2)} className="text-[10px] font-black uppercase mb-4 block hover:underline">← Volver al Menú</button>
        <div className="flex items-center gap-3">
          {selectedIPM.isObservations ? <AlertOctagon size={24} className="text-orange-400" /> : <ShieldAlert size={24} />}
          <div>
            <span className="text-[10px] font-black opacity-60 uppercase">{selectedIPM.standard} | {selectedIPM.category}</span>
            <h2 className="text-2xl font-black uppercase tracking-tighter mt-1">{selectedIPM.name}</h2>
          </div>
        </div>
      </div>

      {selectedIPM.isObservations ? (
        <div className="space-y-6">
          <div className="bg-orange-50 p-4 rounded-[1.5rem] border-2 border-orange-200 border-dashed flex items-center gap-3">
            <Info className="text-orange-500" />
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Protocolo de Hallazgos Críticos NFPA-25</p>
          </div>
          {obsCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-xl">
              <div className={`p-4 flex justify-between items-center ${card.nfpa === 'D' ? 'bg-red-600' : card.nfpa === 'DC' ? 'bg-orange-500' : 'bg-yellow-400'} text-white`}>
                <span className="font-black text-xs uppercase tracking-widest">OBSERVACIÓN TÉCNICA #{idx + 1}</span>
                <button onClick={() => setObsCards(obsCards.filter((_, i) => i !== idx))}><Trash2 size={18}/></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.area} onChange={e => { const n = [...obsCards]; n[idx].area = e.target.value; setObsCards(n); }} /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistema</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.sistema} onChange={e => { const n = [...obsCards]; n[idx].sistema = e.target.value; setObsCards(n); }} /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipo</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.equipo} onChange={e => { const n = [...obsCards]; n[idx].equipo = e.target.value; setObsCards(n); }} /></div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Estado</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.estado} onChange={e => { const n = [...obsCards]; n[idx].estado = e.target.value; setObsCards(n); }}><option value="ACTIVO">ACTIVO</option><option value="CERRADO">CERRADO</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Cotizar</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.cot} onChange={e => { const n = [...obsCards]; n[idx].cot = e.target.value; setObsCards(n); }}><option value="SI">SI</option><option value="NO">NO</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Gravedad</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.nfpa} onChange={e => { const n = [...obsCards]; n[idx].nfpa = e.target.value; setObsCards(n); }}><option value="DNC">DNC (Baja)</option><option value="DC">DC (Media)</option><option value="D">D (Crítica)</option></select></div>
                  </div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Ref. Formato</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.formato} placeholder="Ej: F-SER-014" onChange={e => { const n = [...obsCards]; n[idx].formato = e.target.value; setObsCards(n); }} /></div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observación Técnica</label>
                  <textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" value={card.observacion} onChange={e => { const n = [...obsCards]; n[idx].observacion = e.target.value; setObsCards(n); }} />
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setObsCards([...obsCards, { area: '', sistema: '', equipo: '', estado: 'ACTIVO', cot: 'NO', observacion: '', impacto: '', accion: '', nfpa: 'DNC', formato: '' }])} className="w-full py-6 border-4 border-slate-200 border-dotted rounded-[2.5rem] text-slate-400 font-black uppercase flex items-center justify-center gap-3 hover:bg-slate-100 transition-all"><Zap /> AGREGAR HALLAZGO CRÍTICO</button>
        </div>
      ) : (
        <>
          {selectedIPM.multiUnit && (
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={16}/> UNIDADES: {units.length}</h3>
              <button onClick={() => { setUnits([...units, `${selectedIPM.category.slice(0,-1)} ${units.length + 1}`]); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><PlusCircle size={14}/> AGREGAR</button>
            </div>
          )}

          {units.map((unitName, uIdx) => (
            <div key={uIdx} className={`space-y-4 ${selectedIPM.multiUnit ? 'border-l-4 border-blue-500 pl-4 py-2 mb-6' : ''}`}>
              {selectedIPM.multiUnit && (
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-blue-600 uppercase text-[10px] tracking-widest">{unitName}</h4>
                  {units.length > 1 && <button onClick={() => handleDeleteUnit(uIdx)} className="text-red-400"><Trash2 size={16}/></button>}
                </div>
              )}
              {selectedIPM.sections.map((section, sIdx) => (
                <div key={sIdx} className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">{section.title}</p>
                  {section.points.map((point, pIdx) => {
                    const rKey = selectedIPM.multiUnit ? `${unitName}-${section.title}-${pIdx}` : `${section.title}-${pIdx}`;
                    return (
                      <div key={pIdx} className="border-b border-slate-50 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <span className="text-xs font-bold text-slate-700">{point}</span>
                          <div className="flex gap-2">
                            {['bien', 'na', 'falla'].map(s => (
                              <button key={s} onClick={() => setResponses({...responses, [rKey]: s})} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${responses[rKey] === s ? (s === 'falla' ? 'bg-red-500 text-white' : s === 'na' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white') + ' scale-110 shadow-lg' : 'text-slate-400 bg-slate-50'}`}>{s === 'bien' ? 'OK' : s === 'na' ? 'N/A' : 'X'}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border"><MessageSquare size={14} className="text-slate-300" /><input className="w-full bg-transparent text-[10px] font-bold outline-none" placeholder="Nota técnica..." value={pointNotes[rKey] || ''} onChange={e => setPointNotes({...pointNotes, [rKey]: e.target.value})} /></div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {selectedIPM.id === 'IPM-01' && (
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-6">
          <h3 className="text-xs font-black text-red-600 uppercase flex items-center gap-2 tracking-widest"><RefreshCcw size={16}/> REGISTRO DE VOLTAJES</h3>
          {voltages.map((v, i) => (
            <div key={i} className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-center text-xs font-bold text-slate-400">#{i+1}</div>
              <input type="number" step="0.1" className="p-3 bg-slate-50 rounded-xl text-center font-bold text-xs border-2 border-transparent focus:border-red-500 outline-none" placeholder="Min" value={v.min} onChange={e => { const n = [...voltages]; n[i].min = e.target.value; setVoltages(n); }} />
              <input type="number" step="0.1" className="p-3 bg-slate-50 rounded-xl text-center font-bold text-xs border-2 border-transparent focus:border-red-500 outline-none" placeholder="Max" value={v.max} onChange={e => { const n = [...voltages]; n[i].max = e.target.value; setVoltages(n); }} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest"><FileText size={16}/> OBSERVACIONES GENERALES</label>
        <textarea className="w-full h-32 p-4 bg-slate-50 border-2 rounded-3xl font-bold text-sm outline-none focus:border-red-500 resize-none" placeholder="Diagnóstico final..." value={observations} onChange={e => setObservations(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={captureGPS} className={`p-8 rounded-[2.5rem] border-4 border-dotted flex flex-col items-center gap-2 transition-all ${location ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
          {isCapturingGps ? <RefreshCcw className="animate-spin" /> : <MapPin size={32} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{location ? "DIRECCIÓN OK" : "CAPTURAR GPS"}</span>
        </button>
        <label className="p-8 rounded-[2.5rem] border-4 border-dotted border-slate-100 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer text-slate-400 relative overflow-hidden transition-all">
          {photo && <img src={photo} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Preview" />}
          <Camera size={32} /><span className="text-[10px] font-black uppercase tracking-widest">{photo ? "FOTO LISTA" : "TOMAR EVIDENCIA"}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const reader = new FileReader(); reader.onload = () => setImageToCrop(reader.result); reader.readAsDataURL(e.target.files[0]); }} />
        </label>
      </div>

      <button onClick={handleSave} disabled={isSaving} className={`w-full py-8 ${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} text-white rounded-[3.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? <RefreshCcw className="animate-spin" /> : <Save />}
        {isSaving ? "GUARDANDO..." : `FINALIZAR REPORTE ${selectedIPM.id}`}
      </button>

      {imageToCrop && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col p-4">
          <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={4/3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <button onClick={getCroppedImg} className="mt-4 p-6 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Scissors /> RECORTAR EVIDENCIA</button>
        </div>
      )}
    </div>
  );
}