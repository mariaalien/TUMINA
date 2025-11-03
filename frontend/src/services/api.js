import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Configurar axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Autenticación
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/perfil');
    return response.data;
  },
};

// Formularios FRI
export const friService = {
  // Producción
  getProduccion: (params) => api.get('/fri/produccion', { params }),
  createProduccion: (data) => api.post('/fri/produccion', data),
  updateProduccion: (id, data) => api.put(`/fri/produccion/${id}`, data),
  deleteProduccion: (id) => api.delete(`/fri/produccion/${id}`),
  cambiarEstadoProduccion: (id, estado) => api.put(`/fri/produccion/${id}/estado`, { estado }),
  
  // Inventarios
  getInventarios: (params) => api.get('/fri/inventarios', { params }),
  createInventarios: (data) => api.post('/fri/inventarios', data),
  updateInventarios: (id, data) => api.put(`/fri/inventarios/${id}`, data),
  deleteInventarios: (id) => api.delete(`/fri/inventarios/${id}`),
  cambiarEstadoInventarios: (id, estado) => api.put(`/fri/inventarios/${id}/estado`, { estado }),
  
  // Paradas
  getParadas: (params) => api.get('/fri/paradas', { params }),
  createParadas: (data) => api.post('/fri/paradas', data),
  updateParadas: (id, data) => api.put(`/fri/paradas/${id}`, data),
  deleteParadas: (id) => api.delete(`/fri/paradas/${id}`),
  cambiarEstadoParadas: (id, estado) => api.put(`/fri/paradas/${id}/estado`, { estado }),
  
  // Ejecución
  getEjecucion: (params) => api.get('/fri/ejecucion', { params }),
  createEjecucion: (data) => api.post('/fri/ejecucion', data),
  updateEjecucion: (id, data) => api.put(`/fri/ejecucion/${id}`, data),
  deleteEjecucion: (id) => api.delete(`/fri/ejecucion/${id}`),
  cambiarEstadoEjecucion: (id, estado) => api.put(`/fri/ejecucion/${id}/estado`, { estado }),
  
  // Maquinaria
  getMaquinaria: (params) => api.get('/fri/maquinaria', { params }),
  createMaquinaria: (data) => api.post('/fri/maquinaria', data),
  updateMaquinaria: (id, data) => api.put(`/fri/maquinaria/${id}`, data),
  deleteMaquinaria: (id) => api.delete(`/fri/maquinaria/${id}`),
  cambiarEstadoMaquinaria: (id, estado) => api.put(`/fri/maquinaria/${id}/estado`, { estado }),
  
  // Regalías
  getRegalias: (params) => api.get('/fri/regalias', { params }),
  createRegalias: (data) => api.post('/fri/regalias', data),
  updateRegalias: (id, data) => api.put(`/fri/regalias/${id}`, data),
  deleteRegalias: (id) => api.delete(`/fri/regalias/${id}`),
  cambiarEstadoRegalias: (id, estado) => api.put(`/fri/regalias/${id}/estado`, { estado }),

  // Borradores
  getBorradoresCount: () => api.get('/fri/borradores/count'),
  enviarBorradores: () => api.post('/fri/enviar-borradores'),
};

// Reportes y Exportación
export const reportService = {
  getDashboardStats: () => api.get('/reportes/dashboard'),
  exportToExcel: (params) => api.post('/reportes/exportar-anm', params, {
    responseType: 'blob'
  }),
  exportToPDF: (params) => api.post('/reportes/exportar-pdf', params, {
    responseType: 'blob'
  }),
  getChartData: (type, params) => api.get(`/reportes/charts/${type}`, { params }),
};

// Títulos Mineros
export const tituloMineroService = {
  getAll: () => api.get('/titulos-mineros'),
  getById: (id) => api.get(`/titulos-mineros/${id}`),
  create: (data) => api.post('/titulos-mineros', data),
  update: (id, data) => api.put(`/titulos-mineros/${id}`, data),
  delete: (id) => api.delete(`/titulos-mineros/${id}`),
};

// Usuarios
export const userService = {
  getProfile: () => api.get('/auth/perfil'),
  updateProfile: (data) => api.put('/auth/perfil', data),
  getAllUsers: () => api.get('/usuarios'),
};

export default api;
