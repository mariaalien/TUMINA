const PDFDocument = require('pdfkit');
const fs = require('fs');

class PDFExporter {
  
  async generarPDFProduccion(datos, titulo = 'FRI PRODUCCIÓN') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Encabezado
        doc.fontSize(16).font('Helvetica-Bold').text(titulo, { align: 'center' });
        doc.moveDown();

        // Información general
        if (datos.length > 0) {
          const primer = datos[0];
          doc.fontSize(10).font('Helvetica');
          doc.text(`Título Minero: ${primer.tituloMinero?.numeroTitulo || 'N/A'}`);
          doc.text(`Municipio: ${primer.tituloMinero?.municipio || 'N/A'}`);
          doc.text(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`);
          doc.moveDown();
        }

        // Tabla
        const startY = doc.y;
        const cellPadding = 5;
        const colWidths = [80, 80, 80, 100, 80, 80];
        
        // Encabezados
        doc.fontSize(9).font('Helvetica-Bold');
        let x = 50;
        const headers = ['Fecha', 'Mineral', 'Horas Op.', 'Cantidad Prod.', 'Unidad', 'Estado'];
        
        headers.forEach((header, i) => {
          doc.rect(x, startY, colWidths[i], 20).stroke();
          doc.text(header, x + cellPadding, startY + cellPadding, { 
            width: colWidths[i] - cellPadding * 2,
            align: 'center'
          });
          x += colWidths[i];
        });

        // Datos
        let y = startY + 20;
        doc.font('Helvetica').fontSize(8);

        datos.forEach((dato, index) => {
          if (y > 500) {
            doc.addPage();
            y = 50;
          }

          x = 50;
          const valores = [
            new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
            dato.mineral || '',
            dato.horasOperativas?.toString() || '0',
            dato.cantidadProduccion?.toString() || '0',
            dato.unidadMedida || '',
            dato.estado || ''
          ];

          valores.forEach((valor, i) => {
            doc.rect(x, y, colWidths[i], 20).stroke();
            doc.text(valor, x + cellPadding, y + cellPadding, {
              width: colWidths[i] - cellPadding * 2,
              align: 'center'
            });
            x += colWidths[i];
          });

          y += 20;
        });

        // Pie de página
        doc.fontSize(8).text(
          `Total de registros: ${datos.length}`,
          50,
          doc.page.height - 50
        );

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async generarPDFConsolidado(datosPorTipo) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Portada
        doc.fontSize(20).font('Helvetica-Bold').text(
          'REPORTE CONSOLIDADO FRI',
          { align: 'center' }
        );
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(
          `Fecha de generación: ${new Date().toLocaleString('es-CO')}`,
          { align: 'center' }
        );
        doc.moveDown(2);

        // Resumen
        doc.fontSize(14).font('Helvetica-Bold').text('RESUMEN GENERAL');
        doc.moveDown();

        Object.entries(datosPorTipo).forEach(([tipo, datos]) => {
          const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
          doc.fontSize(10).font('Helvetica');
          doc.text(`${nombreTipo}: ${datos.length} registro(s)`);
        });

        doc.addPage();

        // Detalle por tipo
        Object.entries(datosPorTipo).forEach(([tipo, datos]) => {
          if (datos.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text(
              tipo.toUpperCase(),
              { align: 'center' }
            );
            doc.moveDown();

            // Agregar tabla simple
            datos.slice(0, 10).forEach((dato, index) => {
              doc.fontSize(9).font('Helvetica');
              doc.text(`${index + 1}. Fecha: ${new Date(dato.fechaCorte).toLocaleDateString('es-CO')}`);
              if (dato.mineral) doc.text(`   Mineral: ${dato.mineral}`);
              doc.text(`   Estado: ${dato.estado}`);
              doc.moveDown(0.5);
            });

            if (datos.length > 10) {
              doc.text(`... y ${datos.length - 10} más`);
            }

            doc.addPage();
          }
        });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFExporter();