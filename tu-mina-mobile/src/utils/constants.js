import { Platform } from 'react-native';

// ⚠️ IMPORTANTE: Para emulador Android usa 10.0.2.2 en lugar de localhost
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',  // Emulador Android
  ios: 'http://localhost:5000/api',      // Simulador iOS
  default: 'https://dressiest-baylee-complimentingly.ngrok-free.dev/api', // iPhone físico
});

console.log('🔵 API_BASE_URL configurada:', API_BASE_URL);

export const ENDPOINTS = {
  LOGIN: '/auth/login',
  PERFIL: '/auth/perfil',
  PUNTOS_REFERENCIA: (tituloMineroId) => `/android/puntos/${tituloMineroId}`,
  INICIAR_REGISTRO: '/android/iniciar',
  REGISTRAR_CICLO: '/android/ciclo',
  REGISTRAR_CICLOS_BATCH: '/android/ciclos-batch',
  CICLOS_DEL_DIA: (usuarioId, tituloMineroId) => `/android/ciclos/${usuarioId}/${tituloMineroId}`,
  ESTADISTICAS: (usuarioId, tituloMineroId) => `/android/estadisticas/${usuarioId}/${tituloMineroId}`,
};

export const STORAGE_KEYS = {
  TOKEN: '@tu_mina_token',
  USER_DATA: '@tu_mina_user_data',
};

export const LOCATION_CONFIG = {
  ACCURACY: 'high',
  TIME_INTERVAL: 5000,
  DISTANCE_INTERVAL: 10,
};

export const ESTADO_CICLO = {
  ESPERANDO: 'ESPERANDO',
  EN_PUNTO_RECOLECCION: 'EN_R',
  EN_RUTA_A_ACOPIO: 'RUTA_A',
  EN_PUNTO_ACOPIO: 'EN_A',
  EN_RUTA_A_RECOLECCION: 'RUTA_R',
};

export const TIPO_PUNTO = {
  RECOLECCION: 'RECOLECCION',
  ACOPIO: 'ACOPIO',
};

export const TIPOS_MAQUINARIA = [
  { value: 'Excavadora', label: '🚜 Excavadora', capacidadDefecto: 30 },
  { value: 'Retroexcavadora', label: '🏗️ Retroexcavadora', capacidadDefecto: 25 },
  { value: 'Cargador', label: '🚛 Cargador Frontal', capacidadDefecto: 35 },
  { value: 'Bulldozer', label: '🚧 Bulldozer', capacidadDefecto: 40 },
  { value: 'Volqueta', label: '🚚 Volqueta', capacidadDefecto: 50 },
  { value: 'Motoniveladora', label: '🛣️ Motoniveladora', capacidadDefecto: 20 },
];

export const VALIDACIONES = {
  MAX_CAPACIDAD_M3: 100,
  MIN_CAPACIDAD_M3: 1,
};