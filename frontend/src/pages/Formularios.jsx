import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friService } from '../services/api';
import { 
  Plus, 
  List, 
  ArrowLeft,
  Save,
  X,
  Edit,
  Trash2,
  Eye,
  Send,
  AlertCircle,
  CheckCircle,
  Filter
} from 'lucide-react';
import './Formularios.css';

const Formularios = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('select'); // select, create, list
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({});
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [borradoresCount, setBorradoresCount] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // TODOS, BORRADOR, ENVIADO, APROBADO, RECHAZADO

  const tiposFormularios = [
    { id: 'produccion', nombre: 'FRI Producción (Mensual)', icon: '🏭' },
    { id: 'inventarios', nombre: 'FRI Inventarios (Mensual)', icon: '📦' },
    { id: 'paradas', nombre: 'FRI Paradas de Producción', icon: '⏸️' },
    { id: 'ejecucion', nombre: 'FRI Ejecución (Mensual)', icon: '⚙️' },
    { id: 'maquinaria', nombre: 'FRI Utilización de Maquinaria', icon: '🚜' },
    { id: 'regalias', nombre: 'FRI Regalías (Trimestral)', icon: '💰' },
  ];

  useEffect(() => {
    loadBorradoresCount();
  }, []);

  const loadBorradoresCount = async () => {
    try {
      const response = await friService.getBorradoresCount();
      if (response.data.success) {
        setBorradoresCount(response.data.total);
      }
    } catch (error) {
      console.error('Error al cargar contador de borradores:', error);
    }
  };

  const handleTypeSelect = (tipo) => {
    setSelectedType(tipo);
    setFormData({});
    setMessage({ type: '', text: '' });
    setView('create');
  };

  const handleListView = async (tipo) => {
    setSelectedType(tipo);
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const serviceMethod = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
      const response = await friService[serviceMethod]();
      
      if (response.data.success) {
        setFormularios(response.data.fris || []);
      } else {
        setFormularios([]);
        setMessage({ type: 'info', text: 'No hay formularios registrados' });
      }
      setView('list');
    } catch (error) {
      console.error('Error al cargar formularios:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al cargar formularios' 
      });
      setFormularios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validar que todos los campos requeridos estén presentes
      const form = e.target;
      const requiredFields = form.querySelectorAll('[required]');
      let hasErrors = false;

      requiredFields.forEach(field => {
        if (!field.value) {
          hasErrors = true;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      if (hasErrors) {
        setMessage({ type: 'error', text: '⚠️ Por favor completa todos los campos requeridos' });
        setLoading(false);
        return;
      }

      const serviceMethod = `create${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
      const response = await friService[serviceMethod](formData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ ' + response.data.message });
        setFormData({});
        form.reset();
        
        // Actualizar contador de borradores
        await loadBorradoresCount();
        
        // Volver a la vista de selección después de 2 segundos
        setTimeout(() => {
          setView('select');
          setMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: '❌ ' + (response.data.message || 'Error al crear formulario') 
        });
      }
    } catch (error) {
      console.error('Error al crear formulario:', error);
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || 'Error al crear formulario. Verifica los datos ingresados.') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    const confirmar = window.confirm(
      `¿Estás seguro de cambiar el estado a ${nuevoEstado}?\n\n` +
      'Este cambio no se puede deshacer.'
    );

    if (!confirmar) return;

    try {
      const serviceMethod = `cambiarEstado${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
      const response = await friService[serviceMethod](id, nuevoEstado);

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ ' + response.data.message });
        await loadBorradoresCount();
        await handleListView(selectedType);
      } else {
        setMessage({ type: 'error', text: '❌ ' + response.data.message });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || 'Error al cambiar estado') 
      });
    }
  };

  const handleEnviarBorradores = async () => {
    if (borradoresCount === 0) {
      alert('⚠️ No hay borradores para enviar');
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ENVIAR todos los ${borradoresCount} borradores?\n\n` +
      'Esto cambiará su estado y ya no podrás editarlos.'
    );

    if (!confirmar) return;

    setLoading(true);
    try {
      const response = await friService.enviarBorradores();
      
      if (response.data.success) {
        alert(
          '✅ ' + response.data.message + '\n\n' +
          'Detalles:\n' +
          `- Producción: ${response.data.detalles.produccion}\n` +
          `- Inventarios: ${response.data.detalles.inventarios}\n` +
          `- Paradas: ${response.data.detalles.paradas}\n` +
          `- Ejecución: ${response.data.detalles.ejecucion}\n` +
          `- Maquinaria: ${response.data.detalles.maquinaria}\n` +
          `- Regalías: ${response.data.detalles.regalias}`
        );
        
        await loadBorradoresCount();
        
        // Recargar la lista si está viendo alguna
        if (view === 'list') {
          await handleListView(selectedType);
        }
      } else {
        alert('❌ Error: ' + response.data.message);
      }
    } catch (error) {
      alert('❌ Error de conexión: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFormulario = async (id) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas ELIMINAR este formulario?\n\n' +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmar) return;

    try {
      const serviceMethod = `delete${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
      const response = await friService[serviceMethod](id);

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Formulario eliminado correctamente' });
        await loadBorradoresCount();
        await handleListView(selectedType);
      } else {
        setMessage({ type: 'error', text: '❌ ' + response.data.message });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.message || 'Error al eliminar formulario') 
      });
    }
  };

  const getFormulariosFiltrados = () => {
    if (filtroEstado === 'TODOS') {
      return formularios;
    }
    return formularios.filter(form => form.estado === filtroEstado);
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'produccion':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                  <option value="Cobre">Cobre</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Esmeraldas">Esmeraldas</option>
                  <option value="Caliza">Caliza</option>
                  <option value="Arcilla">Arcilla</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Horas Operativas *</label>
                <input 
                  type="number" 
                  name="horasOperativas" 
                  className="form-input"
                  value={formData.horasOperativas || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad Producción *</label>
                <input 
                  type="number" 
                  name="cantidadProduccion" 
                  className="form-input"
                  value={formData.cantidadProduccion || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unidad de Medida *</label>
              <select 
                name="unidadMedida" 
                className="form-select"
                value={formData.unidadMedida || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Metros Cúbicos (m³)">Metros Cúbicos (m³)</option>
                <option value="Toneladas (t)">Toneladas (t)</option>
                <option value="Kilogramos (kg)">Kilogramos (kg)</option>
                <option value="Gramos (g)">Gramos (g)</option>
                <option value="Onzas (oz)">Onzas (oz)</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Material Entra Planta</label>
                <input 
                  type="number" 
                  name="materialEntraPlanta" 
                  className="form-input"
                  value={formData.materialEntraPlanta || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material Sale Planta</label>
                <input 
                  type="number" 
                  name="materialSalePlanta" 
                  className="form-input"
                  value={formData.materialSalePlanta || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Masa Unitaria</label>
              <input 
                type="number" 
                name="masaUnitaria" 
                className="form-input"
                value={formData.masaUnitaria || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'inventarios':
        return (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Mineral *</label>
                <select 
                  name="mineral" 
                  className="form-select"
                  value={formData.mineral || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Plata">Plata</option>
                  <option value="Oro">Oro</option>
                  <option value="Cobre">Cobre</option>
                  <option value="Carbón">Carbón</option>
                  <option value="Esmeraldas">Esmeraldas</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Corte *</label>
                <input 
                  type="date" 
                  name="fechaCorte" 
                  className="form-input"
                  value={formData.fechaCorte || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unidad de Medida *</label>
              <select 
                name="unidadMedida" 
                className="form-select"
                value={formData.unidadMedida || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Metros Cúbicos (m³)">Metros Cúbicos (m³)</option>
                <option value="Toneladas (t)">Toneladas (t)</option>
                <option value="Kilogramos (kg)">Kilogramos (kg)</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Inventario Inicial Frente *</label>
                <input 
                  type="number" 
                  name="inventarioInicialFrente" 
                  className="form-input"
                  value={formData.inventarioInicialFrente || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inventario Final Frente *</label>
                <input 
                  type="number" 
                  name="inventarioFinalFrente" 
                  className="form-input"
                  value={formData.inventarioFinalFrente || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Inventario Inicial Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioInicialAcopio" 
                  className="form-input"
                  value={formData.inventarioInicialAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inventario Final Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioFinalAcopio" 
                  className="form-input"
                  value={formData.inventarioFinalAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Ingreso Acopio *</label>
                <input 
                  type="number" 
                  name="ingresoAcopio" 
                  className="form-input"
                  value={formData.ingresoAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Salida Acopio *</label>
                <input 
                  type="number" 
                  name="salidaAcopio" 
                  className="form-input"
                  value={formData.salidaAcopio || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      case 'paradas':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Tipo de Parada *</label>
              <select 
                name="tipoParada" 
                className="form-select"
                value={formData.tipoParada || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Programada">Programada</option>
                <option value="No programada">No programada</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Clima">Clima</option>
                <option value="Falta de insumos">Falta de insumos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha Inicio *</label>
                <input 
                  type="datetime-local" 
                  name="fechaInicio" 
                  className="form-input"
                  value={formData.fechaInicio || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha Fin</label>
                <input 
                  type="datetime-local" 
                  name="fechaFin" 
                  className="form-input"
                  value={formData.fechaFin || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Horas de Parada *</label>
              <input 
                type="number" 
                name="horasParadas" 
                className="form-input"
                value={formData.horasParadas || ''}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo de la Parada *</label>
              <textarea 
                name="motivo" 
                className="form-textarea"
                value={formData.motivo || ''}
                onChange={handleInputChange}
                placeholder="Describa el motivo de la parada..."
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                name="observaciones" 
                className="form-textarea"
                value={formData.observaciones || ''}
                onChange={handleInputChange}
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </>
        );

      default:
        return (
          <div className="alert alert-info">
            <AlertCircle size={20} />
            <span>Formulario en construcción para: {selectedType}</span>
          </div>
        );
    }
  };

  return (
    <div className="formularios-container">
      <header className="page-header">
        <div className="container">
          <button onClick={() => navigate('/home')} className="btn btn-outline">
            <ArrowLeft size={18} />
            Volver
          </button>
          <div className="header-content">
            <h1>📝 Gestión de Formularios FRI</h1>
            {borradoresCount > 0 && (
              <button 
                className="btn btn-warning"
                onClick={handleEnviarBorradores}
                disabled={loading}
              >
                <Send size={18} />
                Enviar {borradoresCount} Borrador{borradoresCount > 1 ? 'es' : ''}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="page-main">
        <div className="container">
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })}>
                <X size={18} />
              </button>
            </div>
          )}

          {view === 'select' && (
            <div className="formularios-grid">
              {tiposFormularios.map((tipo) => (
                <div key={tipo.id} className="formulario-card">
                  <div className="card-icon">{tipo.icon}</div>
                  <h3>{tipo.nombre}</h3>
                  <div className="card-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleTypeSelect(tipo.id)}
                    >
                      <Plus size={18} />
                      Crear
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleListView(tipo.id)}
                    >
                      <List size={18} />
                      Listar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'create' && (
            <div className="form-section">
              <div className="form-header">
                <h2>
                  {tiposFormularios.find(t => t.id === selectedType)?.icon}{' '}
                  {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                </h2>
                <button 
                  className="btn btn-outline"
                  onClick={() => setView('select')}
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="formulario-form">
                {renderFormFields()}

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Guardar Formulario
                      </>
                    )}
                  </button>
                  <button 
                    type="reset" 
                    className="btn btn-secondary"
                    onClick={() => setFormData({})}
                  >
                    <X size={18} />
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'list' && (
            <div className="list-section">
              <div className="list-header">
                <h2>
                  {tiposFormularios.find(t => t.id === selectedType)?.icon}{' '}
                  {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                </h2>
                <div className="list-actions">
                  <div className="filter-group">
                    <Filter size={18} />
                    <select 
                      className="filter-select"
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <option value="TODOS">Todos</option>
                      <option value="BORRADOR">Borradores</option>
                      <option value="ENVIADO">Enviados</option>
                      <option value="APROBADO">Aprobados</option>
                      <option value="RECHAZADO">Rechazados</option>
                    </select>
                  </div>
                  <button 
                    className="btn btn-outline"
                    onClick={() => setView('select')}
                  >
                    <ArrowLeft size={18} />
                    Volver
                  </button>
                </div>
              </div>

              <div className="list-content">
                {loading ? (
                  <div className="loading-container">
                    <span className="loading-spinner"></span>
                    <p>Cargando formularios...</p>
                  </div>
                ) : getFormulariosFiltrados().length === 0 ? (
                  <div className="alert alert-info">
                    <AlertCircle size={20} />
                    <span>No hay formularios {filtroEstado !== 'TODOS' ? `en estado ${filtroEstado}` : 'registrados'}</span>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="formularios-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th>Usuario</th>
                          <th>Detalles</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFormulariosFiltrados().map((form) => (
                          <tr key={form.id}>
                            <td><code>{form.id.substring(0, 8)}</code></td>
                            <td>{new Date(form.fechaCorte || form.createdAt).toLocaleDateString('es-CO')}</td>
                            <td>
                              <span className={`badge badge-${form.estado?.toLowerCase() || 'borrador'}`}>
                                {form.estado || 'BORRADOR'}
                              </span>
                            </td>
                            <td>{form.usuario?.nombre || 'N/A'}</td>
                            <td className="detalles-cell">
                              {form.mineral && <div><strong>Mineral:</strong> {form.mineral}</div>}
                              {form.tipoParada && <div><strong>Tipo:</strong> {form.tipoParada}</div>}
                              {form.horasOperativas && <div><strong>Horas:</strong> {form.horasOperativas}</div>}
                              {form.horasParadas && <div><strong>Horas parada:</strong> {form.horasParadas}</div>}
                            </td>
                            <td>
                              <div className="action-buttons">
                                {form.estado === 'BORRADOR' && (
                                  <button 
                                    className="btn-icon btn-primary" 
                                    title="Enviar"
                                    onClick={() => handleCambiarEstado(form.id, 'ENVIADO')}
                                  >
                                    <Send size={16} />
                                  </button>
                                )}
                                <button 
                                  className="btn-icon btn-danger" 
                                  title="Eliminar"
                                  onClick={() => handleDeleteFormulario(form.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Formularios;