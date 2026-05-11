import React, { useState, useCallback, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import SignatureCanvas from 'react-signature-canvas'; 
import toast from 'react-hot-toast'; 
import { showConfirmDelete } from '../alerts'; 
import { supabase } from '../supabaseClient'; 
import { 
  Camera, MapPin, Save, RefreshCcw, 
  ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle, 
  X, Check, ClipboardList, Scissors, MessageSquare, PlusCircle, Trash2,
  AlertOctagon, ShieldAlert, Zap, Info, Droplets, Bell, Activity, Waves, 
  Box, ToggleRight, CloudRain, Clipboard, ArrowLeft, Home, User
} from 'lucide-react';
import { db } from '../db'; 

// --- CATÁLOGO EVOLUCIONADO: SEPARACIÓN I-P-M Y TIPOS DE BOMBA ---
const IPM_CATALOG = [
  { 
    id: 'IPM-01-D', 
    standard: 'NFPA 25',
    category: 'BOMBAS',
    type: 'DIESEL',
    icon: <Activity size={20} />,
    name: 'BOMBA INCENDIO DIESEL (I-P-M)', 
    formCode: 'F-SER-014',
    multiUnit: false,
    sections: [
      { type: 'I', title: "INSPECCIÓN VISUAL (I)", points: ["Válvulas normalmente abiertas del cuarto de bombas", "Indicador de nivel del tanque de agua", "Indicador de nivel del tanque de combustible", "Celdas de baterías (Nivel electrolito)", "Filtros de línea de suministro de agua", "Limpieza general del cuarto de bombas"] },
      { type: 'P', title: "PRUEBAS DE RENDIMIENTO (P)", points: ["Arranque automático por caída de presión", "Operación manual del controlador", "Prueba de protección térmica del controlador jockey", "Verificación de cargador de baterías", "Temperatura de baterías en carga"] },
      { type: 'M', title: "MANTENIMIENTO TÉCNICO (M)", points: ["Engrase de rodamientos de la bomba", "Ajuste de prensaestopas", "Limpieza de bornes de batería", "Drenado de sedimentos en tanque diesel"] }
    ]
  },
  { 
    id: 'IPM-01-E', 
    standard: 'NFPA 25',
    category: 'BOMBAS',
    type: 'ELÉCTRICA',
    icon: <Zap size={20} />,
    name: 'BOMBA INCENDIO ELÉCTRICA (I-P-M)', 
    formCode: 'F-SER-015',
    multiUnit: false,
    sections: [
      { type: 'I', title: "INSPECCIÓN VISUAL (I)", points: ["Controlador en modo AUTOMÁTICO", "Válvulas de succión y descarga abiertas", "Luces piloto de estatus OK"] },
      { type: 'P', title: "PRUEBAS DE RENDIMIENTO (P)", points: ["Arranque manual y automático", "Presión estática vs Presión dinámica", "Verificación de amperaje en fases L1, L2, L3"] },
      { type: 'M', title: "MANTENIMIENTO (M)", points: ["Limpieza interna de gabinete de control", "Apriete de terminales eléctricas", "Lubricación de motor eléctrico"] }
    ]
  },
  { 
    id: 'IPM-04', 
    standard: 'NFPA 25',
    category: 'HIDRANTES',
    icon: <Waves size={20} />,
    name: 'SERVICIO A HIDRANTES (I-P-M)', 
    formCode: 'F-SER-039', 
    multiUnit: true, 
    sections: [
      { type: 'I', title: "INSPECCIONES (I)", points: ["Libre acceso y espacio mangueras", "Tapas giran libremente", "Estado físico de tuerca y vástago"] },
      { type: 'P', title: "PRUEBA OPERATIVA (P)", points: ["Apertura al 100% flujo claro", "Cierre lento (Evitar golpe ariete)", "Verificación de drenaje de barril"] },
      { type: 'M', title: "MANTENIMIENTO (M)", points: ["Lubricación de vástago y conexiones", "Cambio de empaques si aplica"] }
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
];

export default function NewInspection({ navigateTo }) { 
  const [step, setStep] = useState(1);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedIPM, setSelectedIPM] = useState(null);
  
  // --- ESTADOS DE DATOS ---
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
  
  // --- NUEVOS ESTADOS DE SAAS, FIRMA Y EMPRESAS ---
  const [selectedClient, setSelectedClient] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const sigPad = useRef({}); 

  const [clientsDb, setClientsDb] = useState([]); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isAddingClient, setIsAddingClient] = useState(false); 
  const [newClientName, setNewClientName] = useState('');

  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    fetchClients();
    checkRole();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (!error && data) setClientsDb(data);
  };

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (data?.role === 'ADMIN') setIsAdmin(true);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    const loadingToast = toast.loading("Registrando empresa en la nube...");
    
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nombre: newClientName.trim().toUpperCase() }])
      .select();

    if (error) {
      toast.error("Error: " + error.message, { id: loadingToast });
    } else {
      toast.success(`Empresa ${data[0].nombre} registrada.`, { id: loadingToast });
      setClientsDb([...clientsDb, data[0]].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setSelectedClient(data[0].id);
      setIsAddingClient(false);
      setNewClientName('');
    }
  };

  // --- NUEVA FUNCIÓN PARA BORRAR EMPRESAS ---
  const handleDeleteClient = (clientId) => {
    const clientName = clientsDb.find(c => c.id === clientId)?.nombre || 'ESTA EMPRESA';
    
    showConfirmDelete(`LA EMPRESA ${clientName}`, async () => {
      const deleteToast = toast.loading("Eliminando de la base de datos...");
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', clientId);
        if (error) throw error;
        
        toast.success(`${clientName} eliminada con éxito.`, { id: deleteToast });
        setClientsDb(prev => prev.filter(c => c.id !== clientId));
        if (selectedClient === clientId) setSelectedClient('');
      } catch (err) {
        toast.error("Error al eliminar: " + err.message, { id: deleteToast });
      }
    });
  };

  const handleDeleteUnit = (uIdx) => {
    const unitToDelete = units[uIdx];
    const remainingUnitsRaw = units.filter((_, i) => i !== uIdx);
    const label = selectedIPM.category.slice(0,-1);
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
    }, () => { 
      toast.error("Error al obtener GPS. Verifica los permisos."); 
      setIsCapturingGps(false); 
    }, { enableHighAccuracy: true, timeout: 10000 });
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
    if (!selectedClient) { toast.error("Debe seleccionar un CLIENTE."); return; }
    if (!ownerName) { toast.error("El NOMBRE del propietario es obligatorio."); return; }
    if (sigPad.current.isEmpty()) { toast.error("El reporte debe estar FIRMADO por el responsable."); return; }

    if (isSaving) return;
    setIsSaving(true);
    
    const savingToast = toast.loading("Legalizando reporte...");

    const reportId = crypto.randomUUID();
    const reportData = {
      id: reportId,
      clientId: selectedClient, 
      ownerName: ownerName,    
      signature: sigPad.current.getTrimmedCanvas().toDataURL('image/png'), 
      date: new Date().toISOString(),
      serviceCode: selectedIPM.id,
      equipmentName: selectedIPM.name,
      norm: selectedIPM.formCode,
      standard: selectedIPM.standard,
      units,
      sections: selectedIPM.sections, 
      responses,
      pointNotes,
      obsCards: selectedIPM.id === 'IPM-07' ? obsCards : null,
      voltages: selectedIPM.id === 'IPM-01-D' ? voltages : null,
      overallStatus: selectedIPM.id === 'IPM-07' && obsCards.some(c => c.nfpa === 'D') ? 'CRÍTICO' : 'ÓPTIMO',
      technician: "Isai Moo",
      observations,
      photo,
      location,
      synced: 0 
    };

    try { 
      await db.inspections.add(reportData); 
      toast.success("REPORTE LEGALIZADO Y GUARDADO", { id: savingToast }); 
      navigateTo('home'); 
    } catch (e) { 
      toast.error("Error: " + e.message, { id: savingToast }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600 group transition-all"><Home size={14}/> Salir al Panel</button>
        <div className="text-center py-6">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">TLETL PCI</h2>
          <div className="w-20 h-1.5 bg-red-600 mx-auto mt-2 rounded-full"></div>
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">SaaS de Ingeniería</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <User size={14}/> 1. Seleccionar Cliente
            </label>
            
            {isAdmin && (
              <button 
                onClick={() => setIsAddingClient(!isAddingClient)} 
                className={`text-[9px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${isAddingClient ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white hover:bg-red-600'}`}
              >
                {isAddingClient ? <X size={12}/> : <PlusCircle size={12}/>} 
                {isAddingClient ? 'CANCELAR' : 'NUEVA EMPRESA'}
              </button>
            )}
          </div>

          {isAddingClient ? (
            <div className="flex gap-2 animate-in slide-in-from-top-2">
              <input 
                type="text" 
                placeholder="NOMBRE DE LA EMPRESA..." 
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-red-500 transition-all uppercase"
                autoFocus
              />
              <button 
                onClick={handleAddClient} 
                className="px-6 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/30"
              >
                Guardar
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center animate-in fade-in">
              <select 
                value={selectedClient} 
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-red-500 transition-all"
              >
                <option value="">-- Elige una Empresa --</option>
                {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              
              {/* BOTÓN DE BORRAR EMPRESA (SOLO ADMIN Y SI HAY UNA SELECCIONADA) */}
              {isAdmin && selectedClient && (
                <button 
                  onClick={() => handleDeleteClient(selectedClient)}
                  className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                  title="Eliminar Empresa"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className={`grid gap-4 ${!selectedClient ? 'opacity-30 pointer-events-none' : ''}`}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">2. Elige la Norma Técnica</p>
          {[
            { id: 'NFPA 25', name: 'Sistemas Basados en Agua', icon: <Droplets size={32}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'NFPA 72', name: 'Alarmas y Detección', icon: <Bell size={32}/>, color: 'text-red-600', bg: 'bg-red-50' }
          ].map(std => (
            <button key={std.id} onClick={() => { setSelectedStandard(std.id); setStep(2); }} className="flex items-center justify-between p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-red-600 transition-all group shadow-xl active:scale-95">
              <div className="flex items-center gap-6"><div className={`${std.bg} ${std.color} p-5 rounded-3xl group-hover:bg-red-600 group-hover:text-white transition-all`}>{std.icon}</div>
              <div className="text-left"><h3 className="font-black text-2xl text-slate-700 tracking-tight">{std.id}</h3><p className="text-xs font-bold text-slate-400 uppercase">{std.name}</p></div></div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-2 transition-transform" size={28} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard === selectedStandard);
    const categories = [...new Set(services.map(s => s.category))];
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center px-2">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-red-600"><ArrowLeft size={14}/> Volver</button>
          <button onClick={() => navigateTo('home')} className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase hover:text-red-600 font-bold"><Home size={14}/> Salir</button>
        </div>
        <h2 className="text-2xl font-black text-slate-800 border-l-8 border-red-600 pl-4 uppercase tracking-tighter">Servicios {selectedStandard}</h2>
        {categories.map(cat => (
          <div key={cat} className="space-y-3">
            <h4 className="text-[10px] font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-full inline-block tracking-widest">{cat}</h4>
            <div className="grid gap-2">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { setSelectedIPM(item); setUnits(item.multiUnit ? [`${cat.slice(0,-1)} 1`] : ['Servicio Único']); setStep(3); }} className="flex items-center justify-between p-5 bg-white border-2 border-slate-50 rounded-3xl hover:border-red-600 transition-all group shadow-sm">
                  <div className="flex items-center gap-4"><div className="text-slate-300 group-hover:text-red-600 transition-colors">{item.icon}</div>
                  <div className="text-left"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.id}</span><h3 className="font-bold text-slate-700 uppercase text-xs leading-tight">{item.name}</h3></div></div>
                  <ChevronRight size={18} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 animate-in fade-in">
      <div className="flex justify-between items-center px-2 mb-2">
        <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase hover:underline flex items-center gap-2"><ArrowLeft size={12}/> Volver</button>
        <button onClick={() => navigateTo('home')} className="text-[10px] font-black text-slate-600 uppercase hover:text-red-600 flex items-center gap-2"><Home size={12}/> Salir</button>
      </div>

      <div className={`${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden`}>
        <div className="flex items-center gap-3">
          {selectedIPM.isObservations ? <AlertOctagon size={24} className="text-orange-400" /> : <ShieldAlert size={24} />}
          <div>
            <span className="text-[10px] font-black opacity-60 uppercase">{selectedIPM.standard} | {selectedIPM.category}</span>
            <h2 className="text-2xl font-black uppercase tracking-tighter mt-1">{selectedIPM.name}</h2>
          </div>
        </div>
      </div>

      {!selectedIPM.isObservations && units.map((unitName, uIdx) => (
        <div key={uIdx} className={`space-y-4 ${selectedIPM.multiUnit ? 'border-l-4 border-blue-500 pl-4 py-2 mb-6' : ''}`}>
          {selectedIPM.multiUnit && (
            <div className="flex items-center justify-between">
              <h4 className="font-black text-blue-600 uppercase text-[10px] tracking-widest">{unitName}</h4>
              {units.length > 1 && (
                <button 
                  onClick={() => showConfirmDelete(`LA UNIDAD ${unitName}`, () => handleDeleteUnit(uIdx))} 
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16}/>
                </button>
              )}
            </div>
          )}
          {selectedIPM.sections.map((section, sIdx) => (
            <div key={sIdx} className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-2">
              <div className="flex items-center gap-2 mb-4">
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black text-white ${section.type === 'I' ? 'bg-blue-500' : section.type === 'P' ? 'bg-purple-500' : 'bg-orange-500'}`}>{section.type}</span>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.title}</p>
              </div>
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

      {selectedIPM.isObservations && (
          <div className="space-y-6">
            {obsCards.map((card, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-xl">
                 <div className={`p-4 flex justify-between items-center ${card.nfpa === 'D' ? 'bg-red-600' : card.nfpa === 'DC' ? 'bg-orange-500' : 'bg-yellow-400'} text-white`}>
                  <span className="font-black text-xs uppercase tracking-widest">OBSERVACIÓN TÉCNICA #{idx + 1}</span>
                  <button onClick={() => showConfirmDelete('ESTA OBSERVACIÓN', () => setObsCards(obsCards.filter((_, i) => i !== idx)))}>
                    <Trash2 size={18}/>
                  </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.area} onChange={e => { const n = [...obsCards]; n[idx].area = e.target.value; setObsCards(n); }} /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistema</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.sistema} onChange={e => { const n = [...obsCards]; n[idx].sistema = e.target.value; setObsCards(n); }} /></div>
                  <div className="md:col-span-2"><textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" placeholder="Escribe la observación..." value={card.observacion} onChange={e => { const n = [...obsCards]; n[idx].observacion = e.target.value; setObsCards(n); }} /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setObsCards([...obsCards, { area: '', sistema: '', equipo: '', estado: 'ACTIVO', cot: 'NO', observacion: '', impacto: '', accion: '', nfpa: 'DNC', formato: '' }])} className="w-full py-6 border-4 border-slate-200 border-dotted rounded-[2.5rem] text-slate-400 font-black uppercase flex items-center justify-center gap-3 hover:bg-slate-100 transition-all"><Zap /> AGREGAR HALLAZGO</button>
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

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 border-4 border-red-600 shadow-2xl">
        <div className="flex items-center gap-3">
           <ShieldAlert className="text-red-500" size={28} />
           <h3 className="font-black uppercase text-xl tracking-tighter">Validación Documental</h3>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nombre de quien recibe (Propietario)</label>
          <input 
            type="text"
            className="w-full bg-white/5 border-b-2 border-white/20 p-4 font-bold outline-none focus:border-red-500 transition-all text-white placeholder:text-white/20 mt-2"
            placeholder="Escriba nombre completo..."
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Firma Digital del Responsable</label>
          <div className="bg-white rounded-3xl overflow-hidden shadow-inner h-48 border-4 border-slate-800">
            <SignatureCanvas 
              ref={sigPad}
              penColor='black'
              canvasProps={{className: 'signature-canvas w-full h-full cursor-crosshair'}} 
            />
          </div>
          <button 
            onClick={() => sigPad.current.clear()}
            className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 mx-auto py-2"
          >
            <RefreshCcw size={12} /> Limpiar Firma
          </button>
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving} className={`w-full py-8 ${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} text-white rounded-[3.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        <div className="flex items-center gap-4">
          {isSaving ? <RefreshCcw className="animate-spin" /> : <Save />}
          {isSaving ? "PROCESANDO..." : "FINALIZAR Y LEGALIZAR REPORTE"}
        </div>
        {!isSaving && <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Se generará evidencia para {ownerName || 'el cliente'}</span>}
      </button>

      {imageToCrop && (
        <div className="fixed inset-0 z-[7000] bg-slate-900/90 backdrop-blur-md flex flex-col p-4">
          <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={4/3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <button onClick={getCroppedImg} className="mt-4 p-6 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Scissors /> RECORTAR</button>
        </div>
      )}
    </div>
  );
}