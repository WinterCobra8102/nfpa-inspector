import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// Catálogo interno de respaldo para reconstruir las secciones NFPA automáticamente si el checklist viene vacío
const BACKUP_CATALOG = {
  'F-SER-014': [
    { title: "INSPECCIÓN Y MANTENIMIENTO", points: ["Ejercitar cerrando y abriendo las válvulas normalmente abiertas del cuarto de bombas", "Ejercitar el indicador de nivel del tanque de almacenamiento de agua", "El tanque de almacenamiento de agua no cuenta con materiales extraños o deshechos", "Operar manualmente la válvula de llenado automático del tanque de almacenamiento de agua", "Ejercitar el indicador de nivel del tanque de combustible", "Probar el interruptor aislador del controlador jockey", "Activar la protección térmica del controlador jockey", "Ejercitar los interruptores del suministro de AC del controlador diesel", "Ejercitar los interruptores del suministro de baterías del controlador diesel", "Inspeccionar los componentes internos del controlador diesel", "Rellenar con agua destilada las celdas de las baterías con bajo nivel de electrolito", "Retirar corrosión de la batería y limpiar su carcasa", "Inspeccionar y realizar servicio de limpieza de filtros de la línea de suministro de agua", "Realizar limpieza general del cuarto de bombas en caso necesario"] },
    { title: "PRUEBAS", points: ["Durante las pruebas las protecciones térmicas, disyuntores y fusibles operaron correctamente", "Realizar 6 arranques manuales alternando baterías 1 y 2", "Verificar que el cargador está trabajando correctamente", "Verificar que las baterías no sufren de temperatura excesiva"] }
  ],
  'F-SER-015': [{ title: "INSPECCIÓN Y MANTENIMIENTO SEMANAL", points: ["Inspección visual de equipos operativos", "Verificar estado de bombas, tuberías y mangueras", "Revisar controlador de bomba contra incendio", "Verificar indicador de nivel de combustible", "Inspeccionar terminales de baterías", "Verificar precalentador de motor", "Revisar nivel de aceite del motor", "Verificar nivel de agua del radiador", "Inspeccionar correas y mangueras", "Verificar ausencia de fugas"] }],
  'F-SER-016': [
    { title: "INSPECCIONES", points: ["Estado del gabinete o rack", "Revisión de etiqueta de mantenimiento", "Inspección del estado de la manguera", "Verificar buen estado del chiflón", "Revisión de válvula", "Soportería en buen estado", "Manguera colocada correctamente"] },
    { title: "MANTENIMIENTO", points: ["Servicio de limpieza a gabinete y rack de manguera", "Recorrido de dobleces de manguera"] }
  ],
  'F-SER-019': [
    { title: "INSPECCIONES", points: ["Tablero de control en buen estado y operativo", "Dispositivos manuales operativos", "Detectores de incendio en buen estado", "Fuentes de poder auxiliares operativas", "Baterías de respaldo en buen estado"] },
    { title: "PRUEBAS", points: ["Prueba de luces del tablero", "Prueba de estaciones manuales", "Prueba de detectores de humo", "Prueba de notificación sonora y visual", "Verificar dispositivos de monitoreo"] }
  ],
  'F-SER-039': [{ title: "INSPECCIONES", points: ["El hidrante tiene libre acceso", "Las tapas giran libremente", "Verificar que el barril del hidrante esté libre de agua o hielo", "Estado físico del hidrante", "Desgaste de roscas en conectores de descarga y tapas", "Estado físico de la válvula", "Empaques y empaquetaduras en buen estado", "Disponibilidad de la llave del hidrante"] }],
  'F-SER-041': [
    { title: "INSPECCIÓN", points: ["La válvula se encuentra operativa y libre de daño visible", "La válvula es accesible y libre de obstrucciones", "La válvula está equipada con la correspondiente llave para su manipulación", "La válvula cuenta con candado y/o se encuentra supervisada", "Verificar el estado correcto de la válvula (abierta o cerrada)"] },
    { title: "PRUEBA", points: ["Ejercitar cerrando y abriendo 3 vueltas las válvulas normalmente abiertas"] }
  ],
  'F-SER-IPM06': [{ title: "INSPECCIONES", points: ["Verificar que el sistema se encuentre operativo", "Anotar la presión de suministro del riser", "Anotar presión de agua o aire en el sistema", "Verificar fugas y daño físico en válvula de alarma o acción previa", "Verificar que las válvulas estén accesibles y en estado correcto", "Verificar placa de identificación del riser", "Verificar conexión con bomberos", "Verificar que las válvulas estén enclavadas o supervisadas", "Verificar que se cuenta con rociadores de repuesto"] }]
};

export const generatePDF = async (data) => {
  if (!data) {
    toast.error("No hay datos disponibles para estructurar el PDF.");
    return false;
  }

  toast.loading("Estructurando PDF profesional...", { id: "pdf_loader" });

  try {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- LEER PROPIEDADES CON PARIDAD DE VARIABLES (SOPORTA CAMELCASE Y SNAKE_CASE) ---
    let clientName = data.clientName || data.client_name || 'NO ESPECIFICADO';
    let clientAddress = data.clientAddress || data.client_address || data.location?.address || 'No capturada';
    const currentClientId = data.clientId || data.client_id;

    // Si por algún fallo de red no viene el nombre mapeado, lo resuelve asíncronamente desde Supabase
    if (clientName === 'NO ESPECIFICADO' && currentClientId) {
      const { data: clientData } = await supabase
        .from('clientes')
        .select('nombre, direccion')
        .eq('id', currentClientId)
        .maybeSingle();
      if (clientData) {
        clientName = clientData.nombre;
        if (clientAddress === 'No capturada' && clientData.direccion) {
          clientAddress = clientData.direccion;
        }
      }
    }

    // --- ENCABEZADO INSTITUCIONAL ---
    doc.setFillColor(180, 0, 0); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("TLETL - PROTECCIÓN CONTRA INCENDIOS", margin, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const currentFormCode = data.formCode || data.serviceCode || 'F-SER-014';
    const serviceTitle = data.equipmentName || "REPORTE TÉCNICO DE INSPECCIÓN";
    doc.text(`SERVICIO: ${currentFormCode} - ${serviceTitle.toUpperCase()}`, margin, 30);
    
    const currentTechnician = data.performedBy || data.performed_by || data.technician || 'Isai Moo';
    doc.text(`TÉCNICO: ${currentTechnician.toUpperCase()} | FECHA: ${new Date(data.date).toLocaleDateString()}`, margin, 36);

    // --- ENLACE INTERACTIVO REAL A GOOGLE MAPS ---
    const locObj = data.location;
    const mapsUrl = locObj?.lat && locObj?.lng
      ? `https://www.google.com/maps?q=${locObj.lat},${locObj.lng}`
      : null;

    // --- TABLA 1: DATOS GENERALES ---
    const infoRows = [
      ['EMPRESA / SUCURSAL', clientName.toUpperCase()],
      ['RESPONSABLE QUE RECIBE', (data.ownerName || data.owner_name || 'Persona de Conformidad').toUpperCase()],
      ['CÓDIGO DE FORMATO', currentFormCode],
      ['ESTATUS GLOBAL', data.overallStatus || 'ÓPTIMO'],
      ['UBICACIÓN (TEXTO)', clientAddress.toUpperCase()],
      ['UBICACIÓN GPS', locObj?.lat ? `${locObj.lat.toFixed(6)}, ${locObj.lng.toFixed(6)}` : 'Sin coordenadas'],
      ['GEOLOCALIZACIÓN', mapsUrl ? 'VER UBICACIÓN EXACTA EN GOOGLE MAPS' : 'Sin enlace']
    ];

    const mapsRowIndex = infoRows.length - 1;

    autoTable(doc, {
      startY: 45,
      head: [['ESPECIFICACIÓN', 'DETALLE']],
      body: infoRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      bodyStyles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === mapsRowIndex && cellData.column.index === 1 && mapsUrl) {
          cellData.cell.styles.textColor = [0, 0, 255];
        }
      },
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === mapsRowIndex && cellData.column.index === 1 && mapsUrl) {
          doc.link(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, { url: mapsUrl });
        }
      }
    });

    // --- TABLA 2: CHECKLIST DIVIDIDO POR SECCIONES NFPA ---
    let currentY = doc.lastAutoTable.finalY + 10;
    const activeSections = data.sections || BACKUP_CATALOG[currentFormCode] || [];

    if (activeSections.length > 0) {
      activeSections.forEach(section => {
        const body = section.points.map((p) => {
          const pointDetail = data.details ? data.details[p] : null;
          const val = pointDetail ? pointDetail.status : 'PTE';
          const note = pointDetail ? pointDetail.note : '-';

          let displayStatus = 'PTE';
          if (val === 'bien' || val === 'OK') displayStatus = 'OK';
          if (val === 'falla' || val === 'critico' || val === 'X') displayStatus = 'X';
          if (val === 'na' || val === 'N/A') displayStatus = 'N/A';
          if (val === 'advertencia') displayStatus = 'ADV';

          return [p, displayStatus, note || '-'];
        });

        if (currentY > 240) { doc.addPage(); currentY = 20; }

        autoTable(doc, {
          startY: currentY,
          head: [[section.title, 'ESTADO', 'HALLAZGOS / NOTAS DE CAMPO']],
          body: body,
          headStyles: { fillColor: [180, 0, 0] },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 
            0: { cellWidth: 100 },
            1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
            2: { cellWidth: 60 }
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 1) {
              const status = cellData.cell.raw;
              if (status === 'OK') cellData.cell.styles.textColor = [0, 150, 0];   
              if (status === 'X') cellData.cell.styles.textColor = [180, 0, 0];    
              if (status === 'ADV') cellData.cell.styles.textColor = [234, 179, 8]; 
              if (status === 'N/A') cellData.cell.styles.textColor = [120, 120, 120]; 
            }
          }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      });
    }

    // --- TABLA 3: VOLTAJES DE ARRANQUE ---
    if (data.voltages && Array.isArray(data.voltages) && data.voltages.some(v => v.min || v.max)) {
      if (currentY > 230) doc.addPage();
      autoTable(doc, {
        startY: currentY > 230 ? 20 : currentY,
        head: [['# ARRANQUE', 'V. MÍNIMO (DURANTE CRANKING)', 'V. MÁXIMO (POST-ARRANQUE)']],
        body: data.voltages.map((v, i) => [`Arranque ${i+1}`, v.min ? `${v.min} V` : '-', v.max ? `${v.max} V` : '-']),
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { halign: 'center', fontSize: 8 }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- COMENTARIOS Y DIAGNÓSTICO ---
    if (currentY > 240) doc.addPage();
    autoTable(doc, {
      startY: currentY,
      head: [['COMENTARIOS Y OBSERVACIONES TÉCNICAS GENERALES']],
      body: [[data.generalObs || data.observations || 'Sin anotaciones adicionales.']],
      headStyles: { fillColor: [60, 60, 60] },
      bodyStyles: { fontSize: 9 }
    });
    currentY = doc.lastAutoTable.finalY + 15;

    // --- GALERÍA FOTOGRÁFICA ---
    let hasPointPhotos = false;
    if (data.details && typeof data.details === 'object') {
      for (const [pointName, val] of Object.entries(data.details)) {
        if (val && val.photo) {
          if (!hasPointPhotos) {
            doc.addPage(); currentY = 20;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
            doc.text("ANEXO FOTOGRÁFICO DE HALLAZGOS EN CAMPO", margin, currentY);
            currentY += 10; hasPointPhotos = true;
          }
          if (currentY > 220) { doc.addPage(); currentY = 20; }
          try {
            doc.addImage(val.photo, 'JPEG', margin, currentY, 60, 45);
            doc.setDrawColor(200, 200, 200); doc.rect(margin, currentY, 60, 45, 'S'); 
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text("PUNTO DE INSPECCIÓN:", 80, currentY + 5);
            doc.setFont('helvetica', 'normal'); doc.text(pointName, 80, currentY + 11, { maxWidth: 110 });
            doc.setFont('helvetica', 'bold'); doc.text("NOTA REGISTRADA:", 80, currentY + 28);
            doc.setFont('helvetica', 'normal'); doc.text(val.note || 'Sin comentarios.', 80, currentY + 34, { maxWidth: 110 });
            currentY += 52;
          } catch (e) { console.error(e); }
        }
      }
    }

    // --- SECCIÓN DE FIRMAS DE VALIDACIÓN DE CONFORMIDAD ---
    const pageHeight = doc.internal.pageSize.getHeight();
    let sigY = pageHeight - 45;
    if (currentY > pageHeight - 55) { doc.addPage(); sigY = pageHeight - 45; } else { sigY = pageHeight - 45; }

    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.5);
    doc.line(20, sigY, 85, sigY); doc.line(125, sigY, 190, sigY);

    doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text("TÉCNICO OPERADOR IPM", 33, sigY + 5);
    doc.text("RESPONSABLE QUE RECIBE", 137, sigY + 5);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(currentTechnician.toUpperCase(), 20, sigY + 10, { maxWidth: 65 });
    doc.text((data.ownerName || data.owner_name || 'Persona de conformidad').toUpperCase(), 125, sigY + 10, { maxWidth: 65 });

    const currentSignature = data.signature;
    if (currentSignature) {
      try {
        doc.addImage(currentSignature, 'PNG', 132, sigY - 22, 45, 18);
      } catch (e) { console.error("Error inyectando firma:", e); }
    }

    doc.save(`TLETL_${currentFormCode}_${Date.now()}.pdf`);
    toast.success("PDF generado y descargado correctamente", { id: "pdf_loader" });
    return true;
  } catch (error) {
    console.error("Error crítico PDF:", error);
    toast.error("Error al generar el reporte PDF.", { id: "pdf_loader" });
    throw error;
  }
};