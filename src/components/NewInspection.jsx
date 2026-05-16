import React, { useState, useCallback, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import {
  Camera, MapPin, Save, RefreshCcw, ChevronRight, Scissors,
  MessageSquare, Droplets, Bell, Activity, Waves,
  Clipboard, ArrowLeft, User, Image as ImageIcon, Settings, FileText
} from 'lucide-react';
import { db } from '../db';

const Icon = ({ name: Component, ...props }) => {
  return Component && typeof Component === 'function' ? <Component {...props} /> : null;
};

const IPM_CATALOG = [
  { id: 'IPM-01-D', standard: 'NFPA 25', category: 'BOMBAS', name: 'BOMBA INCENDIO DIESEL (MENSUAL)', formCode: 'F-SER-014', icon: Activity, color: '#ef4444', hasVoltages: true, sections: [{ title: "INSPECCIÓN Y MANTENIMIENTO", points: ["Ejercitar cerrando y abriendo las válvulas normalmente abiertas del cuarto de bombas", "Ejercitar el indicador de nivel del tanque de almacenamiento de agua", "El tanque de almacenamiento de agua no cuenta con materiales extraños o deshechos", "Operar manualmente la válvula de llenado automático del tanque de almacenamiento de agua", "Ejercitar el indicador de nivel del tanque de combustible", "Probar el interruptor aislador del controlador jockey", "Activar la protección térmica del controlador jockey", "Ejercitar los interruptores del suministro de AC del controlador diesel", "Ejercitar los interruptores del suministro de baterías del controlador diesel", "Inspeccionar los componentes internos del controlador diesel", "Rellenar con agua destilada las celdas de las baterías con bajo nivel de electrolito", "Retirar corrosión de la batería y limpiar su carcasa", "Inspeccionar y realizar servicio de limpieza de filtros de la línea de suministro de agua", "Realizar limpieza general del cuarto de bombas en caso necesario"] }, { title: "PRUEBAS", points: ["Durante las pruebas las protecciones térmicas, disyuntores y fusibles operaron correctamente", "Realizar 6 arranques manuales alternando baterías 1 y 2", "Verificar que el cargador está trabajando correctamente", "Verificar que las baterías no sufren de temperatura excesiva"] }] },
  { id: 'IPM-08', standard: 'NFPA 25', category: 'BOMBAS', name: 'BOMBA INCENDIO DIESEL (SEMANAL)', formCode: 'F-SER-015', icon: Activity, color: '#ef4444', sections: [{ title: "INSPECCIÓN Y MANTENIMIENTO SEMANAL", points: ["Inspección visual de equipos operativos", "Verificar estado de bombas, tuberías y mangueras", "Revisar controlador de bomba contra incendio", "Verificar indicador de nivel de combustible", "Inspeccionar terminales de baterías", "Verificar precalentador de motor", "Revisar nivel de aceite del motor", "Verificar nivel de agua del radiador", "Inspeccionar correas y mangueras", "Verificar ausencia de fugas"] }] },
  { id: 'IPM-02', standard: 'NFPA 25', category: 'MANGUERAS', name: 'GABINETES Y RACKS DE MANGUERAS', formCode: 'F-SER-016', icon: Waves, color: '#3b82f6', sections: [{ title: "INSPECCIONES", points: ["Estado del gabinete o rack", "Revisión de etiqueta de mantenimiento", "Inspección del estado de la manguera", "Verificar buen estado del chiflón", "Revisión de válvula", "Soportería en buen estado", "Manguera colocada correctamente"] }, { title: "MANTENIMIENTO", points: ["Servicio de limpieza a gabinete y rack de manguera", "Recorrido de dobleces de manguera"] }] },
  { id: 'IPM-03', standard: 'NFPA 72', category: 'ALARMAS', name: 'SISTEMA DE ALARMA DE INCENDIO', formCode: 'F-SER-019', icon: Bell, color: '#f97316', sections: [{ title: "INSPECCIONES", points: ["Tablero de control en buen estado y operativo", "Dispositivos manuales operativos", "Detectores de incendio en buen estado", "Fuentes de poder auxiliares operativas", "Baterías de respaldo en buen estado"] }, { title: "PRUEBAS", points: ["Prueba de luces del tablero", "Prueba de estaciones manuales", "Prueba de detectores de humo", "Prueba de notificación sonora y visual", "Verificar dispositivos de monitoreo"] }] },
  { id: 'IPM-04', standard: 'NFPA 25', category: 'HIDRANTES', name: 'SERVICIO A HIDRANTES', formCode: 'F-SER-039', icon: MapPin, color: '#06b6d4', sections: [{ title: "INSPECCIONES", points: ["El hidrante tiene libre acceso", "Las tapas giran libremente", "Verificar que el barril del hidrante esté libre de agua o hielo", "Estado físico del hidrante", "Desgaste de roscas en conectores de descarga y tapas", "Estado físico de la válvula", "Empaques y empaquetaduras en buen estado", "Disponibilidad de la llave del hidrante"] }] },
  { id: 'IPM-05', standard: 'NFPA 25', category: 'VÁLVULAS', name: 'VÁLVULAS DE CONTROL', formCode: 'F-SER-041', icon: Settings, color: '#8b5cf6', sections: [{ title: "INSPECCIÓN", points: ["La válvula se encuentra operativa y libre de daño visible", "La válvula es accesible y libre de obstrucciones", "La válvula está equipada con la correspondiente llave para su manipulación", "La válvula cuenta con candado y/o se encuentra supervisada", "Verificar el estado correcto de la válvula (abierta o cerrada)"] }, { title: "PRUEBA", points: ["Ejercitar cerrando y abriendo 3 vueltas las válvulas normalmente abiertas"] }] },
  { id: 'IPM-06', standard: 'NFPA 25', category: 'ROCIADORES', name: 'SISTEMA DE ROCIADORES', formCode: 'F-SER-IPM06', icon: Droplets, color: '#10b981', sections: [{ title: "INSPECCIONES", points: ["Verificar que el sistema se encuentre operativo", "Anotar la presión de suministro del riser", "Anotar presión de agua o aire en el sistema", "Verificar fugas y daño físico en válvula de alarma o acción previa", "Verificar que las válvulas estén accesibles and en estado correcto", "Verificar placa de identificación del riser", "Verificar conexión con bomberos", "Verificar que las válvulas estén enclavadas o supervisadas", "Verificar que se cuenta con rociadores de repuesto"] }] },
  { id: 'IPM-07', standard: 'NFPA 25/72', category: 'OBSERVACIONES', name: 'REPORTE DE OBSERVACIONES TÉCNICAS', formCode: 'F-SER-045', icon: Clipboard, color: '#0f172a', isObservations: true, sections: [] }
];

export default function NewInspection({ navigateTo, prefillData }) { // <-- CORRECCIÓN: RECIBE PREFILLDATA
  const [step, setStep] = useState(1);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedIPM, setSelectedIPM] = useState(null);
  const [details, setDetails] = useState({});
  const [voltages, setVoltages] = useState(Array.from({ length: 6 }, () => ({ min: '', max: '' })));
  const [generalObs, setGeneralObs] = useState('');
  
  // CORRECCIÓN: Inicializa con la sucursal precargada desde el radar si existe
  const [selectedClient, setSelectedClient] = useState(prefillData?.clientId || '');
  
  const [ownerName, setOwnerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [clientsDb, setClientsDb] = useState([]);
  const [location, setLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [technicianName, setTechnicianName] = useState('Detectando técnico...');

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [imageToCrop, setImageToCrop] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre');
      if (data) setClientsDb(data);
    };

    const loadUserAndLocation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const displayName = user.user_metadata?.full_name || user.email || 'Inspector TLETL';
        setTechnicianName(displayName);
      }

      // Si el mapa ya envió las coordenadas de la sucursal, las hereda por defecto para evitar desfases de GPS
      if (prefillData?.location) {
        setLocation(prefillData.location);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }),
          () => {}
        );
      }
    };

    fetchClients();
    loadUserAndLocation();
  }, [prefillData]);

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault(); 
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if(!clientX || !clientY) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureDataURL = () => canvasRef.current.toDataURL('image/png');

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const getCroppedImg = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = imageToCrop;
    await new Promise(r => img.onload = r);
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 1024, 768);
    setDetails(prev => ({ ...prev, [activePoint]: { ...prev[activePoint], photo: canvas.toDataURL('image/jpeg', 0.8) } }));
    setImageToCrop(null);
  };

  const updateGPS = () => {
    if (navigator.geolocation) {
      toast.loading("Obteniendo coordenadas...", { id: "gps" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast.success("GPS Actualizado Correctamente", { id: "gps" });
        },
        () => {
          toast.error("No se pudo acceder al GPS", { id: "gps" });
        }
      );
    }
  };

  const handleSave = async () => {
    if (!selectedClient || !ownerName) {
      toast.error("⚠️ Falta seleccionar cliente o responsable.");
      return;
    }
    if (!hasSignature) {
      toast.error("⚠️ La firma de conformidad es obligatoria.");
      return;
    }

    setIsSaving(true);
    try {
      const signature = getSignatureDataURL();
      const clientObj = clientsDb.find(c => c.id === selectedClient);

      await db.inspections.add({
        id: crypto.randomUUID(),
        clientId: selectedClient,
        clientName: clientObj ? clientObj.nombre : 'NO ESPECIFICADO',
        clientAddress: clientObj ? clientObj.direccion : 'No capturada',
        ownerName,
        equipmentName: selectedIPM.name,
        standard: selectedIPM.standard,   
        category: selectedIPM.category,   
        formCode: selectedIPM.formCode,   
        details,
        voltages,
        generalObs,
        signature,
        location: location,
        performedBy: technicianName,
        date: new Date().toISOString()
      });

      toast.success("REPORTE GUARDADO Y LEGALIZADO LOCALMENTE");
      navigateTo('home');
    } catch (e) {
      toast.error("Error al guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
          <label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2 tracking-widest">
            <User size={14} /> SELECCIÓN DE SUCURSAL
          </label>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-4 mt-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-red-500 outline-none text-slate-700">
            <option value="">-- Elige Empresa --</option>
            {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className={`${!selectedClient ? 'opacity-30 pointer-events-none' : ''} grid gap-4`}>
          {['NFPA 25', 'NFPA 72'].map(std => (
            <button key={std} onClick={() => { setSelectedStandard(std); setStep(2); }} className="flex justify-between items-center p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-red-600 transition-all shadow-xl group">
              <div className="flex items-center gap-6">
                {std === 'NFPA 25' ? <Droplets className="text-blue-500" size={32} /> : <Bell className="text-red-500" size={32} />}
                <h3 className="font-black text-2xl text-slate-700">{std}</h3>
              </div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard.includes(selectedStandard) || item.id === 'IPM-07');
    const categories = [...new Set(services.map(s => s.category))];

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600 tracking-widest">
          <ArrowLeft size={14} /> VOLVER A SUCURSAL
        </button>

        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">{cat}</span>
            <div className="grid gap-3">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { setSelectedIPM(item); setStep(3); }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-red-500 transition-all text-left group">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-red-50 transition-colors">
                      <Icon name={item.icon} size={24} className="text-slate-400 group-hover:text-red-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.id}</p>
                      <h3 className="font-bold text-slate-700 uppercase text-sm leading-tight">{item.name}</h3>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600 tracking-widest">
          <ArrowLeft size={14} /> CATÁLOGO
        </button>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-wider">
          TÉCNICO: {technicianName}
        </div>
      </div>

      <div className={`${selectedIPM.color === '#ef4444' ? 'bg-red-600' : 'bg-slate-900'} p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden`}>
        <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">{selectedIPM.standard} | {selectedIPM.category}</span>
        <h2 className="text-3xl font-black uppercase mt-1 leading-none tracking-tighter">{selectedIPM.name}</h2>
      </div>

      {selectedIPM.sections.map((sec, sIdx) => (
        <div key={sIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3">{sec.title}</p>
          {sec.points.map((p, pIdx) => (
            <div key={pIdx} className="border-b border-slate-50 pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <span className="text-xs font-bold text-slate-700 flex-1 leading-tight">{p}</span>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {[
                    { key: 'bien', label: 'BIEN', color: 'bg-green-600 text-white' },
                    { key: 'advertencia', label: 'ADVERTENCIA', color: 'bg-yellow-500 text-black' },
                    { key: 'critico', label: 'CRÍTICO', color: 'bg-red-600 text-white' },
                  ].map(opt => (
                    <button key={opt.key} type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: opt.key } }))} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${details[p]?.status === opt.key ? `${opt.color} shadow-lg scale-105` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <MessageSquare size={14} className="text-slate-300" />
                  <input className="w-full bg-transparent text-[11px] font-bold outline-none text-slate-700" placeholder="Nota o hallazgo específico..." value={details[p]?.note || ''} onChange={e => setDetails(prev => ({ ...prev, [p]: { ...prev[p], note: e.target.value } }))} />
                </div>
                <label className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 border-dotted cursor-pointer transition-all ${details[p]?.photo ? 'bg-green-50 border-green-500 text-green-600 shadow-md' : 'text-slate-400 border-slate-200 hover:border-red-500'}`}>
                  {details[p]?.photo ? <ImageIcon size={24} /> : <Camera size={24} />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                    const r = new FileReader();
                    r.onload = () => { setImageToCrop(r.result); setActivePoint(p); };
                    r.readAsDataURL(e.target.files[0]);
                  }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      ))}

      {selectedIPM.hasVoltages && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b pb-3">PRUEBA DE 6 ARRANQUES MANUALES</p>
              <div className="grid grid-cols-3 gap-4 font-black text-[9px] text-slate-400 text-center uppercase"><span>Arranque</span><span>V. Mínimo</span><span>V. Máximo</span></div>
              {voltages.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 items-center">
                      <span className="text-center font-bold text-xs">{i+1}º Prueba</span>
                      <input type="number" placeholder="V" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs font-bold outline-none focus:border-red-500" value={v.min} onChange={e => { const n=[...voltages]; n[i].min=e.target.value; setVoltages(n); }} />
                      <input type="number" placeholder="V" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs font-bold outline-none focus:border-red-500" value={v.max} onChange={e => { const n=[...voltages]; n[i].max=e.target.value; setVoltages(n); }} />
                  </div>
              ))}
          </div>
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${location ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}><MapPin size={28} /></div>
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas del Sitio</h4>
            <p className="text-xs font-black text-slate-700 mt-0.5 uppercase tracking-wide">{location ? `Lat: ${location.lat.toFixed(6)} | Lng: ${location.lng.toFixed(6)}` : 'Coordenadas No Vinculadas'}</p>
          </div>
        </div>
        <button type="button" onClick={updateGPS} className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"><RefreshCcw size={14} /> Capturar Ubicación</button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-slate-400" /> Observación Técnica General Final</label>
        <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-red-500 text-slate-700" placeholder="Escribe un informe general..." value={generalObs} onChange={e => setGeneralObs(e.target.value)} />
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 border-4 border-red-600 shadow-2xl">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Validación de Conformidad</label>
          <input className="w-full bg-white/5 border-b-2 border-white/20 p-4 mt-2 font-bold outline-none text-white focus:border-red-500 transition-colors" placeholder="Nombre del Responsable que Recibe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div className="bg-white rounded-3xl p-2 border-2 border-white/10 shadow-inner">
          <canvas ref={canvasRef} width={600} height={200} className="w-full rounded-2xl cursor-crosshair touch-none bg-white" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing} />
        </div>
        <div className="flex justify-between items-center">
          <button type="button" onClick={clearSignature} className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-wider transition-colors">Borrar Firma</button>
          {hasSignature && <span className="text-green-400 text-xs font-black uppercase tracking-wider animate-pulse">✓ Firma Vinculada</span>}
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving} className="w-full py-8 bg-red-600 hover:bg-red-700 text-white rounded-[3.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-98 transition-all">{isSaving ? <RefreshCcw className="animate-spin" /> : <Save />} FINALIZAR REPORTE</button>

      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col p-4">
          <div className="relative flex-1"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={5/4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <button onClick={getCroppedImg} className="mt-4 p-6 bg-red-600 hover:bg-red-700 text-white rounded-full font-black flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-wider"><Scissors /> RECORTAR Y ADJUNTAR EVIDENCIA</button>
        </div>
      )}
    </div>
  );
}