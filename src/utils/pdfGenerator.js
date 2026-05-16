import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const BACKUP_CATALOG = {
  'F-SER-014': [ /* tu catálogo completo */ ],
  'F-SER-015': [{ title: "INSPECCIÓN Y MANTENIMIENTO SEMANAL", points: ["Inspección visual de equipos operativos", "Verificar estado de bombas, tuberías y mangueras", "Revisar controlador de bomba contra incendio", "Verificar indicador de nivel de combustible", "Inspeccionar terminales de baterías", "Verificar precalentador de motor", "Revisar nivel de aceite del motor", "Verificar nivel de agua del radiador", "Inspeccionar correas y mangueras", "Verificar ausencia de fugas"] }],
  'F-SER-016': [ /* ... */ ],
  'F-SER-019': [ /* ... */ ],
  'F-SER-039': [ /* ... */ ],
  'F-SER-041': [ /* ... */ ],
  'F-SER-IPM06': [ /* ... */ ]
};

export const generatePDF = async (data) => {
  if (!data) {
    toast.error("No hay datos disponibles para estructurar el PDF.");
    return false;
  }

  toast.loading("Generando PDF profesional...", { id: "pdf_loader" });

  try {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === DATOS ===
    let clientName = data.clientName || data.client_name || 'NO ESPECIFICADO';
    let clientAddress = data.clientAddress || data.client_address || 'No capturada';
    const currentClientId = data.clientId || data.client_id;

    if (clientName === 'NO ESPECIFICADO' && currentClientId) {
      const { data: clientData } = await supabase.from('clientes')
        .select('nombre, direccion').eq('id', currentClientId).maybeSingle();
      if (clientData) {
        clientName = clientData.nombre;
        if (clientAddress === 'No capturada') clientAddress = clientData.direccion || clientAddress;
      }
    }

    const currentFormCode = data.formCode || data.serviceCode || 'F-SER-015';
    const serviceTitle = data.equipmentName || "REPORTE TÉCNICO DE INSPECCIÓN";
    const currentTechnician = data.performedBy || data.performed_by || data.technician || 'Técnico TLETL';

    // === ENCABEZADO ===
    doc.setFillColor(180, 0, 0);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("TLETL - PROTECCIÓN CONTRA INCENDIOS", margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`SERVICIO: ${currentFormCode} - ${serviceTitle.toUpperCase()}`, margin, 27);
    doc.text(`TÉCNICO: ${currentTechnician.toUpperCase()}  |  FECHA: ${new Date(data.date).toLocaleDateString('es-MX')}`, margin, 34);

    // === TABLA DE DATOS GENERALES ===
    const locObj = data.location;
    const mapsUrl = locObj?.lat && locObj?.lng 
      ? `https://www.google.com/maps?q=${locObj.lat},${locObj.lng}` : null;

    const infoRows = [
      ['EMPRESA / SUCURSAL', clientName.toUpperCase()],
      ['RESPONSABLE QUE RECIBE', (data.ownerName || data.owner_name || '').toUpperCase()],
      ['CÓDIGO DE FORMATO', currentFormCode],
      ['ESTATUS GLOBAL', data.overallStatus || data.status || 'ÓPTIMO'],
      ['UBICACIÓN (TEXTO)', clientAddress.toUpperCase()],
      ['UBICACIÓN GPS', locObj?.lat ? `${locObj.lat.toFixed(6)}, ${locObj.lng.toFixed(6)}` : 'Sin coordenadas'],
    ];

    autoTable(doc, {
      startY: 45,
      head: [['ESPECIFICACIÓN', 'DETALLE']],
      body: infoRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      styles: { fontSize: 9 },
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // === CHECKLIST ===
    const activeSections = data.sections || BACKUP_CATALOG[currentFormCode] || [];

    activeSections.forEach((section) => {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      const body = section.points.map((p) => {
        const pointDetail = data.details?.[p];
        const val = pointDetail?.status || 'PTE';
        let displayStatus = 'PTE';
        if (val === 'bien' || val === 'OK') displayStatus = 'OK';
        if (val === 'critico' || val === 'falla') displayStatus = 'X';
        if (val === 'advertencia') displayStatus = 'ADV';
        if (val === 'na') displayStatus = 'N/A';

        return [p, displayStatus, pointDetail?.note || '-'];
      });

      autoTable(doc, {
        startY: currentY,
        head: [[section.title, 'ESTADO', 'HALLAZGOS / NOTAS']],
        body,
        headStyles: { fillColor: [180, 0, 0], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 95 },
          1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          2: { cellWidth: 67 }
        },
        didParseCell: (cell) => {
          if (cell.column.index === 1) {
            const status = cell.cell.raw;
            if (status === 'OK') cell.cell.styles.textColor = [0, 128, 0];
            if (status === 'X') cell.cell.styles.textColor = [180, 0, 0];
            if (status === 'ADV') cell.cell.styles.textColor = [234, 179, 8];
          }
        }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    });

    // === COMENTARIOS ===
    if (currentY > 240) { doc.addPage(); currentY = 20; }

    autoTable(doc, {
      startY: currentY,
      head: [['COMENTARIOS Y OBSERVACIONES TÉCNICAS GENERALES']],
      body: [[data.generalObs || data.observations || 'Sin anotaciones adicionales.']],
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      styles: { fontSize: 9 }
    });
    currentY = doc.lastAutoTable.finalY + 20;

    // === FIRMAS (POSICIÓN DINÁMICA Y SEGURA) ===
    const signatureHeight = 55;
    const neededSpace = signatureHeight + 10;

    if (currentY + neededSpace > pageHeight - 10) {
      doc.addPage();
      currentY = 30;
    }

    const sigY = currentY + 5;

    // Líneas para firmar
    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.line(margin, sigY + 28, margin + 70, sigY + 28);           // Línea técnico
    doc.line(pageWidth - margin - 70, sigY + 28, pageWidth - margin, sigY + 28); // Línea cliente

    // Títulos
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("TÉCNICO OPERADOR IPM", margin + 5, sigY + 33);
    doc.text("RESPONSABLE QUE RECIBE", pageWidth - margin - 65, sigY + 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(currentTechnician, margin + 5, sigY + 38);
    doc.text((data.ownerName || '').toUpperCase(), pageWidth - margin - 65, sigY + 38);

    // === FIRMA DEL TÉCNICO ===
    const techSig = data.techSignature || data.tech_signature || data.techsignature;
    if (techSig) {
      try {
        doc.addImage(techSig, 'PNG', margin + 10, sigY, 55, 22);
      } catch (e) {
        console.warn("No se pudo cargar firma del técnico");
      }
    }

    // === FIRMA DEL CLIENTE ===
    const clientSig = data.signature || data.client_signature || data.clientsignature;
    if (clientSig) {
      try {
        doc.addImage(clientSig, 'PNG', pageWidth - margin - 65, sigY, 55, 22);
      } catch (e) {
        console.warn("No se pudo cargar firma del cliente");
      }
    }

    // Guardar
    doc.save(`TLETL_${currentFormCode}_${Date.now()}.pdf`);
    toast.success("PDF generado correctamente", { id: "pdf_loader" });
    return true;

  } catch (error) {
    console.error("Error generando PDF:", error);
    toast.error("Error al generar el PDF", { id: "pdf_loader" });
    return false;
  }
};