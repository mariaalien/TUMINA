import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, reportService } from '../services/api';
import { 
  FileText, 
  BarChart3, 
  Download, 
  User, 
  LogOut,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [borradoresCount, setBorradoresCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadStats();
    loadBorradores();
  }, []);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const loadStats = async () => {
    try {
      const response = await reportService.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Datos de ejemplo si falla la petición
      setStats({
        totalFormularios: 245,
        formulariosPendientes: 12,
        formulariosAprobados: 198,
        formulariosMes: 45,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBorradores = async () => {
    try {
      const response = await friService.getBorradoresCount();
      if (response.data.success) {
        setBorradoresCount(response.data.total);
      }
    } catch (error) {
      console.error('Error cargando borradores:', error);
    }
  };

  const handleEnviarBorradores = async () => {
    if (borradoresCount === 0) {
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ENVIAR todos los ${borradoresCount} borradores?\n\n` +
      'Esto cambiará su estado y ya no podrás editarlos.'
    );

    if (!confirmar) return;

    try {
      const response = await friService.enviarBorradores();
      if (response.data.success) {
        alert('✅ ' + response.data.message);
        loadBorradores();
      }
    } catch (error) {
      alert('❌ Error al enviar borradores: ' + error.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const quickActions = [
    {
      icon: <FileText size={32} />,
      title: 'Llenar Formularios',
      description: 'Crear y gestionar formularios FRI',
      path: '/formularios',
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Dashboard',
      description: 'Ver estadísticas y análisis',
      path: '/dashboard',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    },
    {
      icon: <Download size={32} />,
      title: 'Exportar Reportes',
      description: 'Generar PDF y Excel',
      path: '/reportes',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <img src="/logo.png" alt="Logo TU MINA" width="50" height="50"
                 style={{ borderRadius: '8px', objectFit: 'contain' }} />
              </div>
              <div>
                <h1>TU MINA</h1>
                <p>CTGlobal</p>
              </div>
            </div>
            
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.nombre || 'Usuario'}</p>
                  <span className={`badge badge-${user?.rol?.toLowerCase() || 'info'}`}>
                    {user?.rol || 'OPERADOR'}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-outline btn-logout">
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-main">
        <div className="container">
          {/* Welcome Section */}
          <section className="welcome-section fade-in">
            <div className="welcome-card">
              <div className="welcome-content">
                <h2>👋 ¡Bienvenido, {user?.nombre}!</h2>
                <p>Gestiona los formularios de recolección de información de la Agencia Nacional de Minería</p>
                <div className="welcome-meta">
                  <span>
                    <Building2 size={16} />
                    {user?.tituloMinero?.numeroTitulo || 'Sin título asignado'}
                  </span>
                  <span>
                    <Building2 size={16} />
                    {user?.tituloMinero?.municipio || 'N/A'}
                  </span>
                  <span>
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('es-CO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Alerta de Borradores */}
            {borradoresCount > 0 && (
              <div className="card" style={{ 
                background: '#fff3cd', 
                border: '2px solid #ffc107',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>📝 Borradores pendientes:</strong> {borradoresCount}
                    <p style={{ margin: '0.5rem 0 0 0', color: '#856404' }}>
                      Tienes formularios en estado borrador que aún no has enviado
                    </p>
                  </div>
                  <button 
                    onClick={handleEnviarBorradores}
                    className="btn btn-primary"
                  >
                    📤 Enviar Todos
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Stats Cards */}
          <section className="stats-section fade-in">
            <h3 className="section-title">📊 Resumen General</h3>
            <div className="grid grid-4">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="stat-icon">
                  <FileText size={24} />
                </div>
                <div className="stat-info">
                  <h4>{stats?.totalFormularios || 0}</h4>
                  <p>Total Formularios</p>
                </div>
              </div>
              
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <div className="stat-icon">
                  <AlertCircle size={24} />
                </div>
                <div className="stat-info">
                  <h4>{stats?.formulariosPendientes || 0}</h4>
                  <p>Pendientes</p>
                </div>
              </div>
              
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <div className="stat-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-info">
                  <h4>{stats?.formulariosAprobados || 0}</h4>
                  <p>Aprobados</p>
                </div>
              </div>
              
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <div className="stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <h4>{stats?.formulariosMes || 0}</h4>
                  <p>Este Mes</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="actions-section fade-in">
            <h3 className="section-title">⚡ Accesos Rápidos</h3>
            <div className="grid grid-3">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="action-card"
                  onClick={() => navigate(action.path)}
                  style={{ 
                    '--gradient': action.gradient,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="action-icon" style={{ color: action.color }}>
                    {action.icon}
                  </div>
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                  <div className="action-arrow">→</div>
                </div>
              ))}
            </div>
          </section>

          {/* Info Section */}
          <section className="info-section fade-in">
            <div className="grid grid-2">
              <div className="card">
                <h4>📋 Tipos de Formularios Disponibles</h4>
                <ul className="info-list">
                  <li>✅ FRI Producción (Mensual)</li>
                  <li>✅ FRI Inventarios (Mensual)</li>
                  <li>✅ FRI Paradas de Producción</li>
                  <li>✅ FRI Ejecución (Mensual)</li>
                  <li>✅ FRI Utilización de Maquinaria</li>
                  <li>✅ FRI Regalías (Trimestral)</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <p>© 2025 TU MINA | CTGlobal - Plataforma de gestión de datos | Agencia Nacional de Minería</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
