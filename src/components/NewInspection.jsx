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
  { id: 'IPM-06', standard: 'NFPA 25', category: 'ROCIADORES', name: 'SISTEMA DE ROCIADORES', formCode: 'F-SER-IPM06', icon: Droplets, color: '#10b981', sections: [{ title: "INSPECCIONES", points: ["Verificar que el sistema se encuentre operativo", "Anotar la presión de suministro del riser", "Anotar presión de agua o aire en el system", "Verificar fugas y daño físico en válvula de alarma o acción previa", "Verificar que las válvulas estén accesibles y en estado correcto", "Verificar placa de identificación del riser", "Verificar conexión con bomberos", "Verificar que las válvulas estén enclavadas o supervisadas", "Verificar que se cuenta con rociadores de repuesto"] }] },
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
      const { data } = await supabase.from('clientes').select('id, nombre, direccion, lat, lng').order('nombre');
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
      }
    };

    fetchClients();
    loadUserAndLocation();
  }, [prefillData]);

  // --- NUEVA CORRECCIÓN DE AUTORRUTAMIENTO INTEGRADA ---
  useEffect(() => {
    if (prefillData?.cliente_id && clientsDb.length > 0) {
      setSelectedClient(prefillData.cliente_id);
      
      if (prefillData.normativa_nfpa) {
        const matchedIPM = IPM_CATALOG.find(item => 
          prefillData.normativa_nfpa.toUpperCase().includes(item.standard.toUpperCase()) &&
          prefillData.normativa_nfpa.toUpperCase().includes(item.category.toUpperCase())
        ) || IPM_CATALOG.find(item => prefillData.normativa_nfpa.toUpperCase().includes(item.standard.toUpperCase()));
        
        if (matchedIPM) {
          setSelectedStandard(matchedIPM.standard);
          setSelectedIPM(matchedIPM);
          setStep(3); 
        }
      }
    }
  }, [prefillData, clientsDb]);

  useEffect(() => {
    if (selectedClient && clientsDb.length > 0) {
      const clientObj = clientsDb.find(c => c.id === selectedClient);
      if (clientObj && clientObj.lat && clientObj.lng) {
        setLocation({ lat: clientObj.lat, lng: clientObj.lng });
      } else {
        setLocation(null);
      }
    }
  }, [selectedClient, clientsDb]);

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

  const startDrawing = (e, canvasRef) => {
    if (e.cancelable) e.preventDefault(); 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if(!clientX || !clientY) return;

    ctx.strokeStyle = '#0f172a';
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
    if (!selectedClient || !ownerName) return toast.error("Falta seleccionar cliente o responsable.");
    if (!clientSigData) return toast.error("La firma de conformidad del cliente es obligatoria.");
    if (!techSigData) return toast.error("La firma de autorización del técnico es obligatoria.");

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

      if (prefillData?.ticket_id) {
        await supabase
          .from('service_requests')
          .update({ inspection_id: prefillData.ticket_id })
          .eq('id', prefillData.ticket_id);
      }

      toast.success("Reporte oficial guardado localmente");
      navigateTo('home'); 
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar el reporte.");
    } Platform.OS === 'web' && setIsSaving(false);
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

  if (step === 1) return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <button onClick={() => navigateTo('home')} className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 hover:text-red-600 dark:hover:text-red-500 transition-colors">
          <ArrowLeft size={16} /> Volver al Panel
        </button>
        <div className="bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
             <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inicio de Inspección</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Seleccione la sucursal o planta para vincular el documento.</p>
          </div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2"><User size={14} /> Empresa / Sucursal</label>
          
          {/* SE INTEGRÓ EL BLOQUEO DINÁMICO AQUÍ */}
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)} 
            disabled={!!prefillData?.cliente_id}
            className={`w-full p-3 border rounded-lg text-sm outline-none transition-colors ${
              prefillData?.cliente_id 
                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed opacity-90' 
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-slate-700 dark:text-slate-200'
            }`}
          >
            <option value="">-- Seleccionar de la base de datos --</option>
            {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* ALERTA VISUAL DE VINCULACIÓN */}
          {prefillData?.cliente_id && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <ShieldAlert size={14} className="shrink-0" />
              <span>Sucursal bloqueada. Asignación directa por Orden de Servicio.</span>
            </div>
          )}
        </div>
        
        <div className={`${!selectedClient ? 'opacity-50 pointer-events-none' : ''} space-y-3`}>
          <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide pl-1">Seleccione Marco Normativo</h3>
          {['NFPA 25', 'NFPA 72'].map(std => (
            <button key={std} onClick={() => { setSelectedStandard(std); setStep(2); }} className="w-full flex justify-between items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 dark:group-hover:text-red-500 group-hover:border-red-100 dark:group-hover:border-red-900/30 transition-colors text-slate-500 dark:text-slate-400">
                  {std === 'NFPA 25' ? <Droplets size={22} /> : <Bell size={22} />}
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{std}</h3>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-red-500 transition-colors" />
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
        <button onClick={() => setStep(1)} className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 hover:text-red-600 dark:hover:text-red-500 transition-colors">
          <ArrowLeft size={16} /> Cambiar Sucursal
        </button>
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Catálogo {selectedStandard}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Seleccione el formulario de inspección a ejecutar.</p>
        </div>
        {categories.map(cat => (
          <div key={cat} className="space-y-3">
            <span className="text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700 pb-1 block w-full">{cat}</span>
            <div className="grid gap-2">
              {services.filter(s => s.category === cat).map(item => (
                <button key={item.id} onClick={() => { setSelectedIPM(item); setStep(3); }} className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center justify-between hover:border-red-500 dark:hover:border-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <Icon name={item.icon} size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors" />
                    <div>
                      <h3 className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-tight">{item.name}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.id} | {item.formCode}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-red-500" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 pt-4 md:pt-8 px-2 md:px-4">
      <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center">
        <button onClick={() => setStep(2)} className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 hover:text-red-600 dark:hover:text-red-500 transition-colors">
          <ArrowLeft size={16} /> Cancelar y volver al catálogo
        </button>
      </div>

      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-sm overflow-hidden">
        <div className="border-b-[3px] border-slate-800 dark:border-slate-600 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center rounded-sm shrink-0">
               <Icon name={selectedIPM.icon} size={32} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{selectedIPM.name}</h1>
              <p className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mt-1 tracking-widest">
                REPORTE OFICIAL DE INSPECCIÓN TÉCNICA
              </p>
            </div>
          </div>
          <div className="text-left md:text-right shrink-0 border-l-4 border-red-600 pl-4">
             <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">NORMATIVA</p>
             <p className="text-lg font-black text-slate-800 dark:text-slate-200">{selectedIPM.standard}</p>
             <p className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded inline-block mt-1">{selectedIPM.formCode}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
           <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
             <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Empresa / Sitio</span>
             <p className="font-bold text-slate-800 dark:text-slate-200 uppercase leading-tight">
               {clientsDb.find(c => c.id === selectedClient)?.nombre || 'NO ESPECIFICADO'}
             </p>
           </div>
           <div className="p-4 border-b md:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
             <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Técnico Asignado</span>
             <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">{technicianName}</p>
           </div>
           <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex justify-between items-center">
             <div>
               <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ubicación GPS</span>
               <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px]">{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Pendiente'}</p>
             </div>
           </div>
           <div className="p-4">
             <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fecha de Ejecución</span>
             <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
           </div>
        </div>

        <div className="p-6 md:p-10 space-y-12">
          {dynamicSections && dynamicSections.map((sec, sIdx) => (
            <div key={sIdx} className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-300 dark:border-slate-600 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest">{sec.title}</h3>
                 <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded">
                   {sec.points.length} Puntos
                 </span>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {sec.points && sec.points.map((p, pIdx) => {
                  const currentStatus = details[p]?.status;
                  const hasNote = details[p]?.note && details[p].note.trim() !== '';
                  const hasPhoto = details[p]?.photo;
                  
                  const isInventory = sec.isInventoryTable;
                  const itemName = isInventory ? p.split('|')[0]?.trim() : p;
                  const itemLocation = isInventory ? p.split('|')[1]?.trim() : null;

                  return (
                    <div key={pIdx} className="flex flex-col hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors relative group">
                      <button 
                        type="button" 
                        onClick={() => triggerRemovePoint(sIdx, pIdx, p)} 
                        className="absolute top-2 left-1 md:left-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Remover Fila"
                      >
                        <X size={14} />
                      </button>

                      <div className="flex flex-col lg:flex-row min-h-[60px] pl-6 md:pl-10">
                        <div className="flex-1 py-4 pr-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 flex flex-col justify-center">
                          {isInventory ? (
                            <div className="flex items-start gap-2">
                               <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{itemName}</span>
                               <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{itemLocation}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{itemName}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 p-3 shrink-0">
                          <button type="button" onClick={() => setDetails(prev => ({...prev, [p]: {...prev[p], status: 'optimo'}}))} className={`w-9 h-9 rounded flex items-center justify-center border transition-all ${currentStatus === 'optimo' ? 'bg-green-500 text-white border-green-500 scale-110' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-green-400 hover:text-green-500'}`}><CheckCircle2 size={16}/></button>
                          <button type="button" onClick={() => setDetails(prev => ({...prev, [p]: {...prev[p], status: 'advertencia'}}))} className={`w-9 h-9 rounded flex items-center justify-center border transition-all ${currentStatus === 'advertencia' ? 'bg-amber-500 text-white border-amber-500 scale-110' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-amber-400 hover:text-amber-500'}`}><AlertTriangle size={16}/></button>
                          <button type="button" onClick={() => setDetails(prev => ({...prev, [p]: {...prev[p], status: 'critico'}}))} className={`w-9 h-9 rounded flex items-center justify-center border transition-all ${currentStatus === 'critico' ? 'bg-red-500 text-white border-red-500 scale-110' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-red-400 hover:text-red-500'}`}><AlertOctagon size={16}/></button>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                          <button type="button" onClick={() => setActiveComments(prev => ({...prev, [p]: !prev[p]}))} className={`w-9 h-9 rounded flex items-center justify-center border transition-all ${hasNote ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500'}`}><MessageSquare size={14}/></button>
                          <label className={`w-9 h-9 rounded flex items-center justify-center border transition-all cursor-pointer ${hasPhoto ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-purple-400 hover:text-purple-500'}`}>
                            <Camera size={14}/>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files[0]; if(file){ setActivePoint(p); const reader = new FileReader(); reader.onload = (ev) => setImageToCrop(ev.target.result); reader.readAsDataURL(file); }}} />
                          </label>
                        </div>
                      </div>

                      {activeComments[p] && (
                        <div className="px-6 md:px-10 pb-4 pt-2 space-y-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                          <textarea 
                            rows="2" 
                            placeholder="Escribir observación técnica..." 
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200 resize-none"
                            value={details[p]?.note || ''} 
                            onChange={(e) => setDetails(prev => ({...prev, [p]: {...prev[p], note: e.target.value}}))} 
                          />
                          {hasPhoto && (
                            <div className="flex items-center gap-3">
                              <div className="relative group w-32 h-20 rounded border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
                                <img src={details[p].photo} alt="Evidencia" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setDetails(prev => { const n={...prev}; delete n[p].photo; return n;})} className="absolute inset-0 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => triggerAddPoint(sIdx, sec.isInventoryTable)}
                className="w-full py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Añadir Fila
              </button>
            </div>
          ))}

          {selectedIPM.hasVoltages && (
              <div className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden mb-10">
                  <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-300 dark:border-slate-600 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest">LECTURAS: 6 ARRANQUES MANUALES (VCD)</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest divide-x divide-slate-200 dark:divide-slate-700">
                     <div className="py-2 px-4 text-center">Nº Intento</div>
                     <div className="py-2 px-4 text-center">Voltaje Mínimo</div>
                     <div className="py-2 px-4 text-center">Voltaje Máximo</div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {voltages.map((v, i) => (
                        <div key={i} className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="py-3 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                              Prueba #{i+1}
                            </div>
                            <div className="py-2 px-2 flex items-center justify-center">
                              <input type="number" placeholder="0.0" className="w-24 text-center bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 pb-1" value={v.min} onChange={e => { const n=[...voltages]; n[i].min=e.target.value; setVoltages(n); }} />
                            </div>
                            <div className="py-2 px-2 flex items-center justify-center">
                              <input type="number" placeholder="0.0" className="w-24 text-center bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-blue-500 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 pb-1" value={v.max} onChange={e => { const n=[...voltages]; n[i].max=e.target.value; setVoltages(n); }} />
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          <div className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden mb-8">
            <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-300 dark:border-slate-600">
               <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest">DICTAMEN TÉCNICO Y OBSERVACIONES GENERALES</h3>
            </div>
            <textarea 
              className="w-full h-32 p-5 bg-white dark:bg-slate-900 font-bold text-sm outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-y" 
              placeholder="Describa el resumen de la visita, recomendaciones o notas finales para el cliente..." 
              value={generalObs} 
              onChange={e => setGeneralObs(e.target.value)} 
            />
          </div>

        </div>

        <div className="border-t-[3px] border-slate-800 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-6 md:p-10">
          <h3 className="text-center font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-12 text-sm">Validación y Firmas de Conformidad</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center w-full max-w-[320px] mx-auto">
              <input 
                 className="w-full bg-transparent border-b border-transparent focus:border-blue-400 text-center font-bold text-sm outline-none text-slate-800 dark:text-slate-200 mb-6 placeholder-slate-400 dark:placeholder-slate-500 transition-colors" 
                 placeholder="NOMBRE DEL RESPONSABLE" 
                 value={ownerName} 
                 onChange={(e) => setOwnerName(e.target.value)} 
              />
              <div 
                 onClick={() => setShowClientSigModal(true)} 
                 className="w-full h-28 border-b-2 border-slate-800 dark:border-slate-500 flex flex-col items-center justify-end cursor-pointer group pb-2 relative"
              >
                 {clientSigData ? (
                     <img src={clientSigData} alt="Firma Cliente" className="max-h-24 w-auto object-contain mb-2" />
                 ) : (
                     <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">Tocar para firmar</span>
                 )}
              </div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-3 text-center">Firma de Recibido y Conformidad</p>
            </div>

            <div className="flex flex-col items-center w-full max-w-[320px] mx-auto">
              <input 
                 className="w-full bg-transparent border-b border-transparent text-center font-bold text-sm outline-none text-slate-800 dark:text-slate-200 mb-6" 
                 disabled 
                 value={technicianName} 
              />
              <div 
                 onClick={() => setShowTechSigModal(true)} 
                 className="w-full h-28 border-b-2 border-slate-800 dark:border-slate-500 flex flex-col items-center justify-end cursor-pointer group pb-2 relative"
              >
                 {techSigData ? (
                     <img src={techSigData} alt="Firma Técnico" className="max-h-24 w-auto object-contain mb-2" />
                 ) : (
                     <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">Tocar para firmar</span>
                 )}
              </div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-3 text-center">Técnico Autorizado TLETL</p>
            </div>
          </div>
          
          <div className="mt-16 flex justify-center">
            <button onClick={handleSave} disabled={isSaving} className="w-full max-w-md py-4 bg-slate-900 dark:bg-white hover:bg-red-600 dark:hover:bg-red-600 text-white dark:text-slate-900 dark:hover:text-white rounded font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70 transition-colors shadow-lg active:scale-95">
              {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />} 
              Cerrar y Guardar Documento
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: AÑADIR PUNTO/DISPOSITIVO */}
      {customAddModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Añadir Fila</h3>
              </div>
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              {customAddModal.isInventory && (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Siglas (Ej: SMK, EXT)</label>
                  <input 
                    type="text" autoFocus
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase text-slate-800 dark:text-slate-200" 
                    value={customAddModal.tag} onChange={(e) => setCustomAddModal({ ...customAddModal, tag: e.target.value })} 
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
                  {customAddModal.isInventory ? 'Ubicación' : 'Descripción'}
                </label>
                <input 
                  type="text" autoFocus={!customAddModal.isInventory}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase text-slate-800 dark:text-slate-200" 
                  value={customAddModal.desc} onChange={(e) => setCustomAddModal({ ...customAddModal, desc: e.target.value })} 
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 flex gap-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setCustomAddModal({ ...customAddModal, isOpen: false })} className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={confirmAddPoint} className="flex-[2] py-3 bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors hover:bg-blue-700">Insertar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {customDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 text-center border border-slate-200 dark:border-slate-700">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 flex justify-center border-b border-red-100 dark:border-red-900/30">
              <AlertTriangle size={32} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-2">¿Eliminar Fila?</h3>
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-left">
                <p className="font-medium text-slate-700 dark:text-slate-300 text-sm leading-snug">{customDeleteModal.displayName}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 flex gap-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setCustomDeleteModal({ ...customDeleteModal, isOpen: false })} className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={confirmRemovePoint} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium text-sm transition-colors hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FIRMA CLIENTE FULLSCREEN */}
      {showClientSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4 mt-2">
             <div>
               <h3 className="text-white font-semibold text-base">Firma de Conformidad del Encargado</h3>
               <p className="text-slate-400 text-xs mt-0.5">{ownerName || 'Sin responsable capturado'}</p>
             </div>
             <button onClick={() => setShowClientSigModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded overflow-hidden relative shadow-inner">
             <div className="absolute top-1/2 left-10 right-10 border-b-2 border-slate-200 pointer-events-none"></div>
             <canvas ref={clientCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, clientCanvasRef)} onMouseMove={(e) => draw(e, clientCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, clientCanvasRef)} onTouchMove={(e) => draw(e, clientCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-4 mb-2">
             <button onClick={() => clearSignature(clientCanvasRef)} className="flex-1 py-4 bg-slate-800 border border-slate-700 text-white rounded-lg font-medium text-sm transition-colors hover:bg-slate-700">Limpiar</button>
             <button onClick={() => saveSignature(clientCanvasRef, setClientSigData, setShowClientSigModal)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors hover:bg-blue-500">Guardar Firma</button>
          </div>
        </div>
      )}

      {/* MODAL FIRMA TÉCNICO FULLSCREEN */}
      {showTechSigModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4 mt-2">
             <div>
               <h3 className="text-white font-semibold text-base">Firma del Técnico</h3>
               <p className="text-slate-400 text-xs mt-0.5">{technicianName}</p>
             </div>
             <button onClick={() => setShowTechSigModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded overflow-hidden relative shadow-inner">
             <div className="absolute top-1/2 left-10 right-10 border-b-2 border-slate-200 pointer-events-none"></div>
             <canvas ref={techCanvasRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair" onMouseDown={(e) => startDrawing(e, techCanvasRef)} onMouseMove={(e) => draw(e, techCanvasRef)} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => startDrawing(e, techCanvasRef)} onTouchMove={(e) => draw(e, techCanvasRef)} onTouchEnd={() => setIsDrawing(false)} />
          </div>
          <div className="flex gap-4 mt-4 mb-2">
             <button onClick={() => clearSignature(techCanvasRef)} className="flex-1 py-4 bg-slate-800 border border-slate-700 text-white rounded-lg font-medium text-sm transition-colors hover:bg-slate-700">Limpiar</button>
             <button onClick={() => saveSignature(techCanvasRef, setTechSigData, setShowTechSigModal)} className="flex-[2] py-4 bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors hover:bg-blue-500">Guardar Firma</button>
          </div>
        </div>
      )}
      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col p-4">
          <div className="relative flex-1 rounded overflow-hidden border border-slate-700"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={5/4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <button onClick={getCroppedImg} className="mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"><Scissors size={18} /> Recortar y Anexar Imagen</button>
        </div>
      )}
    </div>
  );
}