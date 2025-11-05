import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import HeaderComponent from '../components/HeaderComponent';
import Breadcrumb from '../components/Breadcrumb'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actividadService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import COLORS from '../utils/colors';

const CATEGORIA_COLORS = {
  extraccion: '#e74c3c',
  acopio: '#3498db',
  procesamiento: '#f39c12',
  inspeccion: '#27ae60',
};

const CATEGORIA_LABELS = {
  extraccion: '⛏️ Extracción',
  acopio: '📦 Acopio',
  procesamiento: '⚙️ Procesamiento',
  inspeccion: '🔍 Inspección',
};

const HistorialPuntosScreen = ({ navigation }) => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);
        
        // Extraer tituloMineroId correctamente
        const tituloMineroId = user?.tituloMinero?.id || user?.tituloMineroId;
        
        if (tituloMineroId) {
          await cargarPuntos(tituloMineroId);
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPuntos = async (tituloMineroId) => {
    try {
      const response = await actividadService.getPuntos(tituloMineroId);
      if (response.success) {
        setPuntos(response.data);
      }
    } catch (error) {
      console.error('Error cargando puntos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userData) {
      const tituloMineroId = userData?.tituloMinero?.id || userData?.tituloMineroId;
      if (tituloMineroId) {
        await cargarPuntos(tituloMineroId);
      }
    }
    setRefreshing(false);
  };

  const renderPunto = ({ item }) => (
    <View style={styles.puntoCard}>
      <View
        style={[
          styles.categoriaIndicator,
          { backgroundColor: CATEGORIA_COLORS[item.categoria] },
        ]}
      />
      <View style={styles.puntoContent}>
        <Text style={styles.categoriaLabel}>
          {CATEGORIA_LABELS[item.categoria]}
        </Text>
        
        {item.descripcion && (
          <Text style={styles.descripcion}>{item.descripcion}</Text>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Ubicación:</Text>
          <Text style={styles.infoValue}>
            {parseFloat(item.latitud).toFixed(6)}, {parseFloat(item.longitud).toFixed(6)}
          </Text>
        </View>

        {item.maquinaria && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🚜 Maquinaria:</Text>
            <Text style={styles.infoValue}>{item.maquinaria}</Text>
          </View>
        )}

        {item.volumen_m3 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📊 Volumen:</Text>
            <Text style={styles.infoValue}>{item.volumen_m3} m³</Text>
          </View>
        )}

        <Text style={styles.fecha}>
          🕐 {new Date(item.fecha).toLocaleString('es-ES')}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderComponent />
      <Breadcrumb 
      items={[
        { label: 'Home', screen: 'Home' },
        { label: 'Historial' },
      ]}
    />      
      {/* Título de página */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>📋 Historial de Puntos</Text>
        <Text style={styles.pageSubtitle}>Total: {puntos.length} puntos registrados</Text>
      </View>

      <FlatList
        data={puntos}
        renderItem={renderPunto}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>
              No hay puntos registrados todavía
            </Text>
            <Text style={styles.emptySubtext}>
              Registra tu primer punto de actividad minera
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('RegistrarPunto')}
            >
              <Text style={styles.emptyButtonText}>Registrar Primer Punto</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {puntos.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('RegistrarPunto')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  pageHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  puntoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
  },
  categoriaIndicator: {
    width: 6,
  },
  puntoContent: {
    flex: 1,
    padding: 15,
  },
  categoriaLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  fecha: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});

export default HistorialPuntosScreen;