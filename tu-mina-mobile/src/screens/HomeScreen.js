// src/screens/HomeScreen.js
// Pantalla principal después del login

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../store/authSlice';
import { setCiclosDelDia } from '../store/ciclosSlice';
import { authService, produccionService } from '../services/api';
import { COLORS } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [ciclosHoy, setCiclosHoy] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCiclosDelDia();
  }, []);

  const loadCiclosDelDia = async () => {
    try {
      const userData = await authService.getUserData();
      if (userData.userId && userData.tituloMineroId) {
        const response = await produccionService.getCiclosDelDia(
          userData.userId,
          userData.tituloMineroId
        );
        if (response.success) {
          setCiclosHoy(response.totalCiclos);
          dispatch(setCiclosDelDia(response.data));
        }
      }
    } catch (error) {
      console.error('Error al cargar ciclos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cerrar',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            dispatch(logout());
            // La navegación se manejará automáticamente
          },
        },
      ]
    );
  };

  const handleRegistrarProduccion = () => {
    navigation.navigate('RegistroProduccion');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenido, {user?.nombre || 'Usuario'}</Text>
        <Text style={styles.subtitle}>
          {user?.tituloMinero?.numeroTitulo || 'Sin título asignado'}
        </Text>
      </View>

      {/* Card de resumen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de Hoy</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <Text style={styles.cardValue}>{ciclosHoy}</Text>
            <Text style={styles.cardLabel}>Ciclos Registrados</Text>
          </>
        )}
      </View>

      {/* Botones de acción */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleRegistrarProduccion}
      >
        <Text style={styles.primaryButtonText}>📋 Registrar Producción</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={loadCiclosDelDia}>
        <Text style={styles.secondaryButtonText}>🔄 Actualizar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
        <Text style={styles.dangerButtonText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 16,
  },
  cardValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});