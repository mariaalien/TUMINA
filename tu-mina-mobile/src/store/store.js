// src/store/store.js
// Configuración del store de Redux

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import ciclosReducer from './ciclosSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ciclos: ciclosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar estas acciones en la verificación de serialización
        ignoredActions: ['ciclos/setLocation'],
      },
    }),
});

export default store;