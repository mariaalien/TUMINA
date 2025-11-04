// src/navigation/AppNavigator.js
// Navegación principal de la aplicación

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../store/authSlice';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RegistroProduccionScreen from '../screens/RegistroProduccionScreen';
import RegistroCiclosScreen from '../screens/RegistroCiclosScreen'; // ← NUEVA LÍNEA

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Stack de autenticación
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Stack principal (después de login)
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Inicio' }}
            />
            <Stack.Screen 
              name="RegistroProduccion" 
              component={RegistroProduccionScreen}
              options={{ title: 'Registro de Producción' }}
            />
            {/* ↓↓↓ NUEVA PANTALLA ↓↓↓ */}
            <Stack.Screen 
              name="RegistroCiclos" 
              component={RegistroCiclosScreen}
              options={{ 
                title: 'Registro de Ciclos',
                gestureEnabled: false, // Evitar salir por accidente
              }}
            />
            {/* ↑↑↑ NUEVA PANTALLA ↑↑↑ */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}