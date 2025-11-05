// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HeaderComponent from '../components/HeaderComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    totalPuntos: 0,
    extraccion: { count: 0, volumen: 0 },
    acopio: { count: 0, volumen: 0 },
    procesamiento: { count: 0, volumen: 0 },
    inspeccion: { count: 0, volumen: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Recargar cuando vuelve a esta pantalla
  useFocusEffect(
    React.useCallback(() => {
      if (userData) {
        console.log('🔄 Home en foco, recargando estadísticas...');
        cargarEstadisticas(userData);
      }
    }, [userData])
  );

  const cargarDatos = async () => {
    try {
      console.log('🔄 Cargando datos del Home...');
      
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      console.log('📦 UserData string:', userDataString);
      
      if (userDataString) {
        const user = JSON.parse(userDataString);
        console.log('👤 Usuario parseado:', user);
        setUserData(user);
        
        // Cargar estadísticas
        await cargarEstadisticas(user);
      } else {
        console.log('❌ No hay datos de usuario - redirigiendo a Login');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos. Por favor inicia sesión nuevamente.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async (user) => {
    try {
      const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
      
      if (!tituloMineroId) {
        console.log('⚠️ No hay título minero asignado');
        return;
      }

      console.log('📊 Solicitando puntos para:', tituloMineroId);
      
      const response = await actividadService.getPuntos(tituloMineroId);
      
      console.log('📥 Respuesta completa:', JSON.stringify(response, null, 2));
      
      if (response && response.success && response.data) {
        const puntos = response.data;
        console.log(`✅ ${puntos.length} puntos recibidos`);
        
        // Calcular estadísticas
        const stats = {
          totalPuntos: puntos.length,
          extraccion: { count: 0, volumen: 0 },
          acopio: { count: 0, volumen: 0 },
          procesamiento: { count: 0, volumen: 0 },
          inspeccion: { count: 0, volumen: 0 },
        };
        
        puntos.forEach(punto => {
          console.log(`📌 Punto: ${punto.categoria}, volumen: ${punto.volumen_m3}`);
          
          const categoria = punto.categoria;
          if (stats[categoria]) {
            stats[categoria].count++;
            if (punto.volumen_m3) {
              stats[categoria].volumen += parseFloat(punto.volumen_m3);
            }
          }
        });
        
        console.log('📊 Estadísticas finales:', JSON.stringify(stats, null, 2));
        setEstadisticas(stats);
      } else {
        console.log('⚠️ Respuesta sin datos válidos');
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      console.error('Stack:', error.stack);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userData) {
      await cargarEstadisticas(userData);
    }
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>❌ Error al cargar datos</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.retryButtonText}>Volver a Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderComponent />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            ¡Bienvenido, {userData.nombre?.split(' ')[0] || 'Usuario'}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Sistema de Monitoreo de Actividades Mineras - ANM
          </Text>
        </View>

        {/* Información del Usuario */}
        <View style={styles.userInfoCard}>
          <View style={styles.userInfoHeader}>
            <Text style={styles.userInfoTitle}>👤 Información del Operador</Text>
          </View>
          
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Nombre completo:</Text>
            <Text style={styles.userInfoValue}>{userData.nombre}</Text>
          </View>

          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Correo electrónico:</Text>
            <Text style={styles.userInfoValue}>{userData.email}</Text>
          </View>

          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Rol:</Text>
            <Text style={styles.userInfoValue}>{userData.rol}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.userInfoHeader}>
            <Text style={styles.userInfoTitle}>⛏️ Título Minero Asignado</Text>
          </View>

          {userData.tituloMinero ? (
            <>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Número de título:</Text>
                <Text style={styles.userInfoValueHighlight}>
                  {userData.tituloMinero.numeroTitulo}
                </Text>
              </View>

              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Municipio:</Text>
                <Text style={styles.userInfoValue}>
                  {userData.tituloMinero.municipio}
                </Text>
              </View>

              {userData.tituloMinero.codigoMunicipio && (
                <View style={styles.userInfoRow}>
                  <Text style={styles.userInfoLabel}>Código municipio:</Text>
                  <Text style={styles.userInfoValue}>
                    {userData.tituloMinero.codigoMunicipio}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noTituloContainer}>
              <Text style={styles.noTituloText}>
                ⚠️ No hay título minero asignado
              </Text>
            </View>
          )}
        </View>

        {/* Resumen de Actividades */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Resumen de Actividades</Text>
          
          {/* Total de Puntos */}
          <View style={styles.totalCard}>
            <Text style={styles.totalNumber}>{estadisticas.totalPuntos}</Text>
            <Text style={styles.totalLabel}>Puntos Registrados</Text>
          </View>

          {/* Por Categoría */}
          <View style={styles.categoriesGrid}>
            {/* Extracción */}
            <View style={[styles.categoryCard, { borderLeftColor: '#e74c3c' }]}>
              <Text style={styles.categoryIcon}>⛏️</Text>
              <Text style={styles.categoryName}>Extracción</Text>
              <Text style={styles.categoryCount}>
                {estadisticas.extraccion.count} puntos
              </Text>
              <Text style={styles.categoryVolume}>
                {estadisticas.extraccion.volumen.toFixed(2)} m³
              </Text>
            </View>

            {/* Acopio */}
            <View style={[styles.categoryCard, { borderLeftColor: '#3498db' }]}>
              <Text style={styles.categoryIcon}>📦</Text>
              <Text style={styles.categoryName}>Acopio</Text>
              <Text style={styles.categoryCount}>
                {estadisticas.acopio.count} puntos
              </Text>
              <Text style={styles.categoryVolume}>
                {estadisticas.acopio.volumen.toFixed(2)} m³
              </Text>
            </View>

            {/* Procesamiento */}
            <View style={[styles.categoryCard, { borderLeftColor: '#f39c12' }]}>
              <Text style={styles.categoryIcon}>⚙️</Text>
              <Text style={styles.categoryName}>Procesamiento</Text>
              <Text style={styles.categoryCount}>
                {estadisticas.procesamiento.count} puntos
              </Text>
              <Text style={styles.categoryVolume}>
                {estadisticas.procesamiento.volumen.toFixed(2)} m³
              </Text>
            </View>

            {/* Inspección */}
            <View style={[styles.categoryCard, { borderLeftColor: '#27ae60' }]}>
              <Text style={styles.categoryIcon}>🔍</Text>
              <Text style={styles.categoryName}>Inspección</Text>
              <Text style={styles.categoryCount}>
                {estadisticas.inspeccion.count} puntos
              </Text>
              <Text style={styles.categoryVolume}>
                {estadisticas.inspeccion.volumen.toFixed(2)} m³
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>🚀 Acciones Rápidas</Text>

          {/* Registrar Punto */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#06b6d4' }]}
            onPress={() => navigation.navigate('RegistrarPunto')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📍</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Registrar Punto de Actividad</Text>
              <Text style={styles.actionDescription}>Marcar ubicación georeferenciada</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          {/* Ver Historial */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('HistorialPuntos')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📋</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Ver Historial</Text>
              <Text style={styles.actionDescription}>Consultar puntos registrados</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Content
  content: {
    flex: 1,
  },
  welcomeSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Información del Usuario
  userInfoCard: {
    backgroundColor: 'white',
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoHeader: {
    marginBottom: 15,
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  userInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1.5,
    textAlign: 'right',
    fontWeight: '600',
  },
  userInfoValueHighlight: {
    fontSize: 14,
    color: COLORS.primary,
    flex: 1.5,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  noTituloContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noTituloText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },

  // Stats Section
  statsSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginHorizontal: 15,
  },

  // Total Card
  totalCard: {
    backgroundColor: 'white',
    padding: 30,
    marginHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  totalNumber: {
    fontSize: 52,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Categories Grid
// Categories Grid - 2 COLUMNAS EXACTAS (SOLO ESTILOS)
categoriesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',  // ⚠️ CAMBIO: distribuir espacio
  marginHorizontal: 15,
},
categoryCard: {
  width: '48%',                      // ⚠️ CAMBIO: 48% en lugar de flex: 1
  backgroundColor: 'white',
  padding: 18,
  borderRadius: 12,
  borderLeftWidth: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  marginBottom: 15,                  // ⚠️ NUEVO: espacio entre filas
},
categoryIcon: {
  fontSize: 36,
  marginBottom: 10,
},
categoryName: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 8,
},
categoryCount: {
  fontSize: 20,
  fontWeight: 'bold',
  color: COLORS.primary,
  marginBottom: 5,
},
categoryVolume: {
  fontSize: 13,
  color: '#666',
  fontWeight: '500',
},
  // Actions
  actionsSection: {
    marginTop: 20,
    marginHorizontal: 15,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  actionIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  actionArrow: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  // Logout
  logoutButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 15,
    marginTop: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;