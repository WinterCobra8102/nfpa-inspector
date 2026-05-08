import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generador de PDF oficial TLETL - Versión Centralizada
 * Soporta: Geolocalización precisa, Semáforo de colores, Voltajes e Imágenes.
 */
export const generatePDF = async (data) => {
  try {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- ENCABEZADO INSTITUCIONAL ---
    doc.setFillColor(180, 0, 0); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("TLETL - PROTECCIÓN CONTRA INCENDIOS", margin, 20);
    doc.setFontSize(10);
    
    // Título dinámico para cualquier IPM del catálogo
    const serviceTitle = data.equipmentName || data.serviceName || "REPORTE TÉCNICO";
    doc.text(`SERVICIO: ${data.serviceCode || 'IPM'} - ${serviceTitle}`, margin, 30);
    doc.text(`TÉCNICO: ${data.technician || 'Isai Moo'} | FECHA: ${new Date(data.date).toLocaleDateString()}`, margin, 36);

    // --- LÓGICA DE GOOGLE MAPS PRECISO ---
    // Genera el enlace directo usando coordenadas lat/lng
    const mapsUrl = data.location?.lat && data.location?.lng
      ? `https://www.google.com/maps?q=${data.location.lat},${data.location.lng}`
      : null;

    // --- TABLA 1: DATOS GENERALES Y GEOLOCALIZACIÓN ---
    autoTable(doc, {
      startY: 45,
      head: [['ESPECIFICACIÓN', 'DETALLE']],
      body: [
        ['CÓDIGO DE FORMATO', data.norm || 'F-SER-014'],
        ['ESTATUS GLOBAL', data.overallStatus || 'ÓPTIMO'],
        ['UBICACIÓN (TEXTO)', data.location?.address || 'No capturada'],
        ['GEOLOCALIZACIÓN', mapsUrl ? 'VER UBICACIÓN EXACTA EN GOOGLE MAPS' : 'Sin coordenadas'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      didParseCell: (cellData) => {
        // Estilo visual de hipervínculo (azul) para la fila de Maps
        if (cellData.section === 'body' && cellData.row.index === 3 && cellData.column.index === 1 && mapsUrl) {
          cellData.cell.styles.textColor = [0, 0, 255];
        }
      },
      didDrawCell: (cellData) => {
        // Crea el enlace interactivo en el área de la celda
        if (cellData.section === 'body' && cellData.row.index === 3 && cellData.column.index === 1 && mapsUrl) {
          doc.link(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, { url: mapsUrl });
        }
      }
    });

    // --- TABLA 2: CHECKLIST POR SECCIONES ---
    // Mapea secciones para IPM-01 o IPM-02
    let currentY = doc.lastAutoTable.finalY + 10;
    
    if (data.sections && data.sections.length > 0) {
      data.sections.forEach(section => {
        const body = section.points.map((p, i) => {
          const resKey = `${section.title}-${i}`;
          const val = data.responses[resKey];
          return [p, val === 'bien' ? 'OK' : val === 'falla' ? 'X' : 'N/A'];
        });

        autoTable(doc, {
          startY: currentY,
          head: [[section.title, 'ESTADO']],
          body: body,
          headStyles: { fillColor: [180, 0, 0] },
          columnStyles: { 1: { halign: 'center', cellWidth: 25 } },
          didParseCell: (cellData) => {
            // Colores del semáforo para el PDF
            if (cellData.section === 'body' && cellData.column.index === 1) {
              const status = cellData.cell.raw;
              if (status === 'OK') cellData.cell.styles.textColor = [0, 150, 0];   // Verde
              if (status === 'X') cellData.cell.styles.textColor = [180, 0, 0];    // Rojo
              if (status === 'N/A') cellData.cell.styles.textColor = [120, 120, 120]; // Gris
            }
          }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      });
    }

    // --- TABLA 3: REGISTRO DE ARRANQUES (Voltajes IPM-01) ---
    // Solo se imprime si es el servicio de bomba diésel
    if (data.serviceCode === "IPM-01" && data.voltages) {
      if (currentY > 230) doc.addPage();
      autoTable(doc, {
        startY: currentY > 230 ? 20 : currentY,
        head: [['# ARRANQUE', 'V. MÍNIMO (DURANTE)', 'V. MÁXIMO (DESPUÉS)']],
        body: data.voltages.map((v, i) => [`Arranque ${i+1}`, `${v.min} V`, `${v.max} V`]),
        theme: 'striped',
        headStyles: { fillColor: [180, 0, 0] },
        styles: { halign: 'center' }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- COMENTARIOS ---
    autoTable(doc, {
      startY: currentY,
      head: [['COMENTARIOS Y OBSERVACIONES TÉCNICAS']],
      body: [[data.observations || 'Sin anotaciones adicionales.']],
      headStyles: { fillColor: [60, 60, 60] }
    });

    // --- EVIDENCIA FOTOGRÁFICA ---
    // Se inserta en una nueva página para mayor claridad
    if (data.photo) {
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("EVIDENCIA FOTOGRÁFICA DEL SERVICIO:", margin, 20);
      // Carga la imagen guardada en base64
      doc.addImage(data.photo, 'JPEG', margin, 30, 180, 135);
    }

    doc.save(`TLETL_${data.serviceCode || 'REP'}_${Date.now()}.pdf`);
    return true;
  } catch (error) {
    console.error("Error al generar PDF:", error);
    // Solución al error de autoTable
    alert("Error crítico en el motor de PDF. Revisa que jspdf-autotable esté instalado.");
    throw error;
  }
};