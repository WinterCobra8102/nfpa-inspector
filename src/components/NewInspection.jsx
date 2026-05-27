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
  // --- LÓGICA DE AÑADIR/BORRAR PUNTOS ---
  // =========================================================================
  
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

    toast.success("Elemento agregado al documento");
    setCustomAddModal({ isOpen: false, sIdx: null, isInventory: false, tag: '', desc: '' });
  };

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

    setDetails(prev => {
      const updated = { ...prev };
      delete updated[pointValue];
      return updated;
    });

    toast.success("Elemento removido");
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

    ctx.strokeStyle = '#0f172a'; // Azul oscuro casi negro para firma
    ctx.lineWidth = 2.5; 
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

      toast.success("REPORTE OFICIAL GUARDADO LOCALMENTE");
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
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Coordenadas actualizadas", { id: "gps" }); },
        () => { toast.error("No se pudo acceder al GPS", { id: "gps" }); }
      );
    }
  };

  // =========================================================================
  // PASO 1 Y 2: NAVEGACIÓN Y SELECCIÓN (ESTILO CORPORATIVO LIMPIO)
  // =========================================================================

  if (step === 1) return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <button onClick={() => navigateTo('home')} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 hover:text-red-600 transition-colors"><ArrowLeft size={16} /> VOLVER AL PANEL</button>
        <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-lg">
          <div className="border-b border-slate-200 pb-4 mb-6">
             <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Inicio de Inspección</h2>
             <p className="text-sm text-slate-500">Seleccione la sucursal o planta para vincular el documento.</p>
          </div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-2"><User size={14} /> EMPRESA / SUCURSAL</label>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md font-bold outline-none focus:border-blue-500 text-slate-700 transition-colors">
            <option value="">-- Seleccionar de la base de datos --</option>
            {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        
        <div className={`${!selectedClient ? 'opacity-50 pointer-events-none' : ''} space-y-3`}>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Seleccione Marco Normativo</h3>
          {['NFPA 25', 'NFPA 72'].map(std => (
            <button key={std} onClick={() => { setSelectedStandard(std); setStep(2); }} className="w-full flex justify-between items-center p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  {std === 'NFPA 25' ? <Droplets size={24} /> : <Bell size={24} />}
                </div>
                <h3 className="font-black text-xl text-slate-700">{std}</h3>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>
  );

  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard.includes(selectedStandard) || item.id === 'IPM-07');
    const categories = [...new Set(services.map(s => s.category))];
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        <button onClick={() => setStep(1)} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 hover:text-red-600 transition-colors"><ArrowLeft size={16} /> CAMBIAR SUCURSAL</button>
        <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Catálogo {selectedStandard}</h2>
            <p className="text-sm text-slate-500">Seleccione el formulario de inspección a ejecutar.</p>
        </div>
        {categories.map(cat => (
          <div key={cat} className="space-y-3">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase border-b border-slate-200 pb-1 block w-full">{cat}</span>
            <div className="grid gap-2">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { setSelectedIPM(item); setStep(3); }} className="bg-white p-4 border border-slate-200 rounded-md shadow-sm flex items-center justify-between hover:border-blue-500 hover:bg-slate-50 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <Icon name={item.icon} size={20} className="text-slate-400 group-hover:text-blue-600" />
                    <div>
                      <h3 className="font-bold text-slate-800 uppercase text-sm leading-tight">{item.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.id} | {item.formCode}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // PASO 3: DISEÑO DE DOCUMENTO FORMAL (A4 STYLE)
  // =========================================================================

  return (
    <div className="bg-slate-50 min-h-screen pb-24 pt-4 md:pt-8 px-2 md:px-4">
      
      {/* Botón de regreso fuera del documento */}
      <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center">
        <button onClick={() => setStep(2)} className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 hover:text-red-600 transition-colors">
          <ArrowLeft size={16} /> CANCELAR Y VOLVER AL CATÁLOGO
        </button>
      </div>

      {/* --- INICIO DEL DOCUMENTO (HOJA) --- */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-300 shadow-2xl rounded-sm overflow-hidden">
        
        {/* MEMBRETE (HEADER DOCUMENTO) */}
        <div className="border-b-[3px] border-slate-800 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-sm shrink-0">
               <Icon name={selectedIPM.icon} size={32} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedIPM.name}</h1>
              <p className="text-xs md:text-sm font-bold text-slate-500 uppercase mt-1 tracking-widest">
                REPORTE OFICIAL DE INSPECCIÓN TÉCNICA
              </p>
            </div>
          </div>
          <div className="text-left md:text-right shrink-0 border-l-4 border-red-600 pl-4">
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">NORMATIVA</p>
             <p className="text-lg font-black text-slate-800">{selectedIPM.standard}</p>
             <p className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-block mt-1">{selectedIPM.formCode}</p>
          </div>
        </div>

        {/* INFO GENERAL (GRID) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-slate-300 bg-slate-50 text-xs">
           <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200">
             <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa / Sitio</span>
             <p className="font-bold text-slate-800 uppercase leading-tight">
               {clientsDb.find(c => c.id === selectedClient)?.nombre || 'NO ESPECIFICADO'}
             </p>
           </div>
           <div className="p-4 border-b md:border-b-0 lg:border-r border-slate-200">
             <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Técnico Asignado</span>
             <p className="font-bold text-slate-800 uppercase">{technicianName}</p>
           </div>
           <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 flex justify-between items-center">
             <div>
               <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación GPS</span>
               <p className="font-bold text-slate-800 uppercase text-[10px]">{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Pendiente'}</p>
             </div>
             <button onClick={updateGPS} className="text-blue-600 p-2 hover:bg-blue-50 rounded" title="Actualizar GPS"><RefreshCcw size={14}/></button>
           </div>
           <div className="p-4">
             <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Ejecución</span>
             <p className="font-bold text-slate-800 uppercase">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
           </div>
        </div>

        {/* --- DESARROLLO DEL CHECKLIST (SECCIONES) --- */}
        <div className="p-6 md:p-10 space-y-12">
          
          {dynamicSections && dynamicSections.map((sec, sIdx) => (
            <div key={sIdx} className="border border-slate-300 rounded-sm overflow-hidden">
              
              {/* Encabezado de Sección */}
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-300 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{sec.title}</h3>
                 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2 py-0.5 border border-slate-200 rounded">
                   {sec.points.length} Puntos
                 </span>
              </div>

              {/* Lista de Puntos */}
              <div className="divide-y divide-slate-200">
                {sec.points && sec.points.map((p, pIdx) => {
                  const currentStatus = details[p]?.status;
                  const hasNote = details[p]?.note && details[p].note.trim() !== '';
                  const hasPhoto = details[p]?.photo;
                  
                  const isInventory = sec.isInventoryTable;
                  const itemName = isInventory ? p.split('|')[0]?.trim() : p;
                  const itemLocation = isInventory ? p.split('|')[1]?.trim() : null;

                  return (
                    <div key={pIdx} className="flex flex-col hover:bg-slate-50/50 transition-colors relative group">
                      
                      {/* Botón borrar (Aparece en hover) */}
                      <button 
                        type="button" 
                        onClick={() => triggerRemovePoint(sIdx, pIdx, p)} 
                        className="absolute top-2 left-1 md:left-2 text-slate-300 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Remover Fila"
                      >
                        <X size={14} />
                      </button>

                      <div className="flex flex-col lg:flex-row min-h-[60px] pl-6 md:pl-10">
                        
                        {/* Celda de Descripción */}
                        <div className="flex-1 py-4 pr-4 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-center">
                          {isInventory ? (
                            <div className="flex items-start gap-2">
                               <span className="text-[9px] font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">{itemName}</span>
                               <span className="text-sm font-bold text-slate-800 leading-snug">{itemLocation}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-800 leading-snug">{itemName}</span>
                          )}
                        </div>

                        {/* Celda de Controles (Checkboxes y Anexos) */}
                        <div className="shrink-0 flex items-center justify-between lg:justify-start gap-6 p-4 lg:w-[350px]">
                          
                          {/* CHECKBOXES FORMALES */}
                          <div className="flex bg-slate-100 rounded border border-slate-200 overflow-hidden">
                            <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'bien' } }))} 
                              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase transition-colors border-r border-slate-200 last:border-0
                                ${currentStatus === 'bien' ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                              {currentStatus === 'bien' && <CheckCircle2 size={12}/>} ÓPTIMO
                            </button>
                            
                            <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'advertencia' } }))} 
                              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase transition-colors border-r border-slate-200 last:border-0
                                ${currentStatus === 'advertencia' ? 'bg-yellow-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                              {currentStatus === 'advertencia' && <AlertTriangle size={12}/>} REVISAR
                            </button>

                            <button type="button" onClick={() => setDetails(prev => ({ ...prev, [p]: { ...prev[p], status: 'critico' } }))} 
                              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase transition-colors border-r border-slate-200 last:border-0
                                ${currentStatus === 'critico' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                              {currentStatus === 'critico' && <AlertOctagon size={12}/>} CRÍTICO
                            </button>
                          </div>

                          {/* ICONOS DE EVIDENCIA */}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setActiveComments(prev => ({ ...prev, [p]: !prev[p] }))} 
                              className={`p-1.5 rounded transition-colors
                                ${hasNote || activeComments[p] ? 'text-blue-600 bg-blue-50 border border-blue-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                              <MessageSquare size={16} />
                            </button>
                            <label className={`p-1.5 rounded cursor-pointer transition-colors block
                                ${hasPhoto ? 'text-green-600 bg-green-50 border border-green-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                              {hasPhoto ? <ImageIcon size={16} /> : <Camera size={16} />}
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const r = new FileReader(); r.onload = () => { setImageToCrop(r.result); setActivePoint(p); }; r.readAsDataURL(e.target.files[0]); }} />
                            </label>
                          </div>
                        </div>

                      </div>

                      {/* SUB-FILA DE EVIDENCIA (Si aplica) */}
                      {(activeComments[p] || hasNote || hasPhoto) && (
                        <div className="pl-6 md:pl-10 pr-4 pb-4 animate-in slide-in-from-top-2">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col md:flex-row gap-4 border-l-2 border-l-blue-400">
                            <div className="flex-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MessageSquare size={10}/> Anotación Técnica</label>
                              <textarea 
                                rows="2"
                                className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 resize-y" 
                                placeholder="Describa el hallazgo..." 
                                value={details[p]?.note || ''} 
                                onChange={e => setDetails(prev => ({ ...prev, [p]: { ...prev[p], note: e.target.value } }))} 
                              />
                            </div>
                            {hasPhoto && (
                              <div className="shrink-0">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ImageIcon size={10}/> Evidencia</label>
                                <div className="relative group w-32 h-20 rounded border border-slate-300 overflow-hidden bg-white">
                                  <img src={details[p].photo} alt="Evidencia" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setDetails(prev => { const n={...prev}; delete n[p].photo; return n;})} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Fila inferior para añadir elementos (Como en Excel) */}
              <button
                type="button"
                onClick={() => triggerAddPoint(sIdx, sec.isInventoryTable)}
                className="w-full py-3 bg-white border-t border-slate-200 text-xs font-black text-blue-600 hover:bg-blue-50 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Añadir Fila
              </button>
            </div>
          ))}

          {/* --- TABLA DE VOLTAJES FORMAL --- */}
          {selectedIPM.hasVoltages && (
              <div className="border border-slate-300 rounded-sm overflow-hidden mb-10">
                  <div className="bg-slate-100 px-5 py-3 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">LECTURAS: 6 ARRANQUES MANUALES (VCD)</h3>
                  </div>
                  
                  {/* Table Header */}
                  <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest divide-x divide-slate-200">
                     <div className="py-2 px-4 text-center">Nº Intento</div>
                     <div className="py-2 px-4 text-center">Voltaje Mínimo</div>
                     <div className="py-2 px-4 text-center">Voltaje Máximo</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-200">
                    {voltages.map((v, i) => (
                        <div key={i} className="grid grid-cols-3 divide-x divide-slate-200 bg-white hover:bg-slate-50 transition-colors">
                            <div className="py-3 flex items-center justify-center font-bold text-xs text-slate-700">
                              Prueba #{i+1}
                            </div>
                            <div className="py-2 px-2 flex items-center justify-center">
                              <input type="number" placeholder="0.0" className="w-24 text-center bg-transparent border-b border-slate-300 focus:border-blue-500 text-sm font-bold outline-none text-slate-800 pb-1" value={v.min} onChange={e => { const n=[...voltages]; n[i].min=e.target.value; setVoltages(n); }} />
                            </div>
                            <div className="py-2 px-2 flex items-center justify-center">
                              <input type="number" placeholder="0.0" className="w-24 text-center bg-transparent border-b border-slate-300 focus:border-blue-500 text-sm font-bold outline-none text-slate-800 pb-1" value={v.max} onChange={e => { const n=[...voltages]; n[i].max=e.target.value; setVoltages(n); }} />
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {/* DICTAMEN GENERAL (BOX FORMAL) */}
          <div className="border border-slate-300 rounded-sm overflow-hidden mb-8">
            <div className="bg-slate-100 px-5 py-3 border-b border-slate-300">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">DICTAMEN TÉCNICO Y OBSERVACIONES GENERALES</h3>
            </div>
            <textarea 
              className="w-full h-32 p-5 bg-white font-bold text-sm outline-none text-slate-800 placeholder-slate-400 resize-y" 
              placeholder="Describa el resumen de la visita, recomendaciones o notas finales para el cliente..." 
              value={generalObs} 
              onChange={e => setGeneralObs(e.target.value)} 
            />
          </div>

        </div>

        {/* --- SECCIÓN DE FIRMAS Y LEGALIZACIÓN (ESTILO DOCUMENTO) --- */}
        <div className="border-t-[3px] border-slate-800 bg-slate-50 p-6 md:p-10">
          <h3 className="text-center font-black text-slate-800 uppercase tracking-widest mb-12 text-sm">Validación y Firmas de Conformidad</h3>

          {/* Aumentamos el gap vertical en celulares (gap-16) para que no se encimen los bloques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 max-w-3xl mx-auto">
            
            {/* Firma Cliente */}
            <div className="flex flex-col items-center w-full max-w-[320px] mx-auto">
              <input 
                 className="w-full bg-transparent border-b border-transparent focus:border-blue-400 text-center font-bold text-sm outline-none text-slate-800 mb-6 placeholder-slate-400 transition-colors" 
                 placeholder="NOMBRE DEL RESPONSABLE" 
                 value={ownerName} 
                 onChange={(e) => setOwnerName(e.target.value)} 
              />
              <div 
                 onClick={() => setShowClientSigModal(true)} 
                 className="w-full h-28 border-b-2 border-slate-800 flex flex-col items-center justify-end cursor-pointer group pb-2 relative"
              >
                 {clientSigData ? (
                     <img src={clientSigData} alt="Firma Cliente" className="max-h-24 w-auto object-contain mb-2" />
                 ) : (
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors mb-2">Tocar para firmar</span>
                 )}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3 text-center">Firma de Recibido y Conformidad</p>
            </div>

            {/* Firma Técnico */}
            <div className="flex flex-col items-center w-full max-w-[320px] mx-auto">
              <input 
                 className="w-full bg-transparent border-b border-transparent text-center font-bold text-sm outline-none text-slate-800 mb-6" 
                 disabled 
                 value={technicianName} 
              />
              <div 
                 onClick={() => setShowTechSigModal(true)} 
                 className="w-full h-28 border-b-2 border-slate-800 flex flex-col items-center justify-end cursor-pointer group pb-2 relative"
              >
                 {techSigData ? (
                     <img src={techSigData} alt="Firma Técnico" className="max-h-24 w-auto object-contain mb-2" />
                 ) : (
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors mb-2">Tocar para firmar</span>
                 )}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3 text-center">Técnico Autorizado TLETL</p>
            </div>

          </div>
          
          {/* Botón Guardar con más separación superior (mt-16) */}
          <div className="mt-16 flex justify-center">
            <button onClick={handleSave} disabled={isSaving} className="w-full max-w-md py-4 bg-slate-900 hover:bg-blue-600 text-white rounded font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70 transition-colors shadow-lg active:scale-95">
              {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />} 
              Cerrar y Guardar Documento
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🧩 MODALES NATIVOS DE INTERFAZ */}
      {/* ========================================================================= */}

      {/* MODAL: AÑADIR PUNTO/DISPOSITIVO */}
      {customAddModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200">
            <div className="bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                <h3 className="font-black uppercase tracking-widest text-sm text-slate-800">Añadir Fila</h3>
              </div>
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {customAddModal.isInventory && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Siglas (Ej: SMK, EXT)</label>
                  <input 
                    type="text" autoFocus
                    className="w-full p-3 bg-white border border-slate-300 rounded font-bold text-sm outline-none focus:border-blue-500 uppercase text-slate-800" 
                    value={customAddModal.tag} onChange={(e) => setCustomAddModal({ ...customAddModal, tag: e.target.value })} 
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
                  {customAddModal.isInventory ? 'Ubicación' : 'Descripción'}
                </label>
                <input 
                  type="text" autoFocus={!customAddModal.isInventory}
                  className="w-full p-3 bg-white border border-slate-300 rounded font-bold text-sm outline-none focus:border-blue-500 uppercase text-slate-800" 
                  value={customAddModal.desc} onChange={(e) => setCustomAddModal({ ...customAddModal, desc: e.target.value })} 
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-200">
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 rounded font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmAddPoint} className="flex-[2] py-3 bg-blue-600 text-white rounded font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-blue-700">Insertar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {customDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded shadow-2xl overflow-hidden animate-in zoom-in-95 text-center border border-slate-200">
            <div className="bg-red-50 p-6 flex justify-center border-b border-red-200">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <div className="p-6">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-tight mb-2">¿Eliminar Fila?</h3>
              <div className="mt-3 p-3 bg-slate-100 rounded border border-slate-200 text-left">
                <p className="font-bold text-slate-700 text-xs leading-snug">{customDeleteModal.displayName}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-200">
              <button onClick={() => setCustomDeleteModal({ ...customDeleteModal, isOpen: false })} className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 rounded font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmRemovePoint} className="flex-1 py-3 bg-red-600 text-white rounded font-black uppercase tracking-widest text-[10px] transition-colors hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FIRMA CLIENTE FULLSCREEN */}
      {showClientSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4 mt-2">
             <div>
               <h3 className="text-white font-black uppercase tracking-widest text-base">Firma de Conformidad del Encargado</h3>
               <p className="text-slate-400 text-xs font-bold uppercase">{ownerName || 'Sin responsable capturado'}</p>
             </div>
             <button onClick={() => setShowClientSigModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={28} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded overflow-hidden relative shadow-inner">
             <div className="absolute top-1/2 left-10 right-10 border-b-2 border-slate-200 pointer-events-none"></div>
             <canvas ref={clientCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, clientCanvasRef)} onMouseMove={(e) => draw(e, clientCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, clientCanvasRef)} onTouchMove={(e) => draw(e, clientCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-4 mb-2">
             <button onClick={() => clearSignature(clientCanvasRef)} className="flex-1 py-4 bg-slate-800 border border-slate-700 text-white rounded font-black uppercase tracking-widest text-xs transition-colors hover:bg-slate-700">Limpiar</button>
             <button onClick={() => saveSignature(clientCanvasRef, setClientSigData, setShowClientSigModal)} className="flex-[2] py-4 bg-blue-600 text-white rounded font-black uppercase tracking-widest text-xs transition-colors hover:bg-blue-500">Guardar Firma</button>
          </div>
        </div>
      )}

      {/* MODAL FIRMA TÉCNICO FULLSCREEN */}
      {showTechSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4 mt-2">
             <div>
               <h3 className="text-white font-black uppercase tracking-widest text-base">Firma del Técnico</h3>
               <p className="text-slate-400 text-xs font-bold uppercase">{technicianName}</p>
             </div>
             <button onClick={() => setShowTechSigModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={28} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded overflow-hidden relative shadow-inner">
             <div className="absolute top-1/2 left-10 right-10 border-b-2 border-slate-200 pointer-events-none"></div>
             <canvas ref={techCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, techCanvasRef)} onMouseMove={(e) => draw(e, techCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, techCanvasRef)} onTouchMove={(e) => draw(e, techCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-4 mb-2">
             <button onClick={() => clearSignature(techCanvasRef)} className="flex-1 py-4 bg-slate-800 border border-slate-700 text-white rounded font-black uppercase tracking-widest text-xs transition-colors hover:bg-slate-700">Limpiar</button>
             <button onClick={() => saveSignature(techCanvasRef, setTechSigData, setShowTechSigModal)} className="flex-[2] py-4 bg-blue-600 text-white rounded font-black uppercase tracking-widest text-xs transition-colors hover:bg-blue-500">Guardar Firma</button>
          </div>
        </div>
      )}
      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4">
          <div className="relative flex-1 rounded overflow-hidden border border-slate-700"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={5/4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <button onClick={getCroppedImg} className="mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-black flex items-center justify-center gap-2 transition-colors text-xs uppercase tracking-widest"><Scissors size={18} /> Recortar y Anexar Imagen</button>
        </div>
      )}
    </div>
  );
}