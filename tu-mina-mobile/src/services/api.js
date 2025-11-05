// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔵 API_BASE_URL configurada:', API_BASE_URL);

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Error en API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==========================================
// AUTH SERVICE
// ==========================================

export const authService = {
  login: async (email, password) => {
  try {
    console.log('🔵 Login request a:', `${API_BASE_URL}${ENDPOINTS.LOGIN}`);
    console.log('📧 Email:', email);
    
    const response = await api.post(ENDPOINTS.LOGIN, { 
      email, 
      password 
    });
    
    console.log('🔵 Login response:', JSON.stringify(response, null, 2));

    if (response && response.success) {
      console.log('💾 Guardando datos en AsyncStorage...');
      
      // ⚠️ CORRECCIÓN: response.token NO response.data.token
      const token = response.token;
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      console.log('✅ Token guardado:', token.substring(0, 30) + '...');
      
      // ⚠️ CORRECCIÓN: response.usuario NO response.data.usuario
      const usuario = response.usuario;
      const userDataString = JSON.stringify(usuario);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, userDataString);
      console.log('✅ Usuario guardado:', userDataString);
      
      // VERIFICAR que se guardó
      const verificar = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      console.log('🔍 Verificación - userData guardado:', verificar);
      
      return response;
    } else {
      console.log('❌ Response sin success:', response);
    }

    return response;
  } catch (error) {
    console.error('❌ Error en login:', error);
    console.error('❌ Error response:', error.response?.data);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Error de conexión'
    };
  }
},

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  },
};

logout: async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    console.log('✅ Sesión cerrada');
  } catch (error) {
    console.error('Error en logout:', error);
  }
};


// ==========================================
// ANDROID SERVICE
// ==========================================
export const androidService = {
  getPuntosReferencia: async (tituloMineroId) => {
    try {
      console.log('📍 Petición a:', `${API_BASE_URL}${ENDPOINTS.PUNTOS_REFERENCIA(tituloMineroId)}`);
      const response = await api.get(ENDPOINTS.PUNTOS_REFERENCIA(tituloMineroId));
      console.log('✅ Respuesta puntos:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo puntos:', error);
      throw error;
    }
  },

  iniciarRegistro: async (data) => {
    try {
      const response = await api.post(ENDPOINTS.INICIAR_REGISTRO, data);
      return response;
    } catch (error) {
      console.error('Error iniciando registro:', error);
      throw error;
    }
  },

  registrarCiclo: async (cicloData) => {
    try {
      console.log('💾 Guardando ciclo:', cicloData);
      const response = await api.post(ENDPOINTS.REGISTRAR_CICLO, cicloData);
      console.log('✅ Ciclo guardado:', response);
      return response;
    } catch (error) {
      console.error('❌ Error guardando ciclo:', error);
      throw error;
    }
  },

  registrarCiclosBatch: async (ciclosData) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTRAR_CICLOS_BATCH, { ciclos: ciclosData });
      return response;
    } catch (error) {
      console.error('Error registrando ciclos batch:', error);
      throw error;
    }
  },

  getCiclosDelDia: async (usuarioId, tituloMineroId) => {
    try {
      const response = await api.get(ENDPOINTS.CICLOS_DEL_DIA(usuarioId, tituloMineroId));
      return response;
    } catch (error) {
      console.error('Error obteniendo ciclos del día:', error);
      throw error;
    }
  },

   getEstadisticas: async (usuarioId, tituloMineroId) => {
    try {
      console.log('📊 Obteniendo estadísticas:', { usuarioId, tituloMineroId });
      const response = await api.get(ENDPOINTS.ESTADISTICAS(usuarioId, tituloMineroId));
      console.log('📊 Respuesta estadísticas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      // Retornar objeto por defecto en caso de error
      return {
        success: false,
        data: {
          ciclosHoy: 0,
          volumenHoy: 0,
        },
        error: error.message,
      };
    }
  },
};

export const actividadService = {
  registrarPunto: async (punto) => {
    try {
      console.log('📍 Registrando punto:', punto);
      const response = await api.post('/actividad/punto', punto);
      return response;
    } catch (error) {
      console.error('Error registrando punto:', error);
      throw error;
    }
  },

  getPuntos: async (tituloMineroId, filtros = {}) => {
    try {
      const params = new URLSearchParams(filtros).toString();
      const url = `/actividad/puntos/${tituloMineroId}${params ? '?' + params : ''}`;
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('Error obteniendo puntos:', error);
      throw error;
    }
  },

  getEstadisticas: async (tituloMineroId) => {
    try {
      const response = await api.get(`/actividad/puntos/${tituloMineroId}/estadisticas`);
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
};

export default api;