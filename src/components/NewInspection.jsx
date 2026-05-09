import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Cropper from 'react-easy-crop';
import { 
  Camera, MapPin, Save, RefreshCcw, 
  ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle, 
  X, Check, ClipboardList, Scissors, MessageSquare, PlusCircle, Trash2,
  AlertOctagon, ShieldAlert, Zap, Info
} from 'lucide-react';
import { db } from '../db'; 

// --- CATÁLOGO TLETL COMPLETO Y DETALLADO ---
const IPM_CATALOG = [
  { 
    id: 'IPM-01', 
    name: 'SERVICIO MENSUAL A BOMBA DIESEL', 
    formCode: 'F-SER-014',
    multiUnit: false,
    sections: [
      {
        title: "INSPECCIÓN Y MANTENIMIENTO",
        points: [
          "Ejercitar válvulas normalmente abiertas del cuarto de bombas (Cerrar 1/4 de vuelta al final)",
          "Ejercitar y verificar indicador de nivel del tanque de agua (Libre movimiento)",
          "Tanque de agua libre de materiales extraños o desechos en superficie",
          "Operar manualmente válvula de llenado automático del tanque de agua",
          "Ejercitar y verificar indicador de nivel del tanque de combustible (Libre movimiento)",
          "Probar el interruptor aislador del controlador jockey",
          "Activar protección térmica del controlador jockey utilizando el medio de prueba",
          "Ejercitar interruptores de suministro AC del controlador diesel",
          "Ejercitar interruptores de baterías del controlador diesel",
          "Inspeccionar componentes internos del controlador diesel (Sin daño físico)",
          "Rellenar con agua destilada celdas de baterías con bajo electrolito",
          "Retirar corrosión de la batería y limpiar carcasa",
          "Limpieza de filtros de la línea de suministro de agua del intercambiador",
          "Realizar limpieza general del cuarto de bombas"
        ]
      },
      {
        title: "PRUEBAS",
        points: [
          "Protecciones térmicas, disyuntores y fusibles operaron correctamente",
          "Verificar que el cargador está trabajando correctamente",
          "Verificar que las baterías no sufren de temperatura excesiva"
        ]
      }
    ]
  },
  { 
    id: 'IPM-02', 
    name: 'SERVICIO A SISTEMA DE GABINETES Y RACKS DE MANGUERAS', 
    formCode: 'F-SER-016', 
    multiUnit: false,
    sections: [
      { 
        title: "INSPECCIÓN", 
        points: [
          "Estado de gabinete ó rack y bolsa de manguera", 
          "Revisión de etiqueta de mantenimiento", 
          "Inspección del estado de la manguera",
          "Verificar buen estado del chiflón",
          "Revision de válvula",
          "Soportería en buen estado",
          "Manguera colocada correctamente"
        ] 
      },
      {
        title: "MANTENIMIENTO",
        points: [
          "Servicio de limpieza a gabinete ó rack y bolsa de manguera",
          "Recorrido de dobleces de manguera"
        ]
      }
    ] 
  },
  { 
    id: 'IPM-03', 
    name: 'SERVICIO A SISTEMAS DE ALARMAS', 
    formCode: 'F-SER-019', 
    multiUnit: false,
    sections: [
      {
        title: "SECCIÓN 1: INSPECCIONES", 
        points: [
          "Tablero de control en buen estado and operativo. Indica funcionamiento 'Normal'",
          "Dispositivos de activación manual operativos, en condiciones físicas adecuadas y libres de obstrucciones",
          "Detectores de incendio operativos, libres de daño físico y pintura, a min. 3 pies de ventilas",
          "Fuentes de poder auxiliares del sistema operativas e indicando funcionamiento 'Normal'",
          "Anunciadores remotos del sistema operativos, indicando funcionamiento 'Normal'",
          "Amplificadores del sistema operativos, indicando funcionamiento 'Normal'",
          "Baterías de respaldo del sistema libres de daño físico, corrosión o escurrimiento"
        ]
      },
      {
        title: "SECCIÓN 2: PRUEBAS Y MANTENIMIENTO", 
        points: [
          "Revisar el historial del tablero de control y analizar su información para diagnóstico",
          "Medir los voltajes de suministro principal (AC) y baterías de respaldo del sistema",
          "Dispositivos de notificación, salida (módulos) y monitoreo en condiciones físicas adecuadas",
          "Confirmar con el cliente que se ha notificado a los ocupantes sobre pruebas",
          "Activar el modo de prueba de luces del tablero de control (si aplica)",
          "Activar todas las estaciones manuales y verificar recepción de señal en tablero",
          "Activar un detector de humo. Confirmar funcionamiento y mensaje correcto en tablero",
          "Activar dispositivos de notificación. Verificar que funcionen correctamente",
          "Operar válvulas monitoreadas y verificar señal en tablero (Primeras 2 vueltas)",
          "Servicio de limpieza a tablero de control, fuentes, anunciadores y estaciones manuales"
        ]
      },
      {
        title: "SECCIÓN 3: ANUAL", 
        points: [
          "Inspeccionar instalaciones y verificar que no han realizado modificaciones al edificio",
          "Verificar los fusibles, cableado y conexiones del sistema en buen estado",
          "Simular la condición de falla a tierra en el sistema y verificar notificación",
          "Simular falla de suministro principal AC y baterías y verificar notificación de problema",
          "Verificar que los cargadores de baterías se encuentran operativos",
          "Activar TODOS los dispositivos de entrada (manuales, detectores, monitoreo)",
          "Interrumpir suministro AC en carga máxima y verificar correcta operación",
          "Activar alarma general sin suministro AC por 5 min (15 min en voceo)",
          "Servicio de limpieza técnica a los detectores del sistema",
          "Reemplazar baterías de respaldo del tablero, fuentes auxiliares y amplificadores",
          "Restablecer el sistema de alarma de incendios y verificar condición final"
        ]
      }
    ]
  },
  { 
    id: 'IPM-04', 
    name: 'SERVICIO A HIDRANTES', 
    formCode: 'F-SER-039', 
    multiUnit: true, 
    sections: [
      {
        title: "SECCIÓN 1: INSPECCIONES", 
        points: [
          "El hidrante tiene libre acceso y suficiente espacio para colocar mangueras",
          "Las tapas giran libremente",
          "Verificar que el barril del hidrante este libre de agua o hielo",
          "Estado físico del hidrante",
          "Desgaste de roscas en conectores de descarga y tapas",
          "Estado físico de tuerca de la válvula",
          "Empaques y empaquetaduras en buen estado",
          "Disponibilidad de la llave del hidrante"
        ]
      },
      {
        title: "SECCIÓN 2: PRUEBA Y MANTENIMIENTO", 
        points: [
          "Inspeccionar el equipo de bombeo contra incendios y confirmar condiciones adecuadas",
          "Asegurar que la prueba se pueda llevar a cabo de manera segura",
          "Lubricar vástago de la válvula, tapa, conexiones y roscas del hidrante",
          "Abrir válvula al 100% y dejar fluir agua 1 min hasta que salga clara",
          "Cerrar 100% la válvula lentamente para evitar golpe de ariete",
          "Comprobar que el drenaje del barril funciona (Máximo 60 minutos)"
        ]
      },
      {
        title: "SECCIÓN 3: SERVICIO CORRECTIVO", 
        points: [
          "Instalar válvula en salida y presurizar 5 min (2-3 vueltas)",
          "Confirmar ausencia de presión tras cierre lento y regreso de 1/4 de vuelta",
          "El hidrante está en condiciones para operar en situación de emergencia"
        ]
      }
    ]
  },
  { 
    id: 'IPM-05', 
    name: 'SERVICIO A VÁLVULAS DE CONTROL', 
    formCode: 'F-SER-041', 
    multiUnit: true, 
    sections: [
      {
        title: "SECCIÓN 1: INSPECCIÓN",
        points: [
          "La válvula se encuentra operativa y libre de daño físico visible",
          "La válvula está accesible y libre de obstrucciones",
          "La válvula está equipada con la correspondiente llave para manipulación",
          "La válvula cuenta con candado y/o se encuentra supervisada",
          "Verificar el estado correcto de la válvula (abierta o cerrada)",
          "La válvula cuenta con placa de identificación del sistema que controla"
        ]
      },
      {
        title: "SECCIÓN 2: PRUEBA",
        points: [
          "Ejercitar cerrando y abriendo 3 vueltas las válvulas normalmente abiertas"
        ]
      },
      {
        title: "SECCIÓN 3: INSPECCIÓN",
        points: [
          "El interruptor de supervisión de la válvula esta libre de daño físico"
        ]
      },
      {
        title: "SECCIÓN 4: MANTENIMIENTO Y PRUEBA",
        points: [
          "Lubricar válvulas (sólo si están accesibles)",
          "Cierre total: Indique el número de vueltas requeridas",
          "Apertura total: Indique número de vueltas y cierre 1/4 de vuelta al final"
        ]
      }
    ]
  },
  { 
    id: 'IPM-06', 
    name: 'SERVICIO A SISTEMAS DE ROCIADORES', 
    formCode: 'F-SER-021', 
    multiUnit: true, 
    sections: [
      {
        title: "INSPECCIONES",
        points: [
          "1. Condición del Sistema (Verificar operativo)",
          "2. Presión de Suministro del riser (Anotar valor PSI)",
          "3. Presión en Sistema agua o aire (Anotar valor PSI)",
          "4. Válvula de Alarma (Fugas y daño físico)",
          "5. Válvula de Acción Previa (Fugas y daño físico)",
          "6. Válvulas y Trim (Buen estado y posición correcta)",
          "7. Placa de Identificación del Riser (Datos presentes)",
          "8. Conexión con Bomberos (Sin obstrucción ni daño)",
          "9. Válvula de seccionamiento enclavada o supervisada",
          "10. Dispositivo de Alarma y conexiones (Libres de daño)",
          "11. Acopio de Rociadores (Tipos y repuestos OK)"
        ]
      },
      {
        title: "PRUEBAS DE CAUDAL",
        points: [
          "Bajar presión por DREN PRINCIPAL (Anotar arranque bomba)",
          "Bomba operando: Abrir DREN 100% (Presión caudal PSI)",
          "Bomba operando: Cerrar DREN 100% (Presión estática PSI)"
        ]
      }
    ]
  },
  { 
    id: 'IPM-07', 
    name: 'REPORTES DE OBSERVACIONES TÉCNICAS', 
    formCode: 'F-SER-045', 
    isObservations: true, 
    multiUnit: false,
    sections: [] 
  },
  { 
    id: 'IPM-08', 
    name: 'SERVICIO SEMANAL A BOMBA DIESEL', 
    formCode: 'F-SER-015', 
    multiUnit: false, 
    sections: [
      {
        title: "INSPECCIÓN Y MANTENIMIENTO (GENERAL)",
        points: ["Equipos de bombeo operativos", "Medios de circulación de agua para pruebas", "Ventilación adecuada en cuarto de bombas", "Drenar materiales y agua de tanque combustible", "Equipo, tuberías y mangueras sin daños", "Controlador jockey en AUTOMÁTICO", "Controlador principal en AUTOMÁTICO", "Válvulas supervisadas", "Sin alarmas activas", "Válvulas identificadas y accesibles", "Almacenamiento de agua sin daños", "Medidor de nivel operativo", "Área libre de inflamables", "Baterías y precalentador OK"]
      },
      {
        title: "VERIFICACIÓN DE VÁLVULAS ABIERTAS",
        points: ["Succión bomba incendio", "Descarga bomba incendio", "Succión bomba jockey", "Descarga bomba jockey", "Suministro combustible", "Enfriamiento motor", "Posición correcta válvulas restantes"]
      },
      {
        title: "MEDICIONES Y PRUEBAS",
        points: ["Arranque AUTOMÁTICO (30 seg caída presión)", "Arranque MANUAL (Cranks 1 y 2)", "Protección sobrevelocidad (67%)", "Válvula solenoide enfriamiento", "Goteo prensaestopas (1 gota/seg)", "Marcha modo prueba 30 min", "Lecturas presión y temperatura en operación"]
      }
    ] 
  },
];

export default function NewInspection() {
  const [step, setStep] = useState(1);
  const [selectedIPM, setSelectedIPM] = useState(null);
  const [responses, setResponses] = useState({});
  const [pointNotes, setPointNotes] = useState({});
  const [units, setUnits] = useState(['Unidad 1']); 
  const [voltages, setVoltages] = useState(Array.from({ length: 6 }, () => ({ min: '', max: '' })));
  const [observations, setObservations] = useState('');
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  const [obsCards, setObsCards] = useState([
    { area: '', sistema: '', equipo: '', estado: 'ACTIVO', cot: 'NO', observacion: '', impacto: '', accion: '', nfpa: 'DNC', formato: '' }
  ]);

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

    remainingUnitsRaw.forEach((oldName, index) => {
      const newName = newUnits[index];
      if (oldName !== newName) {
        Object.keys(newResponses).forEach(key => {
          if (key.startsWith(`${oldName}-`)) {
            const suffix = key.replace(`${oldName}-`, '');
            newResponses[`${newName}-${suffix}`] = newResponses[key];
            delete newResponses[key];
          }
        });
        Object.keys(newPointNotes).forEach(key => {
          if (key.startsWith(`${oldName}-`)) {
            const suffix = key.replace(`${oldName}-`, '');
            newPointNotes[`${newName}-${suffix}`] = newPointNotes[key];
            delete newPointNotes[key];
          }
        });
      }
    });
    setUnits(newUnits);
    setResponses(newResponses);
    setPointNotes(newPointNotes);
  };

  const captureGPS = () => {
    setIsCapturingGps(true);
    const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        setLocation({ lat: latitude, lng: longitude, address: data.display_name });
      } catch {
        setLocation({ lat: latitude, lng: longitude, address: `${latitude}, ${longitude}` });
      } finally { setIsCapturingGps(false); }
    }, () => { alert("Error de GPS."); setIsCapturingGps(false); }, geoOptions);
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

  // Función PDF disponible para uso interno si se requiere en el futuro
  const handleGeneratePDF = async (data) => {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = 210;

    doc.setFillColor(30, 30, 30); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("TLETL - PROTECCIÓN CONTRA INCENDIOS", margin, 20);
    doc.setFontSize(10);
    doc.text(`SERVICIO: ${data.serviceCode} - ${data.equipmentName}`, margin, 30);
    doc.text(`FECHA: ${new Date(data.date).toLocaleDateString()}`, margin, 36);

    let currentY = 45;

    if (data.serviceCode === 'IPM-07') {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, 182, 35, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("NFPA-25 DEFINICIONES GENERALES", margin + 5, currentY + 7);
      doc.setFontSize(7);
      doc.text("DNC: Deficiencia No Crítica. Requiere corrección normativa.", margin + 5, currentY + 15);
      doc.text("DC: Deficiencia Crítica. Puede afectar el funcionamiento previsto.", margin + 5, currentY + 22);
      doc.text("D: Desactivación. Sistema o unidad fuera de servicio.", margin + 5, currentY + 29);
      currentY += 45;

      data.obsCards.forEach((card, idx) => {
        autoTable(doc, {
          startY: currentY,
          head: [[`HALLAZGO TÉCNICO #${idx + 1}`, 'DETALLE']],
          body: [
            ['ÁREA / SISTEMA', `${card.area} / ${card.sistema}`],
            ['EQUIPO', card.equipo], ['ESTADO', card.estado],
            ['COTIZAR', card.cot], ['REF', card.formato],
            ['HALLAZGO', card.observacion], ['IMPACTO', card.impacto],
            ['ACCIÓN', card.accion], ['NFPA', card.nfpa]
          ],
          theme: 'grid',
          headStyles: { fillColor: card.nfpa === 'D' ? [200, 0, 0] : card.nfpa === 'DC' ? [255, 120, 0] : [200, 180, 0] },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
        });
        currentY = doc.lastAutoTable.finalY + 10;
        if (currentY > 260) { doc.addPage(); currentY = 20; }
      });
    } else {
      const mapsUrl = data.location?.lat ? `https://www.google.com/maps?q=${data.location.lat},${data.location.lng}` : null;
      autoTable(doc, {
        startY: currentY,
        head: [['ESPECIFICACIÓN', 'DETALLE']],
        body: [
          ['CÓDIGO DE FORMATO', data.norm],
          ['UBICACIÓN GPS', data.location?.address || 'No capturada'],
          ['ESTATUS GLOBAL', data.overallStatus],
          ['MAPS INTERACTIVO', mapsUrl ? 'VER UBICACIÓN EN MAPAS' : 'N/A']
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        didDrawCell: (c) => { if (c.cell.raw === 'VER UBICACIÓN EN MAPAS') doc.link(c.cell.x, c.cell.y, c.cell.width, c.cell.height, { url: mapsUrl }); }
      });
      currentY = doc.lastAutoTable.finalY + 10;

      data.units.forEach((unitName) => {
        if (selectedIPM.multiUnit) { 
          doc.setFontSize(12); doc.setTextColor(180, 0, 0); 
          doc.text(`INSPECCIÓN: ${unitName.toUpperCase()}`, margin, currentY); currentY += 5; 
        }
        data.sections.forEach(section => {
          const body = section.points.map((p, i) => {
            const rKey = selectedIPM.multiUnit ? `${unitName}-${section.title}-${i}` : `${section.title}-${i}`;
            return [p, data.responses[rKey] === 'bien' ? 'OK' : data.responses[rKey] === 'falla' ? 'X' : 'N/A', data.pointNotes[rKey] || ''];
          });
          autoTable(doc, {
            startY: currentY,
            head: [[section.title, 'ESTADO', 'OBSERVACIÓN']],
            body,
            headStyles: { fillColor: [180, 0, 0] },
            columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { cellWidth: 50, fontSize: 8 } },
            didParseCell: (cellData) => {
              if (cellData.section === 'body' && cellData.column.index === 1) {
                if (cellData.cell.raw === 'OK') cellData.cell.styles.textColor = [0, 150, 0];
                if (cellData.cell.raw === 'X') cellData.cell.styles.textColor = [180, 0, 0];
              }
            }
          });
          currentY = doc.lastAutoTable.finalY + 10;
          if (currentY > 250) { doc.addPage(); currentY = 20; }
        });
      });
    }

    if (data.serviceCode === "IPM-01" && data.voltages) {
      if (currentY > 200) doc.addPage();
      autoTable(doc, {
        startY: (currentY || 20) + 5,
        head: [['# ARRANQUE', 'MÍNIMO V', 'MÁXIMO V']],
        body: data.voltages.map((v, i) => [`${i+1}`, `${v.min}V`, `${v.max}V`]),
        theme: 'striped', headStyles: { fillColor: [180, 0, 0] }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    autoTable(doc, { startY: currentY, head: [['COMENTARIOS TÉCNICOS GENERALES']], body: [[data.observations || 'Sin notas adicionales.']], headStyles: { fillColor: [60, 60, 60] } });
    if (data.photo) { doc.addPage(); doc.text("EVIDENCIA FOTOGRÁFICA:", margin, 20); doc.addImage(data.photo, 'JPEG', margin, 30, 180, 135); }
    doc.save(`TLETL_${data.serviceCode}_${Date.now()}.pdf`);
  };

  // --- LÓGICA DE GUARDADO DEFINITIVA (SIN DUPLICADOS) ---
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    // CORRECCIÓN: Generar ID único manual para evitar colisiones entre el cel y la nube
    const uniqueId = crypto.randomUUID();

    const reportData = {
      id: uniqueId, // Mandamos nuestro propio ID
      date: new Date().toISOString(),
      serviceCode: selectedIPM.id,
      equipmentName: selectedIPM.name,
      norm: selectedIPM.formCode,
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
      // 1. Guardar en Dexie
      await db.inspections.add(reportData); 
      
      // CORRECCIÓN: Eliminamos la descarga automática.
      // Si el usuario quiere el PDF, lo descarga desde el Historial.
      
      alert("✅ Reporte Guardado en el Dispositivo.\n\nSincroniza en el historial para subirlo a la nube."); 
      
      // 2. Reseteo manual (REEMPLAZA AL RELOAD)
      setStep(1); 
      setSelectedIPM(null);
      setResponses({});
      setPointNotes({});
      setObservations('');
      setPhoto(null);
      setLocation(null);

    } catch (e) { 
      alert("Error: " + e.message); 
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 animate-in fade-in">
        <h2 className="text-2xl font-black text-slate-800 border-b-8 border-red-600 inline-block uppercase">TLETL - SERVICIOS IPM</h2>
        <div className="grid gap-3 pt-4">
          {IPM_CATALOG.map(item => (
            <button key={item.id} onClick={() => { 
              setSelectedIPM(item); 
              let label = 'Unidad';
              if (item.id === 'IPM-04') label = 'Hidrante';
              if (item.id === 'IPM-05') label = 'Válvula';
              if (item.id === 'IPM-06') label = 'Sistema';
              setUnits(item.multiUnit ? [`${label} 1`] : ['Servicio Único']);
              setStep(2); 
            }} className="flex items-center justify-between p-6 bg-white border-2 rounded-[2rem] hover:border-red-600 transition-all group shadow-sm">
              <div className="text-left">
                <span className={`text-[10px] font-black uppercase tracking-widest ${item.isObservations ? 'text-orange-500' : 'text-red-600'}`}>{item.id}</span>
                <h3 className="font-bold text-slate-700">{item.name}</h3>
              </div>
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 animate-in fade-in">
      <div className={`${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden`}>
        <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase mb-4 block hover:underline">← Volver al Menú</button>
        <div className="flex items-center gap-3">
          {selectedIPM.isObservations ? <AlertOctagon size={24} className="text-orange-400" /> : <ShieldAlert size={24} />}
          <h2 className="text-2xl font-black uppercase mt-1">{selectedIPM.name}</h2>
        </div>
      </div>

      {selectedIPM.isObservations ? (
        <div className="space-y-6">
          <div className="bg-orange-50 p-4 rounded-[1.5rem] border-2 border-orange-200 border-dashed flex items-center gap-3">
            <Info className="text-orange-500" />
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Protocolo de Hallazgos Críticos NFPA-25</p>
          </div>

          {obsCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-xl animate-in slide-in-from-bottom">
              <div className={`p-4 flex justify-between items-center ${card.nfpa === 'D' ? 'bg-red-600' : card.nfpa === 'DC' ? 'bg-orange-500' : 'bg-yellow-400'} text-white`}>
                <span className="font-black text-xs uppercase tracking-widest">OBSERVACIÓN TÉCNICA #{idx + 1}</span>
                <button onClick={() => setObsCards(obsCards.filter((_, i) => i !== idx))}><Trash2 size={18}/></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Área</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.area} onChange={e => { const n = [...obsCards]; n[idx].area = e.target.value; setObsCards(n); }} /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Sistema</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.sistema} onChange={e => { const n = [...obsCards]; n[idx].sistema = e.target.value; setObsCards(n); }} /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Equipo</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.equipo} onChange={e => { const n = [...obsCards]; n[idx].equipo = e.target.value; setObsCards(n); }} /></div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Estado</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.estado} onChange={e => { const n = [...obsCards]; n[idx].estado = e.target.value; setObsCards(n); }}><option value="ACTIVO">ACTIVO</option><option value="CERRADO">CERRADO</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Cotizar</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.cot} onChange={e => { const n = [...obsCards]; n[idx].cot = e.target.value; setObsCards(n); }}><option value="SI">SI</option><option value="NO">NO</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Gravedad</label><select className="w-full p-3 bg-slate-50 rounded-xl border font-black text-[10px]" value={card.nfpa} onChange={e => { const n = [...obsCards]; n[idx].nfpa = e.target.value; setObsCards(n); }}><option value="DNC">DNC (Baja)</option><option value="DC">DC (Media)</option><option value="D">D (Crítica)</option></select></div>
                  </div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Ref. Formato</label><input className="w-full p-3 bg-slate-50 rounded-xl border font-bold text-xs" value={card.formato} placeholder="Ej: F-SER-014" onChange={e => { const n = [...obsCards]; n[idx].formato = e.target.value; setObsCards(n); }} /></div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Observación Técnica</label><textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" value={card.observacion} onChange={e => { const n = [...obsCards]; n[idx].observacion = e.target.value; setObsCards(n); }} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Impacto</label><textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" value={card.impacto} onChange={e => { const n = [...obsCards]; n[idx].impacto = e.target.value; setObsCards(n); }} /></div>
                    <div><label className="text-[9px] font-black text-slate-400 uppercase">Acción Correctiva</label><textarea className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold text-xs h-20" value={card.accion} onChange={e => { const n = [...obsCards]; n[idx].accion = e.target.value; setObsCards(n); }} /></div>
                  </div>
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
              <button onClick={() => { let label = 'Unidad'; if (selectedIPM.id === 'IPM-04') label = 'Hidrante'; if (selectedIPM.id === 'IPM-05') label = 'Válvula'; if (selectedIPM.id === 'IPM-06') label = 'Sistema'; setUnits([...units, `${label} ${units.length + 1}`]); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><PlusCircle size={14}/> AGREGAR UNIDAD</button>
            </div>
          )}

          {units.map((unitName, uIdx) => (
            <div key={uIdx} className={`space-y-4 ${selectedIPM.multiUnit ? 'border-l-4 border-blue-500 pl-4 py-2 mb-6' : ''}`}>
              {selectedIPM.multiUnit && (
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-blue-600 uppercase text-xs">{unitName}</h4>
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
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border"><MessageSquare size={14} className="text-slate-300" /><input className="w-full bg-transparent text-[10px] font-bold outline-none" placeholder="Nota técnica / Valor..." value={pointNotes[rKey] || ''} onChange={e => setPointNotes({...pointNotes, [rKey]: e.target.value})} /></div>
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
          <h3 className="text-xs font-black text-red-600 uppercase flex items-center gap-2"><RefreshCcw size={16}/> REGISTRO DE VOLTAJES</h3>
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

      <button 
        onClick={handleSave} 
        disabled={isSaving} 
        className={`w-full py-8 ${selectedIPM.isObservations ? 'bg-slate-900' : 'bg-red-600'} text-white rounded-[3.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSaving ? <RefreshCcw className="animate-spin" /> : <Save />}
        {isSaving ? "GENERANDO..." : `FINALIZAR REPORTE ${selectedIPM.id}`}
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