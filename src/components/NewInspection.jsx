import React, { useState, useCallback, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import {
  Camera, MapPin, Save, RefreshCcw, ChevronRight, Scissors,
  MessageSquare, Droplets, Bell, Activity, Waves, Plus,
  Clipboard, ArrowLeft, User, Image as ImageIcon, Settings, FileText, X,
  CheckCircle2, AlertTriangle, AlertOctagon, ShieldAlert, Trash2
} from 'lucide-react';
import { db } from '../db';

const Icon = ({ name: Component, ...props }) => {
  return Component && typeof Component === 'function' ? <Component {...props} /> : null;
};

const IPM_CATALOG = [
  { id: 'IPM-01-D', standard: 'NFPA 25', category: 'BOMBAS', name: 'BOMBA INCENDIO DIESEL (MENSUAL)', formCode: 'F-SER-014', icon: Activity, color: '#ef4444', hasVoltages: true, sections: [{ title: "INSPECCIÓN Y MANTENIMIENTO", points: ["Ejercitar cerrando y abriendo las válvulas normalmente abiertas del cuarto de bombas", "Ejercitar el indicador de nivel del tanque de almacenamiento de agua", "El tanque de almacenamiento de agua no cuenta con materiales extraños o deshechos", "Operar manualmente la válvula de llenado automático del tanque de almacenamiento de agua", "Ejercitar el indicador de nivel del tanque de combustible", "Probar el interruptor aislador del controlador jockey", "Activar la protección térmica del controlador jockey", "Ejercitar los interruptores del suministro de AC del controlador diesel", "Ejercitar los interruptores del suministro de baterías del controlador diesel", "Inspeccionar los componentes internos del controlador diesel", "Rellenar con agua destilada las celdas de las baterías con bajo nivel de electrolito", "Retirar corrosión de la batería y limpiar su carcasa", "Inspeccionar y realizar servicio de limpieza de filtros de la línea de suministro de agua", "Realizar limpieza general del cuarto de bombas en caso necesario"] }, { title: "PRUEBAS", points: ["Durante las pruebas las protecciones térmicas, disyuntores y fusibles operaron correctamente", "Realizar 6 arranques manuales alternando baterías 1 y 2", "Verificar que el cargador está trabajando correctamente", "Verificar que las baterías no sufren de temperatura excesiva"] }] },
  { id: 'IPM-08', standard: 'NFPA 25', category: 'BOMBAS', name: 'BOMBA INCENDIO DIESEL (SEMANAL)', formCode: 'F-SER-015', icon: Activity, color: '#ef4444', sections: [{ title: "INSPECCIÓN Y MANTENIMIENTO SEMANAL", points: ["Inspección visual de equipos operativos", "Verificar estado de bombas, tuberías y mangueras", "Revisar controlador de bomba contra incendio", "Verificar indicador de nivel de combustible", "Inspeccionar terminales de baterías", "Verificar precalentador de motor", "Revisar nivel de aceite del motor", "Verificar nivel de agua del radiador", "Inspeccionar correas y mangueras", "Verificar ausencia de fugas"] }] },
  { id: 'IPM-02', standard: 'NFPA 25', category: 'MANGUERAS', name: 'GABINETES Y RACKS DE MANGUERAS', formCode: 'F-SER-016', icon: Waves, color: '#3b82f6', sections: [{ title: "INSPECCIONES", points: ["Estado del gabinete o rack", "Revisión de etiqueta de mantenimiento", "Inspección del estado de la manguera", "Verificar buen estado del chiflón", "Revisión de válvula", "Soportería en buen estado", "Manguera colocada correctamente"] }, { title: "MANTENIMIENTO", points: ["Servicio de limpieza a gabinete y rack de manguera", "Recorrido de dobleces de manguera"] }] },
  { id: 'IPM-03', standard: 'NFPA 72', category: 'ALARMAS', name: 'SISTEMA DE ALARMA DE INCENDIO', formCode: 'F-SER-019', icon: Bell, color: '#f97316', sections: [
    { title: "INSPECCIONES DEL PANEL", points: ["Tablero de control en buen estado y operativo", "Dispositivos manuales operativos", "Detectores de incendio en buen estado", "Fuentes de poder auxiliares operativas", "Baterías de respaldo en buen estado"] }, 
    { title: "PRUEBAS DE SISTEMA", points: ["Prueba de luces del tablero", "Prueba de estaciones manuales", "Prueba de detectores de humo", "Prueba de notificación sonora y visual", "Verificar dispositivos de monitoreo"] },
    { title: "INVENTARIO DE DISPOSITIVOS EN CAMPO", isInventoryTable: true, points: ["SMK | SENSOR HUMO OFI PRODUCCION PB", "SMK | SENSOR HUMO PAS LACTANCIA PB", "SMK | SENSOR HUMO OFI PROD MANAGER PB", "SMK | SENSOR HUMO TALLER TABLERO PB", "SMK | SENSOR HUMO PASILLO OF RH PB", "SMK | SENSOR HUMO BAÑO HOM WPA PB", "SMK | SENSOR HUMO CTO SEPTICO4 PB", "SMK | SENSOR HUMO RH BAÑO MUJ PB", "SMK | SENSOR HUMO SUBESTELECTRIC 1 PB", "SMK | SENSOR HUMO RECURSOS HUMANOS PB", "SMK | SENSOR HUMO RH BAÑO HOMBRE PB", "SMK | SENSOR HUMO PAS PPE PB", "SMK | SENSOR HUMO RH BAÑO MUJE PB", "SMK | SENSOR HUMO PASILLO SERV MEDICO PB", "SMK | SENSOR H PASILLO SINDICATO PB", "SMK | SENSOR HUMO BOD BAÑO MUJ WPA PB", "SMK | SENSOR DE HUMO RH BODEGA PB", "SMK | SENSOR H OFI MANAGER CUTTING PB", "SMK | SENSOR HUMO OFI PPE PB", "SMK | SENSOR HUMO RH ARCHIVOS PB", "SMK | SENSOR HUMO CALIBRACION PB", "SMK | SENSOR HUMO APLICATOR ROOM", "SMK | SENSOR HUMO OFI MANAGER PPE PB"] }
  ] },
  { id: 'IPM-04', standard: 'NFPA 25', category: 'HIDRANTES', name: 'SERVICIO A HIDRANTES', formCode: 'F-SER-039', icon: MapPin, color: '#06b6d4', sections: [{ title: "INSPECCIONES", points: ["El hidrante tiene libre acceso", "Las tapas giran libremente", "Verificar que el barril del hidrante esté libre de agua o hielo", "Estado físico del hidrante", "Desgaste de roscas en conectores de descarga y tapas", "Estado físico de la válvula", "Empaques y empaquetaduras en buen estado", "Disponibilidad de la llave del hidrante"] }] },
  { id: 'IPM-05', standard: 'NFPA 25', category: 'VÁLVULAS', name: 'VÁLVULAS DE CONTROL', formCode: 'F-SER-041', icon: Settings, color: '#8b5cf6', sections: [{ title: "INSPECCIÓN", points: ["La válvula se encuentra operativa y libre de daño visible", "La válvula es accesible y libre de obstrucciones", "La válvula está equipada con la correspondiente llave para su manipulación", "La válvula cuenta con candado y/o se encuentra supervisada", "Verificar el estado correcto de la válvula (abierta o cerrada)"] }, { title: "PRUEBA", points: ["Ejercitar cerrando y abriendo 3 vueltas las válvulas normalmente abiertas"] }] },
  { id: 'IPM-06', standard: 'NFPA 25', category: 'ROCIADORES', name: 'SISTEMA DE ROCIADORES', formCode: 'F-SER-IPM06', icon: Droplets, color: '#10b981', sections: [{ title: "INSPECCIONES", points: ["Verificar que el sistema se encuentre operativo", "Anotar la presión de suministro del riser", "Anotar presión de agua o aire en el sistema", "Verificar fugas y daño físico en válvula de alarma o acción previa", "Verificar que las válvulas estén accesibles y en estado correcto", "Verificar placa de identificación del riser", "Verificar conexión con bomberos", "Verificar que las válvulas estén enclavadas o supervisadas", "Verificar que se cuenta con rociadores de repuesto"] }] },
  { id: 'IPM-07', standard: 'NFPA 25/72', category: 'OBSERVACIONES', name: 'REPORTE DE OBSERVACIONES TÉCNICAS', formCode: 'F-SER-045', icon: Clipboard, color: '#0f172a', isObservations: true, sections: [{ title: "REPORTE", points: ["Revisión general de anomalías detectadas en sitio"] }] }
];

export default function NewInspection({ navigateTo, prefillData }) {
  const [step, setStep] = useState(1);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedIPM, setSelectedIPM] = useState(null);
  const [details, setDetails] = useState({});
  const [activeComments, setActiveComments] = useState({}); 
  const [voltages, setVoltages] = useState(Array.from({ length: 6 }, () => ({ min: '', max: '' })));
  const [generalObs, setGeneralObs] = useState('');
  
  const [selectedClient, setSelectedClient] = useState(prefillData?.clientId || '');
  const [ownerName, setOwnerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [clientsDb, setClientsDb] = useState([]);
  const [location, setLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [technicianName, setTechnicianName] = useState('Detectando técnico...');

  const [dynamicSections, setDynamicSections] = useState([]);

  const [showClientSigModal, setShowClientSigModal] = useState(false);
  const [showTechSigModal, setShowTechSigModal] = useState(false);
  const [clientSigData, setClientSigData] = useState(null);
  const [techSigData, setTechSigData] = useState(null);

  const clientCanvasRef = useRef(null);
  const techCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [imageToCrop, setImageToCrop] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // --- NUEVOS ESTADOS PARA MODALES PROPIOS ---
  const [customAddModal, setCustomAddModal] = useState({ isOpen: false, sIdx: null, isInventory: false, tag: '', desc: '' });
  const [customDeleteModal, setCustomDeleteModal] = useState({ isOpen: false, sIdx: null, pIdx: null, pointValue: '', displayName: '' });

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre');
      if (data) setClientsDb(data);
    };

    const loadUserAndLocation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        let displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nombre;
        if (!displayName) {
           try {
             const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
             if (profile && profile.full_name) displayName = profile.full_name;
           } catch (error) { console.warn("No se encontró el perfil en la base de datos"); }
        }
        setTechnicianName(displayName || 'Técnico TLETL');
      }

      if (prefillData?.location) {
        setLocation(prefillData.location);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {}
        );
      }
    };

    fetchClients();
    loadUserAndLocation();
  }, [prefillData]);

  useEffect(() => {
    if (selectedIPM && selectedIPM.sections) {
      setDynamicSections(JSON.parse(JSON.stringify(selectedIPM.sections)));
    } else {
      setDynamicSections([]);
    }
  }, [selectedIPM]);

  useEffect(() => {
    if (showClientSigModal && clientCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = clientCanvasRef.current;
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width; canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showClientSigModal]);

  useEffect(() => {
    if (showTechSigModal && techCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = techCanvasRef.current;
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width; canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTechSigModal]);


  // =========================================================================
  // --- LÓGICA DE MODALES NATIVOS PARA AÑADIR/BORRAR PUNTOS ---
  // =========================================================================
  
  // 1. Funciones para AÑADIR
  const triggerAddPoint = (sIdx, isInventoryTable) => {
    setCustomAddModal({ isOpen: true, sIdx, isInventory: isInventoryTable, tag: '', desc: '' });
  };

  const confirmAddPoint = () => {
    const { sIdx, isInventory, tag, desc } = customAddModal;
    
    if (isInventory) {
      if (!tag.trim() || !desc.trim()) return toast.error("Ambos campos son requeridos");
    } else {
      if (!desc.trim()) return toast.error("La descripción es requerida");
    }

    const pointString = isInventory 
      ? `${tag.toUpperCase().trim()} | ${desc.toUpperCase().trim()}`
      : desc.toUpperCase().trim();

    setDynamicSections(prev => {
      const updated = [...prev];
      updated[sIdx].points = [...updated[sIdx].points, pointString];
      return updated;
    });

    toast.success("Elemento agregado correctamente");
    setCustomAddModal({ isOpen: false, sIdx: null, isInventory: false, tag: '', desc: '' });
  };

  // 2. Funciones para BORRAR
  const triggerRemovePoint = (sIdx, pIdx, pointValue) => {
    const displayName = pointValue.includes('|') ? pointValue.split('|')[1].trim() : pointValue;
    setCustomDeleteModal({ isOpen: true, sIdx, pIdx, pointValue, displayName });
  };

  const confirmRemovePoint = () => {
    const { sIdx, pIdx, pointValue } = customDeleteModal;

    setDynamicSections(prev => {
      const updated = [...prev];
      updated[sIdx].points = updated[sIdx].points.filter((_, i) => i !== pIdx);
      return updated;
    });

    // Limpieza preventiva del estado
    setDetails(prev => {
      const updated = { ...prev };
      delete updated[pointValue];
      return updated;
    });

    toast.success("Elemento eliminado");
    setCustomDeleteModal({ isOpen: false, sIdx: null, pIdx: null, pointValue: '', displayName: '' });
  };


  // =========================================================================
  // --- LÓGICA DE FIRMAS Y DIBUJO ---
  // =========================================================================

  const startDrawing = (e, canvasRef) => {
    if (e.cancelable) e.preventDefault(); 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if(!clientX || !clientY) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0; 
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e, canvasRef) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const clearSignature = (canvasRef) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = (canvasRef, setSigData, setModalState) => {
    setSigData(canvasRef.current.toDataURL('image/png'));
    setModalState(false);
  };

  const handleSave = async () => {
    if (!selectedClient || !ownerName) return toast.error("⚠️ Falta seleccionar cliente o responsable.");
    if (!clientSigData) return toast.error("⚠️ La firma de conformidad del cliente es obligatoria.");
    if (!techSigData) return toast.error("⚠️ La firma de autorización del técnico es obligatoria.");

    setIsSaving(true);
    try {
      const clientObj = clientsDb.find(c => c.id === selectedClient);
      const statusesArray = Object.values(details).map(d => d?.status);
      let calculatedStatus = 'ÓPTIMO';
      
      if (statusesArray.length > 0) {
        if (statusesArray.includes('critico')) calculatedStatus = 'CRÍTICO';
        else if (statusesArray.includes('advertencia')) calculatedStatus = 'ADVERTENCIA';
      }

      const safeLocation = location || { lat: 20.9673, lng: -89.5925 };

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
        sections: dynamicSections, 
        details, voltages, generalObs,
        status: calculatedStatus, overallStatus: calculatedStatus, 
        signature: clientSigData, techSignature: techSigData, 
        location: safeLocation, performedBy: technicianName,
        date: new Date().toISOString()
      });

      toast.success("REPORTE GUARDADO Y LEGALIZADO LOCALMENTE");
      navigateTo('home'); 
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  };

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const getCroppedImg = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image(); img.src = imageToCrop;
    await new Promise(r => img.onload = r);
    canvas.width = 1024; canvas.height = 768;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 1024, 768);
    setDetails(prev => ({ ...prev, [activePoint]: { ...prev[activePoint], photo: canvas.toDataURL('image/jpeg', 0.8) } }));
    setImageToCrop(null);
  };

  const updateGPS = () => {
    if (navigator.geolocation) {
      toast.loading("Obteniendo coordenadas...", { id: "gps" });
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("GPS Actualizado", { id: "gps" }); },
        () => { toast.error("No se pudo acceder al GPS", { id: "gps" }); }
      );
    }
  };

  if (step === 1) return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <button onClick={() => navigateTo('home')} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600 tracking-widest mb-2"><ArrowLeft size={14} /> VOLVER AL PANEL</button>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
          <label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2 tracking-widest"><User size={14} /> SELECCIÓN DE SUCURSAL</label>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-4 mt-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-red-500 outline-none text-slate-700">
            <option value="">-- Elige Empresa --</option>
            {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className={`${!selectedClient ? 'opacity-30 pointer-events-none' : ''} grid gap-4`}>
          {['NFPA 25', 'NFPA 72'].map(std => (
            <button key={std} onClick={() => { setSelectedStandard(std); setStep(2); }} className="flex justify-between items-center p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-red-600 transition-all shadow-xl group">
              <div className="flex items-center gap-6">{std === 'NFPA 25' ? <Droplets className="text-blue-500" size={32} /> : <Bell className="text-red-500" size={32} />}<h3 className="font-black text-2xl text-slate-700">{std}</h3></div>
              <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
  );

  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard.includes(selectedStandard) || item.id === 'IPM-07');
    const categories = [...new Set(services.map(s => s.category))];
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600 tracking-widest"><ArrowLeft size={14} /> VOLVER A SUCURSAL</button>
        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">{cat}</span>
            <div className="grid gap-3">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { setSelectedIPM(item); setStep(3); }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-red-500 transition-all text-left group">
                  <div className="flex items-center gap-5"><div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-red-50 transition-colors"><Icon name={item.icon} size={24} className="text-slate-400 group-hover:text-red-600" /></div><div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.id}</p><h3 className="font-bold text-slate-700 uppercase text-sm leading-tight">{item.name}</h3></div></div>
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
    <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-6 pb-24">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600 tracking-widest"><ArrowLeft size={14} /> CATÁLOGO</button>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:block">TÉCNICO: {technicianName}</div>
      </div>

      {/* BANNER PRINCIPAL DEL FORMATO */}
      <div className={`${selectedIPM.color === '#ef4444' ? 'bg-red-600' : 'bg-slate-900'} p-8 md:p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Icon name={selectedIPM.icon} size={150} /></div>
        <div className="relative z-10">
          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
            {selectedIPM.standard} | {selectedIPM.formCode}
          </span>
          <h2 className="text-2xl md:text-4xl font-black uppercase mt-4 tracking-tighter leading-none">{selectedIPM.name}</h2>
          <p className="text-xs md:text-sm font-bold text-white/80 mt-2 uppercase tracking-wide">Documento de Inspección Técnica</p>
        </div>
      </div>

      {/* --- SECCIÓN DE INSPECCIÓN: RENDERIZADO DINÁMICO --- */}
      {dynamicSections && dynamicSections.map((sec, sIdx) => (
        <div key={sIdx} className="space-y-4 mb-10">
          <div className="flex items-center gap-3 ml-2">
             <div className="h-4 w-1 bg-red-600 rounded-full"></div>
             <h3 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-widest">{sec.title}</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sec.points && sec.points.map((p, pIdx) => {
              const currentStatus = details[p]?.status;
              const hasNote = details[p]?.note && details[p].note.trim() !== '';
              const hasPhoto = details[p]?.photo;
              
              const isInventory = sec.isInventoryTable;
              const itemName = isInventory ? p.split('|')[0]?.trim() : p;
              const itemLocation = isInventory ? p.split('|')[1]?.trim() : null;

              return (
                <div key={pIdx} className={`bg-white rounded-[2rem] border-2 transition-all duration-300 shadow-sm overflow-hidden relative group
                  ${currentStatus === 'critico' ? 'border-red-200 bg-red-50/20' : 
                    currentStatus === 'advertencia' ? 'border-yellow-200 bg-yellow-50/20' : 
                    currentStatus === 'bien' ? 'border-green-200 bg-green-50/20' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  
                  {/* NUEVO BOTÓN DE BORRADO: ESTILO NATIVO Y DISCRETO */}
                  <button 
                    type="button" 
                    onClick={() => triggerRemovePoint(sIdx, pIdx, p)} 
                    className="absolute top-4 right-4 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors p-2 rounded-xl lg:opacity-0 lg:group-hover:opacity-100 z-30 flex items-center justify-center gap-1"
                    title="Remover punto"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pr-14">
                    
                    {/* INFO DEL PUNTO DE INSPECCIÓN */}
                    <div className="flex-1">
                      {isInventory ? (
                        <div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">{itemName}</span>
                           <p className="text-slate-800 font-bold mt-2 leading-snug">{itemLocation}</p>
                        </div>
                      ) : (
                        <p className="text-slate-700 font-bold text-sm leading-snug pr-4">{itemName}</p>
                      )}
                    </div>

                    {/* CONTROLES: ESTADOS Y EVIDENCIA */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:w-auto shrink-0 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                      
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] w-full sm:w-auto">
                        <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'bien' } }))} 
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300
                            ${currentStatus === 'bien' ? 'bg-green-500 text-white shadow-md scale-105' : 'bg-transparent text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                          <CheckCircle2 size={14}/> <span className="hidden sm:inline">Óptimo</span><span className="sm:hidden">OK</span>
                        </button>
                        
                        <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'advertencia' } }))} 
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300
                            ${currentStatus === 'advertencia' ? 'bg-yellow-500 text-white shadow-md scale-105' : 'bg-transparent text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'}`}>
                          <AlertTriangle size={14}/> <span className="hidden sm:inline">Revisar</span><span className="sm:hidden">OBS</span>
                        </button>

                        <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'critico' } }))} 
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300
                            ${currentStatus === 'critico' ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-transparent text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
                          <AlertOctagon size={14}/> <span className="hidden sm:inline">Crítico</span><span className="sm:hidden">MAL</span>
                        </button>
                      </div>

                      <div className="w-[1px] h-8 bg-slate-200 hidden sm:block"></div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button type="button" onClick={() => setActiveComments(prev => ({ ...prev, [p]: !prev[p] }))} 
                          className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 rounded-[1rem] transition-colors border shadow-sm
                            ${hasNote || activeComments[p] ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                          <MessageSquare size={16} />
                        </button>
                        
                        <label className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 rounded-[1rem] cursor-pointer transition-colors border shadow-sm
                            ${hasPhoto ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                          {hasPhoto ? <ImageIcon size={16} /> : <Camera size={16} />}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const r = new FileReader(); r.onload = () => { setImageToCrop(r.result); setActivePoint(p); }; r.readAsDataURL(e.target.files[0]); }} />
                        </label>
                      </div>

                    </div>
                  </div>

                  {/* ZONA DESPLEGABLE DE OBSERVACIONES */}
                  {(activeComments[p] || hasNote || hasPhoto) && (
                    <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-2">
                      <div className="flex-1 relative">
                        <div className="absolute top-3 left-3"><MessageSquare size={14} className="text-slate-400" /></div>
                        <textarea 
                          rows="2"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 placeholder-slate-400 resize-none shadow-sm" 
                          placeholder="Redactar hallazgo u observación técnica para este punto..." 
                          value={details[p]?.note || ''} 
                          onChange={e => setDetails(prev => ({ ...prev, [p]: { ...prev[p], note: e.target.value } }))} 
                        />
                      </div>
                      {hasPhoto && (
                        <div className="shrink-0 relative group w-24 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <img src={details[p].photo} alt="Evidencia" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setDetails(prev => { const n={...prev}; delete n[p].photo; return n;})} className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={16}/>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* BOTÓN NATIVO DE AÑADIR ELEMENTO */}
            <button
              type="button"
              onClick={() => triggerAddPoint(sIdx, sec.isInventoryTable)}
              className="w-full py-4 mt-2 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-[1.5rem] bg-slate-50 text-[10px] font-black text-slate-400 hover:text-red-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:shadow-md active:scale-98"
            >
              <Plus size={14} /> Añadir Elemento a {sec.title}
            </button>
          </div>
        </div>
      ))}

      {/* --- SECCIÓN DE VOLTAJES: RENDERIZADO A GRID --- */}
      {selectedIPM.hasVoltages && (
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden mb-10">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">PRUEBA DE 6 ARRANQUES MANUALES</h3>
                <Activity size={16} className="text-red-500" />
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {voltages.map((v, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-red-200 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-black text-xs uppercase tracking-widest text-slate-800">Prueba #{i+1}</span>
                          <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">BATERÍAS</span>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <div className="flex-1 relative">
                             <span className="absolute -top-2 left-2 bg-slate-50 text-[8px] font-black text-slate-400 px-1 uppercase">Voltaje Mínimo</span>
                             <input type="number" placeholder="0.0" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-sm font-black outline-none text-slate-700 focus:border-red-400 transition-colors" value={v.min} onChange={e => { const n=[...voltages]; n[i].min=e.target.value; setVoltages(n); }} />
                          </div>
                          <div className="flex-1 relative">
                             <span className="absolute -top-2 left-2 bg-slate-50 text-[8px] font-black text-slate-400 px-1 uppercase">Voltaje Máximo</span>
                             <input type="number" placeholder="0.0" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-sm font-black outline-none text-slate-700 focus:border-red-400 transition-colors" value={v.max} onChange={e => { const n=[...voltages]; n[i].max=e.target.value; setVoltages(n); }} />
                          </div>
                        </div>
                    </div>
                ))}
              </div>
          </div>
      )}

      {/* UBICACIÓN GPS */}
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className={`p-4 rounded-2xl shrink-0 transition-colors ${location ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-600'}`}><MapPin size={24} /></div>
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas del Sitio Oficial</h4>
            <p className="text-sm font-black text-slate-800 mt-1 uppercase tracking-wide">{location ? `Lat: ${location.lat.toFixed(6)} | Lng: ${location.lng.toFixed(6)}` : 'Coordenadas No Vinculadas'}</p>
          </div>
        </div>
        <button type="button" onClick={updateGPS} className="w-full md:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"><RefreshCcw size={16} /> Capturar Ubicación</button>
      </div>

      {/* OBSERVACIÓN GENERAL */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
           <FileText size={18} className="text-slate-500" />
           <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Observación Técnica General</label>
        </div>
        <textarea className="w-full h-32 p-6 bg-white font-bold text-sm outline-none text-slate-700 placeholder-slate-300 resize-none" placeholder="Redactar el dictamen final o recomendaciones generales de la inspección..." value={generalObs} onChange={e => setGeneralObs(e.target.value)} />
      </div>

      {/* --- SECCIÓN RESPONSIVE DE BOTONES DE FIRMAS --- */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldAlert size={150} /></div>
        
        <h3 className="relative z-10 text-lg font-black uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Legalización de Reporte</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* BLOQUE FIRMA 1: CLIENTE */}
          <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Conformidad del Cliente</label>
            <input className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 font-bold outline-none text-white focus:border-red-500 transition-colors placeholder-slate-500 text-sm mb-4" placeholder="Nombre completo de quien recibe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            
            <button type="button" onClick={() => setShowClientSigModal(true)} className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 ${clientSigData ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-600 hover:border-red-500 hover:bg-slate-800 text-slate-300'}`}>
               {clientSigData ? (
                   <>
                      <img src={clientSigData} alt="Firma Cliente" className="h-16 w-auto object-contain bg-white px-4 rounded-xl mb-1 shadow-md" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Firma Autorizada ✓</span>
                   </>
               ) : (
                   <>
                      <User size={32} className="opacity-50" />
                      <span className="text-xs font-black uppercase tracking-wider">Firmar (Cliente)</span>
                   </>
               )}
            </button>
          </div>

          {/* BLOQUE FIRMA 2: TÉCNICO */}
          <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Autorización Técnica</label>
            <input className="w-full bg-slate-800/30 border border-slate-700 rounded-xl p-4 font-bold outline-none text-slate-400 cursor-not-allowed text-sm mb-4" disabled value={technicianName} />
            
            <button type="button" onClick={() => setShowTechSigModal(true)} className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 ${techSigData ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-600 hover:border-red-500 hover:bg-slate-800 text-slate-300'}`}>
               {techSigData ? (
                   <>
                      <img src={techSigData} alt="Firma Técnico" className="h-16 w-auto object-contain bg-white px-4 rounded-xl mb-1 shadow-md" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Firma Autorizada ✓</span>
                   </>
               ) : (
                   <>
                      <Settings size={32} className="opacity-50" />
                      <span className="text-xs font-black uppercase tracking-wider">Firmar (Técnico)</span>
                   </>
               )}
            </button>
          </div>
        </div>
      </div>

      {/* BOTÓN FINAL */}
      <button onClick={handleSave} disabled={isSaving} className="w-full py-6 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95 transition-all mt-8 uppercase tracking-widest border border-red-500">
        {isSaving ? <RefreshCcw className="animate-spin" size={24} /> : <Save size={24} />} 
        Finalizar Reporte Oficial
      </button>


      {/* ========================================================================= */}
      {/* 🧩 MODALES NATIVOS DE INTERFAZ */}
      {/* ========================================================================= */}

      {/* MODAL: AÑADIR PUNTO/DISPOSITIVO */}
      {customAddModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-blue-400" />
                <h3 className="font-black uppercase tracking-widest text-sm">Nuevo Elemento</h3>
              </div>
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="p-1 hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {customAddModal.isInventory && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Siglas / Tipo (Ej: SMK, EXT, GAB)</label>
                  <input 
                    type="text" autoFocus
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 uppercase text-slate-700" 
                    value={customAddModal.tag} onChange={(e) => setCustomAddModal({ ...customAddModal, tag: e.target.value })} 
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                  {customAddModal.isInventory ? 'Ubicación Exacta' : 'Descripción de Inspección'}
                </label>
                <input 
                  type="text" autoFocus={!customAddModal.isInventory}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 uppercase text-slate-700" 
                  value={customAddModal.desc} onChange={(e) => setCustomAddModal({ ...customAddModal, desc: e.target.value })} 
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-sm hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmAddPoint} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-lg shadow-blue-500/30 hover:bg-blue-700">Agregar Elemento</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {customDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 text-center">
            <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle size={32} />
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-2">¿Eliminar Elemento?</h3>
              <p className="text-sm font-bold text-slate-500">Se removerá permanentemente de este reporte:</p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-black text-red-600 uppercase text-xs leading-snug">{customDeleteModal.displayName}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <button onClick={() => setCustomDeleteModal({ ...customDeleteModal, isOpen: false })} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-sm hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmRemovePoint} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-lg shadow-red-500/30 hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FIRMA CLIENTE FULLSCREEN */}
      {showClientSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6 mt-4">
             <div>
               <h3 className="text-white font-black uppercase tracking-widest text-lg">Firma del Cliente</h3>
               <p className="text-red-400 text-xs font-bold uppercase">{ownerName || 'Sin nombre capturado'}</p>
             </div>
             <button onClick={() => setShowClientSigModal(false)} className="p-3 bg-slate-800 rounded-full text-white active:scale-90"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded-[2rem] overflow-hidden relative shadow-inner">
             <canvas ref={clientCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, clientCanvasRef)} onMouseMove={(e) => draw(e, clientCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, clientCanvasRef)} onTouchMove={(e) => draw(e, clientCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-6 mb-6">
             <button onClick={() => clearSignature(clientCanvasRef)} className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all">Limpiar Lienzo</button>
             <button onClick={() => saveSignature(clientCanvasRef, setClientSigData, setShowClientSigModal)} className="flex-[2] py-5 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-green-500/20 active:scale-95 transition-all">Confirmar Firma</button>
          </div>
        </div>
      )}

      {/* MODAL FIRMA TÉCNICO FULLSCREEN */}
      {showTechSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6 mt-4">
             <div>
               <h3 className="text-white font-black uppercase tracking-widest text-lg">Firma del Técnico</h3>
               <p className="text-red-400 text-xs font-bold uppercase">{technicianName}</p>
             </div>
             <button onClick={() => setShowTechSigModal(false)} className="p-3 bg-slate-800 rounded-full text-white active:scale-90"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded-[2rem] overflow-hidden relative shadow-inner">
             <canvas ref={techCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, techCanvasRef)} onMouseMove={(e) => draw(e, techCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, techCanvasRef)} onTouchMove={(e) => draw(e, techCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-6 mb-6">
             <button onClick={() => clearSignature(techCanvasRef)} className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all">Limpiar Lienzo</button>
             <button onClick={() => saveSignature(techCanvasRef, setTechSigData, setShowTechSigModal)} className="flex-[2] py-5 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-green-500/20 active:scale-95 transition-all">Confirmar Firma</button>
          </div>
        </div>
      )}

      {/* MODAL RECORTE DE IMAGEN */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4">
          <div className="relative flex-1 rounded-[2.5rem] overflow-hidden"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={5/4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <button onClick={getCroppedImg} className="mt-4 py-5 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 text-sm uppercase tracking-wider"><Scissors size={20} /> Recortar Evidencia</button>
        </div>
      )}
    </div>
  );
}