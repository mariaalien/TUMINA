import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/api';
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await reportService.getDashboardStats();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      // Datos de ejemplo para demostración
      setDashboardData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    return {
      kpis: {
        totalProduccion: 12450,
        totalInventario: 3200,
        paradas: 15,
        eficiencia: 87.5,
      },
      produccionMensual: [
        { mes: 'Ene', produccion: 980, meta: 1000 },
        { mes: 'Feb', produccion: 1050, meta: 1000 },
        { mes: 'Mar', produccion: 920, meta: 1000 },
        { mes: 'Abr', produccion: 1100, meta: 1000 },
        { mes: 'May', produccion: 1080, meta: 1000 },
        { mes: 'Jun', produccion: 1150, meta: 1000 },
      ],
      distribucionMinerales: [
        { nombre: 'Oro', valor: 3500, porcentaje: 28 },
        { nombre: 'Arena', valor: 4200, porcentaje: 34 },
        { nombre: 'Grava', valor: 2800, porcentaje: 22 },
        { nombre: 'Arcilla', valor: 1950, porcentaje: 16 },
      ],
      estadosFormularios: [
        { estado: 'Aprobados', cantidad: 198 },
        { estado: 'Pendientes', cantidad: 32 },
        { estado: 'Rechazados', cantidad: 15 },
        { estado: 'Borradores', cantidad: 28 },
      ],
      ultimasParadas: [
        { fecha: '2024-11-01', tipo: 'Mantenimiento', duracion: 4.5, motivo: 'Mantenimiento preventivo' },
        { fecha: '2024-10-28', tipo: 'Falla', duracion: 8.0, motivo: 'Falla eléctrica' },
        { fecha: '2024-10-25', tipo: 'Climática', duracion: 12.0, motivo: 'Lluvia intensa' },
        { fecha: '2024-10-20', tipo: 'Administrativa', duracion: 2.0, motivo: 'Reunión de seguridad' },
      ],
    };
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="loading-container">
        <span className="loading"></span>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <div className="container">
          <button onClick={() => navigate('/home')} className="btn btn-outline">
            <ArrowLeft size={18} />
            Volver
          </button>
          <h1>📊 Dashboard Analítico</h1>
        </div>
      </header>

      <main className="page-main">
        <div className="container">
          {/* KPIs */}
          <section className="kpi-section fade-in">
            <div className="grid grid-4">
              <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                <div className="kpi-icon" style={{ background: '#dbeafe' }}>
                  <Activity size={24} color="#2563eb" />
                </div>
                <div className="kpi-content">
                  <h4>Producción Total</h4>
                  <h3>{dashboardData.kpis.totalProduccion.toLocaleString()} Ton</h3>
                  <div className="kpi-trend positive">
                    <TrendingUp size={16} />
                    <span>+12% vs mes anterior</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="kpi-icon" style={{ background: '#d1fae5' }}>
                  <Activity size={24} color="#10b981" />
                </div>
                <div className="kpi-content">
                  <h4>Inventario Actual</h4>
                  <h3>{dashboardData.kpis.totalInventario.toLocaleString()} Ton</h3>
                  <div className="kpi-trend positive">
                    <TrendingUp size={16} />
                    <span>+5% vs mes anterior</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="kpi-icon" style={{ background: '#fef3c7' }}>
                  <Activity size={24} color="#f59e0b" />
                </div>
                <div className="kpi-content">
                  <h4>Paradas Totales</h4>
                  <h3>{dashboardData.kpis.paradas}</h3>
                  <div className="kpi-trend negative">
                    <TrendingDown size={16} />
                    <span>+3 vs mes anterior</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className="kpi-icon" style={{ background: '#ede9fe' }}>
                  <Activity size={24} color="#8b5cf6" />
                </div>
                <div className="kpi-content">
                  <h4>Eficiencia</h4>
                  <h3>{dashboardData.kpis.eficiencia}%</h3>
                  <div className="kpi-trend positive">
                    <TrendingUp size={16} />
                    <span>+2.5% vs mes anterior</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Charts Row 1 */}
          <section className="charts-section fade-in">
            <div className="grid grid-2">
              {/* Producción Mensual */}
              <div className="card">
                <h3>📈 Producción Mensual vs Meta</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.produccionMensual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="produccion"
                      stroke="#2563eb"
                      strokeWidth={3}
                      name="Producción"
                    />
                    <Line
                      type="monotone"
                      dataKey="meta"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Meta"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Distribución de Minerales */}
              <div className="card">
                <h3>🎯 Distribución por Mineral</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.distribucionMinerales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nombre, porcentaje }) => `${nombre}: ${porcentaje}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="valor"
                    >
                      {dashboardData.distribucionMinerales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Charts Row 2 */}
          <section className="charts-section fade-in">
            <div className="grid grid-2">
              {/* Estados de Formularios */}
              <div className="card">
                <h3>📋 Estado de Formularios</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.estadosFormularios}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="estado" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cantidad" fill="#2563eb" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla de Últimas Paradas */}
              <div className="card">
                <h3>⏸️ Últimas Paradas de Producción</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Duración</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.ultimasParadas.map((parada, index) => (
                        <tr key={index}>
                          <td>{parada.fecha}</td>
                          <td>
                            <span className={`badge badge-${parada.tipo.toLowerCase()}`}>
                              {parada.tipo}
                            </span>
                          </td>
                          <td>{parada.duracion}h</td>
                          <td>{parada.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Resumen Estadístico */}
          <section className="summary-section fade-in">
            <div className="card">
              <h3>📊 Resumen Estadístico del Período</h3>
              <div className="grid grid-4">
                {dashboardData.distribucionMinerales.map((mineral, index) => (
                  <div key={index} className="summary-item">
                    <div className="summary-icon" style={{ background: COLORS[index] }}>
                      {mineral.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4>{mineral.nombre}</h4>
                      <p>{mineral.valor.toLocaleString()} Ton</p>
                      <span className="text-gray">{mineral.porcentaje}% del total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
