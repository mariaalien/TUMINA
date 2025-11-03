import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/api';
import { ArrowLeft, Download, FileText, FileSpreadsheet, Filter, X } from 'lucide-react';
import './Reportes.css';

const Reportes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    tipoFormulario: [],
    tipoMaterial: [],
    formato: 'excel',
  });
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const tiposFormularios = [
    { id: 'produccion', nombre: 'FRI Producción', icon: '🏭' },
    { id: 'inventarios', nombre: 'FRI Inventarios', icon: '📦' },
    { id: 'paradas', nombre: 'FRI Paradas', icon: '⏸️' },
    { id: 'ejecucion', nombre: 'FRI Ejecución', icon: '⚙️' },
    { id: 'maquinaria', nombre: 'FRI Maquinaria', icon: '🚜' },
    { id: 'regalias', nombre: 'FRI Regalías', icon: '💰' },
  ];

  const tiposMateriales = [
    { id: 'oro', nombre: 'Oro' },
    { id: 'arena', nombre: 'Arena' },
    { id: 'grava', nombre: 'Grava' },
    { id: 'arcilla', nombre: 'Arcilla' },
    { id: 'caliza', nombre: 'Caliza' },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (type, value) => {
    setFilters(prev => {
      const currentArray = prev[type];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return {
        ...prev,
        [type]: newArray,
      };
    });
  };

  const handlePreview = () => {
    // Simular vista previa
    const mockData = {
      totalRegistros: 156,
      fechaInicio: filters.fechaInicio || '2024-01-01',
      fechaFin: filters.fechaFin || '2024-11-02',
      tiposIncluidos: filters.tipoFormulario.length || tiposFormularios.length,
      materialesIncluidos: filters.tipoMaterial.length || tiposMateriales.length,
    };
    setPreview(mockData);
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let response;
      const exportParams = {
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        tiposFormulario: filters.tipoFormulario.length ? filters.tipoFormulario : undefined,
        tiposMaterial: filters.tipoMaterial.length ? filters.tipoMaterial : undefined,
      };

      if (filters.formato === 'excel') {
        response = await reportService.exportToExcel(exportParams);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_FRI_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        response = await reportService.exportToPDF(exportParams);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_FRI_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setMessage({ 
        type: 'success', 
        text: `✅ Reporte exportado exitosamente en formato ${filters.formato.toUpperCase()}` 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error al exportar reporte. Por favor intenta de nuevo.' 
      });
      console.error('Error exportando:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      fechaInicio: '',
      fechaFin: '',
      tipoFormulario: [],
      tipoMaterial: [],
      formato: 'excel',
    });
    setPreview(null);
  };

  return (
    <div className="reportes-container">
      <header className="page-header">
        <div className="container">
          <button onClick={() => navigate('/home')} className="btn btn-outline">
            <ArrowLeft size={18} />
            Volver
          </button>
          <h1>📥 Exportar Reportes</h1>
        </div>
      </header>

      <main className="page-main">
        <div className="container">
          <div className="grid grid-2">
            {/* Panel de Filtros */}
            <div className="card fade-in">
              <div className="card-header">
                <h3>
                  <Filter size={20} />
                  Configurar Filtros
                </h3>
                <button 
                  onClick={clearFilters}
                  className="btn btn-outline btn-sm"
                >
                  <X size={16} />
                  Limpiar
                </button>
              </div>

              <div className="filters-content">
                {/* Rango de Fechas */}
                <div className="filter-section">
                  <h4>📅 Rango de Fechas</h4>
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">Fecha Inicio</label>
                      <input
                        type="date"
                        name="fechaInicio"
                        value={filters.fechaInicio}
                        onChange={handleFilterChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha Fin</label>
                      <input
                        type="date"
                        name="fechaFin"
                        value={filters.fechaFin}
                        onChange={handleFilterChange}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Tipos de Formularios */}
                <div className="filter-section">
                  <h4>📋 Tipos de Formularios</h4>
                  <div className="checkbox-grid">
                    {tiposFormularios.map((tipo) => (
                      <label key={tipo.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.tipoFormulario.includes(tipo.id)}
                          onChange={() => handleCheckboxChange('tipoFormulario', tipo.id)}
                        />
                        <span>{tipo.icon} {tipo.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {filters.tipoFormulario.length === 0 && (
                    <p className="filter-note">Todos los tipos seleccionados</p>
                  )}
                </div>

                {/* Tipos de Materiales */}
                <div className="filter-section">
                  <h4>⛏️ Tipos de Materiales</h4>
                  <div className="checkbox-grid">
                    {tiposMateriales.map((material) => (
                      <label key={material.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.tipoMaterial.includes(material.id)}
                          onChange={() => handleCheckboxChange('tipoMaterial', material.id)}
                        />
                        <span>{material.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {filters.tipoMaterial.length === 0 && (
                    <p className="filter-note">Todos los materiales seleccionados</p>
                  )}
                </div>

                {/* Formato de Exportación */}
                <div className="filter-section">
                  <h4>📄 Formato de Exportación</h4>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="formato"
                        value="excel"
                        checked={filters.formato === 'excel'}
                        onChange={handleFilterChange}
                      />
                      <FileSpreadsheet size={20} />
                      <div>
                        <strong>Excel</strong>
                        <span>Formato simple con columnas ANM</span>
                      </div>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="formato"
                        value="pdf"
                        checked={filters.formato === 'pdf'}
                        onChange={handleFilterChange}
                      />
                      <FileText size={20} />
                      <div>
                        <strong>PDF</strong>
                        <span>Reporte ejecutivo con gráficos</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handlePreview}
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                >
                  👁️ Vista Previa
                </button>
              </div>
            </div>

            {/* Panel de Vista Previa y Exportación */}
            <div className="card fade-in">
              <h3>👁️ Vista Previa del Reporte</h3>

              {message.text && (
                <div className={`alert alert-${message.type}`}>
                  {message.text}
                </div>
              )}

              {preview ? (
                <div className="preview-content">
                  <div className="preview-stat">
                    <div className="preview-icon">
                      <FileText size={32} color="#2563eb" />
                    </div>
                    <div>
                      <h2>{preview.totalRegistros}</h2>
                      <p>Registros encontrados</p>
                    </div>
                  </div>

                  <div className="preview-details">
                    <div className="preview-item">
                      <strong>📅 Período:</strong>
                      <span>
                        {new Date(preview.fechaInicio).toLocaleDateString()} -{' '}
                        {new Date(preview.fechaFin).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="preview-item">
                      <strong>📋 Tipos de formularios:</strong>
                      <span>{preview.tiposIncluidos} tipo(s)</span>
                    </div>
                    <div className="preview-item">
                      <strong>⛏️ Materiales:</strong>
                      <span>{preview.materialesIncluidos} material(es)</span>
                    </div>
                    <div className="preview-item">
                      <strong>📄 Formato:</strong>
                      <span>{filters.formato.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="export-info">
                    <h4>ℹ️ Información del Reporte</h4>
                    <ul>
                      <li>✅ Los datos se exportarán según los filtros seleccionados</li>
                      <li>✅ El formato {filters.formato.toUpperCase()} incluirá todos los campos requeridos</li>
                      <li>✅ Los registros estarán ordenados por fecha</li>
                      <li>✅ Se incluirán metadatos de auditoría</li>
                    </ul>
                  </div>

                  <button 
                    onClick={handleExport}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading"></span>
                        Generando reporte...
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        Exportar Reporte
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="empty-preview">
                  <FileText size={64} color="#e5e7eb" />
                  <p>Configura los filtros y presiona "Vista Previa" para ver el resumen</p>
                </div>
              )}
            </div>
          </div>

          {/* Información Adicional */}
          <div className="card fade-in" style={{ marginTop: '2rem' }}>
            <h3>💡 Guía de Exportación</h3>
            <div className="grid grid-2">
              <div>
                <h4>📊 Formato Excel</h4>
                <ul className="info-list">
                  <li>Incluye todas las columnas definidas por ANM</li>
                  <li>Datos listos para análisis y procesamiento</li>
                  <li>Compatible con Microsoft Excel y Google Sheets</li>
                  <li>Ideal para reportes técnicos y auditorías</li>
                </ul>
              </div>
              <div>
                <h4>📄 Formato PDF</h4>
                <ul className="info-list">
                  <li>Reporte ejecutivo con diseño profesional</li>
                  <li>Incluye gráficos y visualizaciones</li>
                  <li>Resumen estadístico del período</li>
                  <li>Ideal para presentaciones y entregas formales</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reportes;
