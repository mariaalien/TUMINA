// src/store/ciclosSlice.js
// Slice para manejar el estado de los ciclos de producción

import { createSlice } from '@reduxjs/toolkit';
import { ESTADO_CICLO } from '../utils/constants';

const initialState = {
  // Datos de la sesión de registro
  sesionActiva: false,
  tipoMaquina: null,
  capacidadMaxM3: null,
  
  // Puntos de referencia
  puntoRecoleccion: null,
  puntoAcopio: null,
  
  // Estado del tracking
  estadoActual: ESTADO_CICLO.EN_PUNTO_RECOLECCION,
  ubicacionActual: null,
  
  // Ciclos completados
  ciclosCompletados: [],
  numeroCicloActual: 1,
  
  // Ciclo en progreso
  cicloEnProgreso: null,
  horaInicioCiclo: null,
  ubicacionInicioCiclo: null,
  
  // Estadísticas del día
  ciclosDelDia: [],
  totalCiclosHoy: 0,
  
  // Estado de carga
  loading: false,
  error: null,
};

const ciclosSlice = createSlice({
  name: 'ciclos',
  initialState,
  reducers: {
    // Iniciar sesión de registro
    iniciarSesion: (state, action) => {
      state.sesionActiva = true;
      state.tipoMaquina = action.payload.tipoMaquina;
      state.capacidadMaxM3 = action.payload.capacidadMaxM3;
      state.puntoRecoleccion = action.payload.puntoRecoleccion;
      state.puntoAcopio = action.payload.puntoAcopio;
      state.estadoActual = ESTADO_CICLO.EN_PUNTO_RECOLECCION;
      state.numeroCicloActual = 1;
      state.ciclosCompletados = [];
    },
    
    // Finalizar sesión de registro
    finalizarSesion: (state) => {
      state.sesionActiva = false;
      state.estadoActual = ESTADO_CICLO.EN_PUNTO_RECOLECCION;
      state.cicloEnProgreso = null;
      state.horaInicioCiclo = null;
      state.ubicacionInicioCiclo = null;
    },
    
    // Actualizar ubicación
    setLocation: (state, action) => {
      state.ubicacionActual = action.payload;
    },
    
    // Cambiar estado del ciclo
    setEstadoCiclo: (state, action) => {
      state.estadoActual = action.payload;
    },
    
    // Iniciar un nuevo ciclo (cuando sale del punto A)
    iniciarCiclo: (state, action) => {
      state.estadoActual = ESTADO_CICLO.EN_RUTA_A_ACOPIO;
      state.horaInicioCiclo = new Date().toISOString();
      state.ubicacionInicioCiclo = action.payload;
    },
    
    // Completar un ciclo (cuando regresa al punto A)
    completarCiclo: (state, action) => {
      state.ciclosCompletados.push(action.payload);
      state.numeroCicloActual += 1;
      state.estadoActual = ESTADO_CICLO.EN_PUNTO_RECOLECCION;
      state.cicloEnProgreso = null;
      state.horaInicioCiclo = null;
      state.ubicacionInicioCiclo = null;
    },
    
    // Cargar ciclos del día
    setCiclosDelDia: (state, action) => {
      state.ciclosDelDia = action.payload;
      state.totalCiclosHoy = action.payload.length;
    },
    
    // Loading states
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset completo
    resetCiclos: () => initialState,
  },
});

export const {
  iniciarSesion,
  finalizarSesion,
  setLocation,
  setEstadoCiclo,
  iniciarCiclo,
  completarCiclo,
  setCiclosDelDia,
  setLoading,
  setError,
  clearError,
  resetCiclos,
} = ciclosSlice.actions;

export default ciclosSlice.reducer;

// Selectores
export const selectCiclos = (state) => state.ciclos;
export const selectSesionActiva = (state) => state.ciclos.sesionActiva;
export const selectEstadoActual = (state) => state.ciclos.estadoActual;
export const selectCiclosCompletados = (state) => state.ciclos.ciclosCompletados;
export const selectTotalCiclosHoy = (state) => state.ciclos.totalCiclosHoy;