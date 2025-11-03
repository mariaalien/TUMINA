const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class ANMExporter {
  
  // Función para clonar plantilla y llenarla con datos
  async exportarProduccionANM(datos) {
    const plantillaPath = path.join(__dirname, '..', '..', 'datos', 
      'ANM_-_FRI_-_Materiales_de_Construccion_-_Produccion_816-17.xlsx');

    if (!fs.existsSync(plantillaPath)) {
      throw new Error('Plantilla de Producción ANM no encontrada');
    }

    // Leer plantilla original
    const workbook = XLSX.readFile(plantillaPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Leer estructura actual
    const estructuraOriginal = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });

    console.log('📋 Estructura original detectada:', estructuraOriginal.length, 'filas');

    // Encontrar la fila donde empiezan los datos
    let filaInicioDatos = -1;
    for (let i = 0; i < estructuraOriginal.length; i++) {
      const fila = estructuraOriginal[i];
      // Buscar una fila que tenga encabezados típicos
      const textoFila = fila.join('').toLowerCase();
      if (textoFila.includes('fecha') || textoFila.includes('mineral') || textoFila.includes('producción')) {
        filaInicioDatos = i + 1; // Datos empiezan en la siguiente fila
        break;
      }
    }

    if (filaInicioDatos === -1) {
      console.log('⚠️  No se encontró fila de inicio, usando fila 2 por defecto');
      filaInicioDatos = 1;
    }

    console.log(`📍 Datos se insertarán desde fila ${filaInicioDatos + 1}`);

    // Crear nueva hoja con la misma estructura
    const nuevaData = [...estructuraOriginal.slice(0, filaInicioDatos)];

    // Agregar datos del sistema
    datos.forEach(dato => {
      const fila = [
        new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        dato.mineral || '',
        dato.tituloMinero?.numeroTitulo || '',
        dato.tituloMinero?.municipio || '',
        parseFloat(dato.horasOperativas) || 0,
        parseFloat(dato.cantidadProduccion) || 0,
        dato.unidadMedida || '',
        dato.materialEntraPlanta ? parseFloat(dato.materialEntraPlanta) : '',
        dato.materialSalePlanta ? parseFloat(dato.materialSalePlanta) : '',
        dato.masaUnitaria ? parseFloat(dato.masaUnitaria) : '',
        dato.estado || '',
        dato.usuario?.nombre || '',
        dato.observaciones || ''
      ];
      nuevaData.push(fila);
    });

    // Crear nueva hoja
    const nuevaHoja = XLSX.utils.aoa_to_sheet(nuevaData);

    // Copiar propiedades de la hoja original
    if (worksheet['!ref']) nuevaHoja['!ref'] = worksheet['!ref'];
    if (worksheet['!cols']) nuevaHoja['!cols'] = worksheet['!cols'];
    if (worksheet['!rows']) nuevaHoja['!rows'] = worksheet['!rows'];
    if (worksheet['!merges']) nuevaHoja['!merges'] = worksheet['!merges'];

    // Crear nuevo workbook
    const nuevoWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(nuevoWorkbook, nuevaHoja, sheetName);

    return nuevoWorkbook;
  }

  // Similar para otros tipos...
  async exportarInventariosANM(datos) {
    const plantillaPath = path.join(__dirname, '..', '..', 'datos',
      'ANM_-_FRI_-_Materiales_de_Construccion_-_Inventarios_816-17.xlsx');

    if (!fs.existsSync(plantillaPath)) {
      throw new Error('Plantilla de Inventarios ANM no encontrada');
    }

    const workbook = XLSX.readFile(plantillaPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const estructuraOriginal = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });

    // Encontrar fila de inicio
    let filaInicioDatos = 1;
    
    const nuevaData = [...estructuraOriginal.slice(0, filaInicioDatos)];

    datos.forEach(dato => {
      const fila = [
        new Date(dato.fechaCorte).toLocaleDateString('es-CO'),
        dato.mineral || '',
        dato.unidadMedida || '',
        parseFloat(dato.inventarioInicialAcopio) || 0,
        parseFloat(dato.ingresoAcopio) || 0,
        parseFloat(dato.salidaAcopio) || 0,
        parseFloat(dato.inventarioFinalAcopio) || 0,
        dato.estado || ''
      ];
      nuevaData.push(fila);
    });

    const nuevaHoja = XLSX.utils.aoa_to_sheet(nuevaData);
    if (worksheet['!cols']) nuevaHoja['!cols'] = worksheet['!cols'];
    if (worksheet['!merges']) nuevaHoja['!merges'] = worksheet['!merges'];

    const nuevoWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(nuevoWorkbook, nuevaHoja, sheetName);

    return nuevoWorkbook;
  }

  // Exportar TODOS los tipos seleccionados en un solo archivo
  async exportarMultiplesFormatos(datosPorTipo) {
    const workbook = XLSX.utils.book_new();

    if (datosPorTipo.produccion && datosPorTipo.produccion.length > 0) {
      const wbProduccion = await this.exportarProduccionANM(datosPorTipo.produccion);
      const sheet = wbProduccion.Sheets[wbProduccion.SheetNames[0]];
      XLSX.utils.book_append_sheet(workbook, sheet, 'PRODUCCIÓN');
    }

    if (datosPorTipo.inventarios && datosPorTipo.inventarios.length > 0) {
      const wbInventarios = await this.exportarInventariosANM(datosPorTipo.inventarios);
      const sheet = wbInventarios.Sheets[wbInventarios.SheetNames[0]];
      XLSX.utils.book_append_sheet(workbook, sheet, 'INVENTARIOS');
    }

    // Agregar otros tipos...

    return workbook;
  }
}

module.exports = new ANMExporter();