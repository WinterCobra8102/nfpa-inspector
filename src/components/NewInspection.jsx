import React, { useState, useCallback, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import SignatureCanvas from 'react-signature-canvas'; 
import toast from 'react-hot-toast'; 
import { supabase } from '../supabaseClient'; 
import { 
  Camera, MapPin, Save, RefreshCcw, ChevronRight, Scissors, 
  MessageSquare, Trash2, Droplets, Bell, Activity, Waves, 
  Zap, Clipboard, ArrowLeft, Home, User, Image as ImageIcon
} from 'lucide-react';
import { db } from '../db'; 

// --- CATÁLOGO MAESTRO CON PUNTOS EXACTOS DE TUS FORMATOS ---
const IPM_CATALOG = [
  { 
    id: 'IPM-01-D', 
    standard: 'NFPA 25',
    category: 'BOMBAS',
    name: 'BOMBA INCENDIO DIESEL (I-P-M)', 
    formCode: 'F-SER-014',
    icon: <Activity size={24} className="text-slate-300" />,
    color: '#ef4444',
    sections: [
      { type: 'I', title: "INSPECCIÓN Y MANTENIMIENTO", points: ["Válvulas normalmente abiertas", "Indicador de nivel de agua", "Tanque sin materiales extraños", "Válvula de llenado automático", "Indicador de nivel de combustible", "Interruptor aislador jockey", "Protección térmica jockey", "Interruptores suministro AC", "Interruptores suministro baterías", "Componentes internos controlador", "Celdas de baterías (electrolito)", "Limpieza de corrosión baterías", "Limpieza de filtros de agua", "Limpieza general cuarto bombas"] },
      { type: 'P', title: "PRUEBAS OPERATIVAS", points: ["Protecciones térmicas y fusibles", "Funcionamiento del cargador", "Temperatura de baterías", "Arranque automático (presión)", "Operación manual controlador"] }
    ],
    hasVoltages: true 
  },
  { 
    id: 'IPM-02', 
    standard: 'NFPA 25',
    category: 'GABINETES',
    name: 'GABINETES Y RACKS DE MANGUERAS', 
    formCode: 'F-SER-016',
    icon: <Waves size={24} className="text-slate-300" />,
    color: '#3b82f6',
    sections: [
      { type: 'I', title: "INSPECCIONES", points: ["Estado de gabinete/rack y bolsa", "Revisión de etiqueta mantenimiento", "Inspección estado de manguera", "Verificar buen estado chiflón", "Revisión de válvula", "Soportería en buen estado", "Manguera colocada correctamente", "Limpieza a gabinete ó rack"] },
      { type: 'M', title: "MANTENIMIENTO", points: ["Recorrido de dobleces de manguera"] }
    ]
  },
  { 
    id: 'IPM-03', 
    standard: 'NFPA 72',
    category: 'DETECCIÓN',
    name: 'SISTEMA DE ALARMA DE INCENDIO', 
    formCode: 'F-SER-019',
    icon: <Bell size={24} className="text-slate-300" />,
    color: '#f97316',
    sections: [
      { type: 'I', title: "INSPECCIONES GENERALES", points: ["Tablero de control operativo", "Dispositivos activación manual", "Detectores libres de daño/pintura", "Fuentes de poder auxiliares", "Baterías libres de corrosión"] },
      { type: 'P', title: "PRUEBAS DE FUNCIONAMIENTO", points: ["Modo prueba de luces tablero", "Prueba de estaciones manuales", "Prueba de detectores de humo", "Dispositivos notificación sonora", "Operar válvulas monitoreadas"] },
      { type: 'X', title: "PRUEBAS DE CARGA Y AC", points: ["Simular falla a tierra", "Simular falla suministro AC", "Verificar cargadores baterías", "Interrumpir AC carga máxima", "Alarma general 5 min (Baterías)"] }
    ]
  }
];

export default function NewInspection({ navigateTo }) { 
  const [step, setStep] = useState(1);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedIPM, setSelectedIPM] = useState(null);
  
  // ESTADOS DE DATOS
  const [details, setDetails] = useState({}); // { [punto]: { status, note, photo } }
  const [voltages, setVoltages] = useState(Array.from({ length: 6 }, () => ({ min: '', max: '' })));
  const [generalObs, setGeneralObs] = useState('');
  const [location, setLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const sigPad = useRef({}); 
  const [clientsDb, setClientsDb] = useState([]); 

  // RECORTADOR
  const [imageToCrop, setImageToCrop] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from('clientes').select('*').order('nombre');
      if (data) setClientsDb(data);
    };
    fetchClients();
  }, []);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const getCroppedImg = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image(); img.src = imageToCrop;
    await new Promise(r => img.onload = r);
    canvas.width = 1024; canvas.height = 768;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 1024, 768);
    const base64 = canvas.toDataURL('image/jpeg', 0.7);
    setDetails(prev => ({ ...prev, [activePoint]: { ...prev[activePoint], photo: base64 } }));
    setImageToCrop(null);
  };

  const captureGPS = () => {
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: `Coordenadas: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` });
      setIsCapturingGps(false);
      toast.success("GPS Ubicado");
    }, () => { setIsCapturingGps(false); toast.error("Error GPS"); });
  };

  // --- GENERACIÓN DE PDF PROFESIONAL ---
  const generatePDF = (signature) => {
    const doc = new jsPDF();
    const color = selectedIPM.color || '#ef4444';
    const client = clientsDb.find(c => c.id === selectedClient)?.nombre || 'S/N';

    // Header
    doc.setFillColor(color);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("TLETL FIRE SYSTEMS", 15, 20);
    doc.setFontSize(10);
    doc.text(`REPORTE: ${selectedIPM.name} | COD: ${selectedIPM.formCode}`, 15, 30);

    // Datos Generales
    doc.setTextColor(40);
    doc.text(`CLIENTE: ${client}`, 15, 50);
    doc.text(`ATENCIÓN: ${ownerName}`, 15, 56);
    doc.text(`UBICACIÓN: ${location?.address || 'No capturada'}`, 15, 62);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 150, 50);

    // Tabla de Inspección
    const rows = [];
    selectedIPM.sections.forEach(sec => {
      sec.points.forEach(p => {
        const d = details[p] || {};
        rows.push([p, d.status?.toUpperCase() || 'PTE', d.note || '-']);
      });
    });

    autoTable(doc, {
      startY: 70,
      head: [['PUNTO DE REVISIÓN', 'ESTADO', 'NOTAS']],
      body: rows,
      headStyles: { fillColor: color }
    });

    // Tabla de Voltajes (Si aplica)
    if (selectedIPM.hasVoltages) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['ARRANQUE', 'V. MÍNIMO (PRUEBA)', 'V. MÁXIMO (POST)']],
        body: voltages.map((v, i) => [i + 1, v.min || '-', v.max || '-']),
        headStyles: { fillColor: color }
      });
    }

    // Observaciones Generales
    let nextY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text("OBSERVACIONES GENERALES:", 15, nextY);
    doc.setFontSize(9);
    doc.text(generalObs || "Sin observaciones adicionales.", 15, nextY + 7, { maxWidth: 180 });

    // Galería de Evidencias
    let y = nextY + 25;
    Object.entries(details).forEach(([key, val]) => {
      if (val.photo) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.addImage(val.photo, 'JPEG', 15, y, 60, 45);
        doc.setFontSize(7);
        doc.text(key.substring(0, 45), 80, y + 10);
        y += 50;
      }
    });

    // Firma
    const sigY = doc.internal.pageSize.getHeight() - 50;
    doc.addImage(signature, 'PNG', 130, sigY - 25, 50, 25);
    doc.text("FIRMA DE CONFORMIDAD", 130, sigY + 5);
    doc.save(`TLETL_${selectedIPM.id}_${Date.now()}.pdf`);
  };

  const handleSave = async () => {
    if (!selectedClient || !ownerName || sigPad.current.isEmpty()) {
      toast.error("⚠️ Datos incompletos o falta firma."); return;
    }
    setIsSaving(true);
    const signature = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    try {
      await db.inspections.add({ 
        id: crypto.randomUUID(), clientId: selectedClient, ownerName, 
        equipmentName: selectedIPM.name, details, voltages, location, signature, 
        generalObs, date: new Date().toISOString() 
      });
      generatePDF(signature);
      toast.success("REPORTE GUARDADO EXITOSAMENTE");
      navigateTo('home');
    } catch (e) { toast.error("Error al guardar localmente."); }
    finally { setIsSaving(false); }
  };

  // --- INTERFAZ ---

  if (step === 1) return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
        <label className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2"><User size={14}/> Sucursal de Inspección</label>
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-red-500 outline-none">
          <option value="">-- Seleccionar Empresa --</option>
          {clientsDb.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div className={`grid gap-4 ${!selectedClient ? 'opacity-30 pointer-events-none' : ''}`}>
        {['NFPA 25', 'NFPA 72'].map(id => (
          <button key={id} onClick={() => { setSelectedStandard(id); setStep(2); }} className="flex justify-between items-center p-8 bg-white border rounded-[2.5rem] hover:border-red-600 transition-all shadow-xl group">
             <div className="flex items-center gap-6">{id === 'NFPA 25' ? <Droplets className="text-blue-500" size={32}/> : <Bell className="text-red-500" size={32}/>}<h3 className="font-black text-2xl text-slate-700">{id}</h3></div>
             <ChevronRight className="group-hover:translate-x-2 transition-transform text-slate-300"/>
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 2) {
    const services = IPM_CATALOG.filter(item => item.standard.includes(selectedStandard));
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-8 animate-in slide-in-from-right">
        <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600"><ArrowLeft size={14}/> Volver</button>
        <h2 className="text-3xl font-black text-slate-800 border-l-8 border-red-600 pl-4 uppercase">Servicios {selectedStandard}</h2>
        <div className="grid gap-3">
          {services.map(item => (
            <button key={item.id} onClick={() => { setSelectedIPM(item); setStep(3); }} className="bg-white p-6 rounded-[2rem] shadow-sm border flex items-center justify-between hover:border-red-500 transition-all group">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-red-50 transition-colors">{item.icon}</div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-slate-300 uppercase">{item.id}</p>
                  <h3 className="font-bold text-slate-700 uppercase text-sm">{item.name}</h3>
                </div>
              </div>
              <ChevronRight className="text-slate-200" size={20} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedIPM) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 animate-in fade-in">
      <div className="flex justify-between items-center px-2">
        <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 hover:text-red-600"><ArrowLeft size={14}/> Catálogo</button>
        <button onClick={() => navigateTo('home')} className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 hover:text-red-600"><Home size={14}/> Salir</button>
      </div>

      <div className={`${selectedIPM.color === '#ef4444' ? 'bg-red-600' : 'bg-slate-900'} p-10 rounded-[3rem] text-white shadow-2xl`}>
        <span className="text-[10px] font-black opacity-60 uppercase">{selectedIPM.standard}</span>
        <h2 className="text-3xl font-black uppercase tracking-tighter mt-1">{selectedIPM.name}</h2>
      </div>

      {selectedIPM.sections.map((section, sIdx) => (
        <div key={sIdx} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6 mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3">{section.title}</p>
          {section.points.map((p, pIdx) => (
            <div key={pIdx} className="border-b border-slate-50 pb-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <span className="text-xs font-bold text-slate-700 flex-1">{p}</span>
                <div className="flex gap-2">
                  {['bien', 'na', 'falla'].map(s => (
                    <button key={s} onClick={() => setDetails(prev => ({...prev, [p]: {...prev[p], status: s}}))} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${details[p]?.status === s ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{s === 'bien' ? 'OK' : s === 'na' ? 'N/A' : 'X'}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border">
                  <MessageSquare size={14} className="text-slate-300" /><input className="w-full bg-transparent text-[11px] font-bold outline-none" placeholder="Nota del punto..." value={details[p]?.note || ''} onChange={e => setDetails(prev => ({...prev, [p]: {...prev[p], note: e.target.value}}))} />
                </div>
                <label className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 border-dotted cursor-pointer transition-all ${details[p]?.photo ? 'bg-green-50 border-green-500 text-green-600' : 'text-slate-400'}`}>
                  {details[p]?.photo ? <ImageIcon size={24}/> : <Camera size={24}/>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const r = new FileReader(); r.onload = () => { setImageToCrop(r.result); setActivePoint(p); }; r.readAsDataURL(e.target.files[0]); }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      ))}

      {selectedIPM.hasVoltages && (
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">6 ARRANQUES MANUALES (BATERÍAS 1 Y 2)</p>
              <div className="grid grid-cols-3 gap-4 font-black text-[9px] text-slate-400 text-center uppercase"><span>Arranque</span><span>V. Mínimo</span><span>V. Máximo</span></div>
              {voltages.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 items-center">
                      <span className="text-center font-bold text-xs">{i+1}º Prueba</span>
                      <input type="number" placeholder="V" className="p-3 bg-slate-50 border rounded-xl text-center text-xs font-bold" value={v.min} onChange={e => { const n=[...voltages]; n[i].min=e.target.value; setVoltages(n); }} />
                      <input type="number" placeholder="V" className="p-3 bg-slate-50 border rounded-xl text-center text-xs font-bold" value={v.max} onChange={e => { const n=[...voltages]; n[i].max=e.target.value; setVoltages(n); }} />
                  </div>
              ))}
          </div>
      )}

      <button onClick={captureGPS} className={`w-full p-8 rounded-[2.5rem] border-4 border-dotted flex flex-col items-center gap-2 ${location ? 'border-green-500 bg-green-50 text-green-600' : 'bg-white text-slate-400 shadow-xl'}`}>
         {isCapturingGps ? <RefreshCcw className="animate-spin" /> : <MapPin size={32} />}
         <span className="font-black text-[10px] uppercase">{location ? location.address : "CAPTURA UBICACIÓN GPS"}</span>
      </button>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><FileText size={16}/> Comentario General Final</label>
        <textarea className="w-full h-32 p-4 bg-slate-50 border rounded-3xl font-bold text-sm outline-none focus:border-red-500" value={generalObs} onChange={e => setGeneralObs(e.target.value)} />
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 border-4 border-red-600 shadow-2xl">
        <input className="w-full bg-white/5 border-b-2 border-white/20 p-4 font-bold outline-none focus:border-red-500 text-white" placeholder="Nombre de quien recibe..." value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <div className="bg-white rounded-3xl h-48 border-4 border-slate-800 overflow-hidden"><SignatureCanvas ref={sigPad} penColor='black' canvasProps={{className: 'signature-canvas w-full h-full'}} /></div>
        <button onClick={() => sigPad.current.clear()} className="text-[10px] font-black text-red-500 uppercase w-full">Limpiar Firma</button>
      </div>

      <button onClick={handleSave} disabled={isSaving} className="w-full py-8 bg-red-600 text-white rounded-[3.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
        {isSaving ? <RefreshCcw className="animate-spin" /> : <Save />} FINALIZAR REPORTE
      </button>

      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col p-4">
          <div className="relative flex-1"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={4/3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <button onClick={getCroppedImg} className="mt-4 p-6 bg-red-600 text-white rounded-full font-black flex items-center justify-center gap-2 shadow-2xl uppercase tracking-widest"><Scissors /> RECORTAR Y ADJUNTAR</button>
        </div>
      )}
    </div>
  );
}