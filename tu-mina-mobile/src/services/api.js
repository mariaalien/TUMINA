// src/services/api.js
// Servicio de comunicación con el backend usando Axios

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

// ============================================
// CREAR INSTANCIA DE AXIOS
// ============================================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// INTERCEPTOR DE REQUEST
// Agregar token JWT automáticamente
// ============================================
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('📤 Request:', config.method.toUpperCase(), config.url);
      return config;
    } catch (error) {
      console.error('Error al obtener token:', error);
      return config;
    }
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTOR DE RESPONSE
// Manejar errores globalmente
// ============================================
api.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', error.response?.status, error.config?.url);
    
    // Si el token expiró (401), limpiar sesión
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.TITULO_MINERO_ID,
      ]);
      // Aquí podrías redirigir al login si tienes acceso a la navegación
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// SERVICIOS DE AUTENTICACIÓN
// ============================================
export const authService = {
  /**
   * Login de usuario
   */
  login: async (email, password) => {
    try {
      const response = await api.post(ENDPOINTS.LOGIN, { email, password });
      
      if (response.data.success && response.data.token) {
        // Guardar token y datos del usuario
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, response.data.usuario.id);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, response.data.usuario.nombre);
        
        if (response.data.usuario.tituloMineroId) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.TITULO_MINERO_ID,
            response.data.usuario.tituloMineroId
          );
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  /**
   * Logout de usuario
   */
  logout: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.TITULO_MINERO_ID,
      ]);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  },

  /**
   * Obtener datos del usuario actual
   */
  getUserData: async () => {
    try {
      const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userName = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
      const tituloMineroId = await AsyncStorage.getItem(STORAGE_KEYS.TITULO_MINERO_ID);
      
      return { userId, userName, tituloMineroId };
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      return null;
    }
  },

  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },
};

// ============================================
// SERVICIOS DE PRODUCCIÓN (ANDROID)
// ============================================
export const produccionService = {
  /**
   * Obtener puntos de referencia
   */
  getPuntosReferencia: async (tituloMineroId) => {
    try {
      const response = await api.get(ENDPOINTS.PUNTOS_REFERENCIA(tituloMineroId));
      return response.data;
    } catch (error) {
      console.error('Error al obtener puntos:', error);
      throw error;
    }
  },

  /**
   * Iniciar sesión de registro
   */
  iniciarRegistro: async (data) => {
    try {
      const response = await api.post(ENDPOINTS.INICIAR_REGISTRO, data);
      return response.data;
    } catch (error) {
      console.error('Error al iniciar registro:', error);
      throw error;
    }
  },

  /**
   * Registrar un ciclo completado
   */
  registrarCiclo: async (ciclo) => {
    try {
      const response = await api.post(ENDPOINTS.REGISTRAR_CICLO, ciclo);
      return response.data;
    } catch (error) {
      console.error('Error al registrar ciclo:', error);
      throw error;
    }
  },

  /**
   * Obtener ciclos del día
   */
  getCiclosDelDia: async (usuarioId, tituloMineroId) => {
    try {
      const response = await api.get(ENDPOINTS.CICLOS_DEL_DIA(usuarioId, tituloMineroId));
      return response.data;
    } catch (error) {
      console.error('Error al obtener ciclos del día:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas
   */
  getEstadisticas: async (usuarioId, tituloMineroId, fechaInicio, fechaFin) => {
    try {
      let url = ENDPOINTS.ESTADISTICAS(usuarioId, tituloMineroId);
      if (fechaInicio && fechaFin) {
        url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },
};

export default api;