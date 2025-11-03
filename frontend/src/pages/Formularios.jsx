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
  Eye
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

  const tiposFormularios = [
    { id: 'produccion', nombre: 'FRI Producción (Mensual)', icon: '🏭' },
    { id: 'inventarios', nombre: 'FRI Inventarios (Mensual)', icon: '📦' },
    { id: 'paradas', nombre: 'FRI Paradas de Producción', icon: '⏸️' },
    { id: 'ejecucion', nombre: 'FRI Ejecución (Mensual)', icon: '⚙️' },
    { id: 'maquinaria', nombre: 'FRI Utilización de Maquinaria', icon: '🚜' },
    { id: 'regalias', nombre: 'FRI Regalías (Trimestral)', icon: '💰' },
  ];

  const handleTypeSelect = (tipo) => {
    setSelectedType(tipo);
    setFormData({});
    setView('create');
  };

  const handleListView = async (tipo) => {
    setSelectedType(tipo);
    setLoading(true);
    try {
      const serviceMethod = `get${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
      const response = await friService[serviceMethod]();
      
      // El backend devuelve { success: true, fris: [...] }
      if (response.data.success) {
        setFormularios(response.data.fris || []);
      } else {
        setFormularios([]);
      }
      setView('list');
    } catch (error) {
      console.error('Error al cargar formularios:', error);
      setMessage({ type: 'error', text: 'Error al cargar formularios' });
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
      const serviceMethod = `create${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
      const response = await friService[serviceMethod](formData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ ' + response.data.message });
        setFormData({});
        setTimeout(() => {
          setView('select');
        }, 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Error al crear formulario' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al crear formulario' 
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
        setMessage({ type: 'success', text: '✅ Estado actualizado correctamente' });
        handleListView(selectedType); // Recargar la lista
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Error al cambiar estado' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al cambiar estado' 
      });
    }
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
                  <option value="Oro">Oro</option>
                  <option value="Plata">Plata</option>
                  <option value="Arena">Arena</option>
                  <option value="Grava">Grava</option>
                  <option value="Arcilla">Arcilla</option>
                  <option value="Caliza">Caliza</option>
                  <option value="Carbon">Carbón</option>
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
                  min="0"
                  max="744"
                  step="0.01"
                  value={formData.horasOperativas || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad Producción *</label>
                <input 
                  type="number" 
                  name="cantidadProduccion" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.cantidadProduccion || ''}
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
                value={formData.unidadMedida || 'TONELADAS'}
                onChange={handleInputChange}
                required
              >
                <option value="TONELADAS">Toneladas</option>
                <option value="m3">Metros Cúbicos (m³)</option>
                <option value="KG">Kilogramos</option>
                <option value="GRAMOS">Gramos</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Material Entra Planta</label>
                <input 
                  type="number" 
                  name="materialEntraPlanta" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.materialEntraPlanta || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Material Sale Planta</label>
                <input 
                  type="number" 
                  name="materialSalePlanta" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.materialSalePlanta || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Masa Unitaria</label>
              <input 
                type="number" 
                name="masaUnitaria" 
                className="form-input"
                min="0"
                step="0.01"
                value={formData.masaUnitaria || ''}
                onChange={handleInputChange}
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
                  <option value="Oro">Oro</option>
                  <option value="Arena">Arena</option>
                  <option value="Grava">Grava</option>
                  <option value="Arcilla">Arcilla</option>
                  <option value="Caliza">Caliza</option>
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
                value={formData.unidadMedida || 'TONELADAS'}
                onChange={handleInputChange}
                required
              >
                <option value="TONELADAS">Toneladas</option>
                <option value="m3">Metros Cúbicos (m³)</option>
                <option value="KG">Kilogramos</option>
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Inventario Inicial Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioInicialAcopio" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.inventarioInicialAcopio || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inventario Final Acopio *</label>
                <input 
                  type="number" 
                  name="inventarioFinalAcopio" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.inventarioFinalAcopio || ''}
                  onChange={handleInputChange}
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
                  min="0"
                  step="0.01"
                  value={formData.ingresoAcopio || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Salida Acopio *</label>
                <input 
                  type="number" 
                  name="salidaAcopio" 
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={formData.salidaAcopio || ''}
                  onChange={handleInputChange}
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
              />
            </div>
          </>
        );

      case 'paradas':
        return (
          <>
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

            <div className="grid grid-2">
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

              <div className="form-group">
                <label className="form-label">Horas de Parada *</label>
                <input 
                  type="number" 
                  name="horasParadas" 
                  className="form-input"
                  min="0"
                  step="0.1"
                  value={formData.horasParadas || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
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
              <label className="form-label">Motivo de la Parada *</label>
              <textarea 
                name="motivo" 
                className="form-textarea"
                value={formData.motivo || ''}
                onChange={handleInputChange}
                placeholder="Describa el motivo de la parada..."
                required
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
              />
            </div>
          </>
        );

      default:
        return (
          <div className="alert alert-info">
            Formulario en construcción para: {selectedType}
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
          <h1>📝 Gestión de Formularios FRI</h1>
        </div>
      </header>

      <main className="page-main">
        <div className="container">
          {view === 'select' && (
            <div className="fade-in">
              <h2 className="section-title">Selecciona el tipo de formulario</h2>
              <div className="grid grid-3">
                {tiposFormularios.map((tipo) => (
                  <div key={tipo.id} className="form-type-card">
                    <div className="form-type-icon">{tipo.icon}</div>
                    <h3>{tipo.nombre}</h3>
                    <div className="form-type-actions">
                      <button 
                        onClick={() => handleTypeSelect(tipo.id)}
                        className="btn btn-primary btn-sm"
                      >
                        <Plus size={16} />
                        Crear
                      </button>
                      <button 
                        onClick={() => handleListView(tipo.id)}
                        className="btn btn-outline btn-sm"
                      >
                        <List size={16} />
                        Listar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="fade-in">
              <div className="card">
                <div className="card-header">
                  <h2>
                    {tiposFormularios.find(t => t.id === selectedType)?.icon} {' '}
                    {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                  </h2>
                  <button 
                    onClick={() => setView('select')}
                    className="btn btn-outline btn-sm"
                  >
                    <X size={18} />
                  </button>
                </div>

                {message.text && (
                  <div className={`alert alert-${message.type}`}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {renderFormFields()}

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="loading"></span>
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
                      type="button"
                      onClick={() => setView('select')}
                      className="btn btn-outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="fade-in">
              <div className="card">
                <div className="card-header">
                  <h2>
                    {tiposFormularios.find(t => t.id === selectedType)?.icon} {' '}
                    Listado - {tiposFormularios.find(t => t.id === selectedType)?.nombre}
                  </h2>
                  <button 
                    onClick={() => setView('select')}
                    className="btn btn-outline btn-sm"
                  >
                    <X size={18} />
                  </button>
                </div>

                {loading ? (
                  <div className="loading-container">
                    <span className="loading"></span>
                    <p>Cargando formularios...</p>
                  </div>
                ) : formularios.length === 0 ? (
                  <div className="alert alert-info">
                    No hay formularios registrados
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha Corte</th>
                          <th>Estado</th>
                          <th>Usuario</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formularios.map((form) => (
                          <tr key={form.id}>
                            <td>{form.id.substring(0, 8)}</td>
                            <td>{new Date(form.fechaCorte || form.createdAt).toLocaleDateString('es-CO')}</td>
                            <td>
                              <span className={`badge badge-${form.estado?.toLowerCase() || 'borrador'}`}>
                                {form.estado || 'BORRADOR'}
                              </span>
                            </td>
                            <td>{form.usuario?.nombre || 'N/A'}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn-icon" title="Ver">
                                  <Eye size={16} />
                                </button>
                                {form.estado === 'BORRADOR' && (
                                  <button 
                                    className="btn-icon" 
                                    title="Enviar"
                                    onClick={() => handleCambiarEstado(form.id, 'ENVIADO')}
                                  >
                                    📤
                                  </button>
                                )}
                                <button className="btn-icon" title="Editar">
                                  <Edit size={16} />
                                </button>
                                <button className="btn-icon btn-danger" title="Eliminar">
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
