// src/screens/RegistroProduccionScreen.js
// Pantalla 3: Formulario para iniciar registro de producción

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch } from 'react-redux';
import { iniciarSesion } from '../store/ciclosSlice';
import { authService, produccionService } from '../services/api';
import { COLORS, TIPOS_MAQUINARIA } from '../utils/constants';

export default function RegistroProduccionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [loadingPuntos, setLoadingPuntos] = useState(true);
  const [tipoMaquina, setTipoMaquina] = useState(TIPOS_MAQUINARIA[0]);
  const [capacidadMaxM3, setCapacidadMaxM3] = useState('30');
  const [puntos, setPuntos] = useState([]);
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    loadUserDataAndPuntos();
  }, []);

  const loadUserDataAndPuntos = async () => {
    try {
      const user = await authService.getUserData();
      setUserData(user);

      if (user.tituloMineroId) {
        const response = await produccionService.getPuntosReferencia(user.tituloMineroId);
        
        if (response.success && response.data.length >= 2) {
          setPuntos(response.data);
        } else {
          Alert.alert(
            'Error',
            'No se encontraron puntos de referencia para este título minero. Contacta al administrador.'
          );
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los puntos de referencia');
    } finally {
      setLoadingPuntos(false);
    }
  };

  const handleIniciarRegistro = async () => {
    // Validaciones
    if (!tipoMaquina) {
      Alert.alert('Error', 'Selecciona el tipo de máquina');
      return;
    }

    const capacidad = parseFloat(capacidadMaxM3);
    if (!capacidad || capacidad <= 0) {
      Alert.alert('Error', 'Ingresa una capacidad válida');
      return;
    }

    if (puntos.length < 2) {
      Alert.alert('Error', 'Se requieren al menos 2 puntos de referencia');
      return;
    }

    setLoading(true);

    try {
      // Iniciar sesión de registro en el backend
      const response = await produccionService.iniciarRegistro({
        usuarioId: userData.userId,
        tituloMineroId: userData.tituloMineroId,
        tipoMaquina,
        capacidadMaxM3: capacidad,
      });

      if (response.success) {
        // Guardar en Redux
        const puntoRecoleccion = puntos.find(p => p.tipo === 'RECOLECCION');
        const puntoAcopio = puntos.find(p => p.tipo === 'ACOPIO');

        dispatch(iniciarSesion({
          tipoMaquina,
          capacidadMaxM3: capacidad,
          puntoRecoleccion,
          puntoAcopio,
        }));

        // Navegar a la pantalla de registro de ciclos (con mapa)
        navigation.navigate('RegistroCiclos');
      } else {
        Alert.alert('Error', response.message || 'No se pudo iniciar el registro');
      }
    } catch (error) {
      console.error('Error al iniciar registro:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPuntos) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando puntos de referencia...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Registrar Producción</Text>
          <Text style={styles.subtitle}>
            Completa los datos para iniciar el registro
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Fecha actual */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>📅 Fecha:</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString('es-CO')}
            </Text>
          </View>

          {/* Usuario */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>👤 Operador:</Text>
            <Text style={styles.infoValue}>{userData?.userName}</Text>
          </View>

          {/* Puntos cargados */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>📍 Puntos de Referencia:</Text>
            {puntos.map((punto, index) => (
              <Text key={index} style={styles.puntoText}>
                {punto.tipo === 'RECOLECCION' ? '🔵' : '🟢'} {punto.nombre}
              </Text>
            ))}
          </View>

          {/* Tipo de Máquina */}
          <Text style={styles.label}>🚜 Tipo de Máquina</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tipoMaquina}
              onValueChange={(value) => setTipoMaquina(value)}
              style={styles.picker}
              enabled={!loading}
            >
              {TIPOS_MAQUINARIA.map((tipo) => (
                <Picker.Item key={tipo} label={tipo} value={tipo} />
              ))}
            </Picker>
          </View>

          {/* Capacidad */}
          <Text style={styles.label}>📦 Capacidad Máxima (m³)</Text>
          <View style={styles.capacidadContainer}>
            {['20', '30', '40', '50'].map((cap) => (
              <TouchableOpacity
                key={cap}
                style={[
                  styles.capacidadButton,
                  capacidadMaxM3 === cap && styles.capacidadButtonSelected,
                ]}
                onPress={() => setCapacidadMaxM3(cap)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.capacidadText,
                    capacidadMaxM3 === cap && styles.capacidadTextSelected,
                  ]}
                >
                  {cap} m³
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Botón Iniciar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleIniciarRegistro}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>🚀 Iniciar Registro</Text>
            )}
          </TouchableOpacity>

          {/* Botón Regresar */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>← Regresar</Text>
          </TouchableOpacity>
        </View>

        {/* Información */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>ℹ️ Información</Text>
          <Text style={styles.infoBoxText}>
            • El sistema detectará automáticamente los ciclos{'\n'}
            • Punto A: Recolección (azul){'\n'}
            • Punto B: Acopio (verde){'\n'}
            • Un ciclo completo es: A → B → A
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
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
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  puntoText: {
    fontSize: 14,
    color: COLORS.black,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  capacidadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capacidadButton: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.gray + '30',
    alignItems: 'center',
  },
  capacidadButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  capacidadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  capacidadTextSelected: {
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: COLORS.gray + '30',
  },
  secondaryButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    lineHeight: 22,
  },
});