// src/utils/constants.js
// Configuración y constantes de la aplicación

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

// IMPORTANTE: Cambiar según tu entorno
// Para emulador Android: http://10.0.2.2:5000
// Para dispositivo físico: http://TU_IP_LOCAL:5000
// Para web (desarrollo): http://localhost:5000
import { Platform } from 'react-native';
import THEME from './theme';

export const API_BASE_URL = __DEV__ 
  ? Platform.select({
      // Para Android Emulator
      android: 'http://10.0.2.2:5000/api',
      // Para iOS Simulator
      ios: 'http://localhost:5000/api',
      // Para Web
      web: 'http://localhost:5000/api',
      // Para dispositivo físico, usar tu IP local
      default: 'http://192.168.1.X:5000/api', // Cambiar X por tu IP
    })
  : 'http://TU_IP_PRODUCCION:5000/api';

// ============================================
// ENDPOINTS
// ============================================
export const ENDPOINTS = {
  // Autenticación
  LOGIN: '/auth/login',
  PROFILE: '/auth/perfil',
  
  // Android/Mobile
  PUNTOS_REFERENCIA: (tituloMineroId) => `/android/puntos/${tituloMineroId}`,
  INICIAR_REGISTRO: '/android/iniciar-registro',
  REGISTRAR_CICLO: '/android/registrar-ciclo',
  CICLOS_DEL_DIA: (usuarioId, tituloMineroId) => `/android/ciclos-del-dia/${usuarioId}/${tituloMineroId}`,
  ESTADISTICAS: (usuarioId, tituloMineroId) => `/android/estadisticas/${usuarioId}/${tituloMineroId}`,
};

// ============================================
// CONFIGURACIÓN DE UBICACIÓN
// ============================================
export const LOCATION_CONFIG = {
  // Radio de influencia de los puntos (en metros)
  RADIO_INFLUENCIA: 50,
  
  // Intervalo de actualización de GPS (en milisegundos)
  // 5000 = 5 segundos
  UPDATE_INTERVAL: 5000,
  
  // Distancia mínima para actualizar (en metros)
  MIN_DISTANCE: 10,
  
  // Precisión deseada
  ACCURACY: 'high', // 'low', 'balanced', 'high', 'best'
};

// ============================================
// ESTADOS DE CICLO
// ============================================
export const ESTADO_CICLO = {
  EN_PUNTO_RECOLECCION: 'EN_PUNTO_RECOLECCION',
  EN_RUTA_A_ACOPIO: 'EN_RUTA_A_ACOPIO',
  EN_PUNTO_ACOPIO: 'EN_PUNTO_ACOPIO',
  EN_RUTA_A_RECOLECCION: 'EN_RUTA_A_RECOLECCION',
  CICLO_COMPLETADO: 'CICLO_COMPLETADO',
};

// ============================================
// TIPOS DE PUNTO
// ============================================
export const TIPO_PUNTO = {
  RECOLECCION: 'RECOLECCION',
  ACOPIO: 'ACOPIO',
};

// ============================================
// STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  TOKEN: '@tu_mina_token',
  USER_ID: '@tu_mina_user_id',
  USER_NAME: '@tu_mina_user_name',
  TITULO_MINERO_ID: '@tu_mina_titulo_id',
  CICLOS_PENDIENTES: '@tu_mina_ciclos_pendientes',
};

// ============================================
// COLORES DE LA APP
// ============================================
export const COLORS = THEME.colors;

// ============================================
// TIPOS DE MAQUINARIA
// ============================================
export const TIPOS_MAQUINARIA = [
  'Excavadora',
  'Retroexcavadora',
  'Cargador',
  'Volqueta',
  'Bulldozer',
  'Motoniveladora',
];