// src/screens/RegistroCiclosScreen.js
// Pantalla principal: Mapa con GPS tracking para registro de ciclos

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLocation,
  setEstadoCiclo,
  iniciarCiclo,
  completarCiclo,
  finalizarSesion,
  selectCiclos,
} from '../store/ciclosSlice';
import { produccionService, authService } from '../services/api';
import {
  COLORS,
  ESTADO_CICLO,
  LOCATION_CONFIG,
  TIPO_PUNTO,
} from '../utils/constants';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005; // Zoom del mapa (más pequeño = más cerca)
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function RegistroCiclosScreen({ navigation }) {
  const dispatch = useDispatch();
  const ciclosState = useSelector(selectCiclos);
  const mapRef = useRef(null);
  
  // Estados locales
  const [location, setLocationState] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [enProximidadRecoleccion, setEnProximidadRecoleccion] = useState(false);
  const [enProximidadAcopio, setEnProximidadAcopio] = useState(false);
  const [rutaActual, setRutaActual] = useState([]);

  // Estados para el ciclo actual
  const [tiempoInicioCiclo, setTiempoInicioCiclo] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  // ============================================
  // SOLICITAR PERMISOS Y CONFIGURAR GPS
  // ============================================
  useEffect(() => {
    (async () => {
      try {
        // Solicitar permisos
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permiso de ubicación denegado');
          Alert.alert(
            'Permisos Requeridos',
            'Esta app necesita acceso a tu ubicación para funcionar correctamente.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Obtener ubicación inicial
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocationState(initialLocation.coords);
        dispatch(setLocation(initialLocation.coords));

        // Centrar mapa en ubicación inicial
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          });
        }

        // Configurar tracking continuo
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
            distanceInterval: LOCATION_CONFIG.MIN_DISTANCE,
          },
          (newLocation) => {
            handleLocationUpdate(newLocation.coords);
          }
        );

        setLocationSubscription(subscription);
        setLoading(false);
      } catch (error) {
        console.error('Error al configurar GPS:', error);
        setErrorMsg('Error al acceder al GPS');
        setLoading(false);
        
        Alert.alert(
          'Error GPS',
          'No se pudo acceder al GPS. Si estás en un emulador, usa la opción "Extended controls" para simular ubicación.',
          [{ text: 'OK' }]
        );
      }
    })();

    // Cleanup al desmontar
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // ============================================
  // TIMER PARA CICLO EN PROGRESO
  // ============================================
  useEffect(() => {
    let interval;
    if (tiempoInicioCiclo) {
      interval = setInterval(() => {
        const ahora = new Date();
        const inicio = new Date(tiempoInicioCiclo);
        const diff = Math.floor((ahora - inicio) / 1000); // Segundos
        setTiempoTranscurrido(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tiempoInicioCiclo]);

  // ============================================
  // MANEJAR ACTUALIZACIÓN DE UBICACIÓN
  // ============================================
  const handleLocationUpdate = (coords) => {
    setLocationState(coords);
    dispatch(setLocation(coords));
    
    // Agregar a la ruta actual
    setRutaActual(prev => [...prev, coords]);

    // Verificar proximidad a puntos
    if (ciclosState.puntoRecoleccion && ciclosState.puntoAcopio) {
      checkProximity(coords);
    }
  };

  // ============================================
  // VERIFICAR PROXIMIDAD A PUNTOS
  // ============================================
  const checkProximity = (coords) => {
    const { puntoRecoleccion, puntoAcopio, estadoActual } = ciclosState;

    // Calcular distancias
    const distRecoleccion = calcularDistancia(
      coords.latitude,
      coords.longitude,
      puntoRecoleccion.latitud,
      puntoRecoleccion.longitud
    );

    const distAcopio = calcularDistancia(
      coords.latitude,
      coords.longitude,
      puntoAcopio.latitud,
      puntoAcopio.longitud
    );

    // Actualizar estados de proximidad
    setEnProximidadRecoleccion(distRecoleccion <= LOCATION_CONFIG.RADIO_INFLUENCIA);
    setEnProximidadAcopio(distAcopio <= LOCATION_CONFIG.RADIO_INFLUENCIA);

    // ============================================
    // LÓGICA DE TRANSICIÓN DE ESTADOS
    // ============================================
    
    // CASO 1: Estamos en punto de recolección y salimos
    if (
      estadoActual === ESTADO_CICLO.EN_PUNTO_RECOLECCION &&
      distRecoleccion > LOCATION_CONFIG.RADIO_INFLUENCIA
    ) {
      // Iniciar nuevo ciclo
      const ahora = new Date().toISOString();
      setTiempoInicioCiclo(ahora);
      setRutaActual([coords]);
      dispatch(iniciarCiclo(coords));
      dispatch(setEstadoCiclo(ESTADO_CICLO.EN_RUTA_A_ACOPIO));
    }

    // CASO 2: En ruta a acopio y llegamos al punto de acopio
    if (
      estadoActual === ESTADO_CICLO.EN_RUTA_A_ACOPIO &&
      distAcopio <= LOCATION_CONFIG.RADIO_INFLUENCIA
    ) {
      dispatch(setEstadoCiclo(ESTADO_CICLO.EN_PUNTO_ACOPIO));
    }

    // CASO 3: En punto de acopio y salimos (regreso a recolección)
    if (
      estadoActual === ESTADO_CICLO.EN_PUNTO_ACOPIO &&
      distAcopio > LOCATION_CONFIG.RADIO_INFLUENCIA
    ) {
      dispatch(setEstadoCiclo(ESTADO_CICLO.EN_RUTA_A_RECOLECCION));
    }

    // CASO 4: En ruta de regreso y llegamos al punto de recolección (ciclo completo!)
    if (
      estadoActual === ESTADO_CICLO.EN_RUTA_A_RECOLECCION &&
      distRecoleccion <= LOCATION_CONFIG.RADIO_INFLUENCIA
    ) {
      // ¡CICLO COMPLETADO!
      handleCicloCompletado();
    }
  };

  // ============================================
  // MANEJAR CICLO COMPLETADO
  // ============================================
  const handleCicloCompletado = async () => {
    const horaFin = new Date().toISOString();
    const tiempoTotal = Math.floor((new Date(horaFin) - new Date(tiempoInicioCiclo)) / 1000);

    const cicloData = {
      numeroCiclo: ciclosState.numeroCicloActual,
      horaInicio: tiempoInicioCiclo,
      horaFin: horaFin,
      tiempoTotalSegundos: tiempoTotal,
      ubicacionInicio: ciclosState.ubicacionInicioCiclo,
      ubicacionFin: location,
    };

    // Guardar en Redux
    dispatch(completarCiclo(cicloData));

    // Enviar al backend
    try {
      const userData = await authService.getUserData();
      const response = await produccionService.registrarCiclo({
        ...cicloData,
        usuarioId: userData.userId,
        tituloMineroId: userData.tituloMineroId,
        tipoMaquina: ciclosState.tipoMaquina,
        capacidadMaxM3: ciclosState.capacidadMaxM3,
      });

      if (response.success) {
        Alert.alert(
          '✅ Ciclo Completado',
          `Ciclo #${ciclosState.numeroCicloActual} registrado exitosamente\nTiempo: ${formatearTiempo(tiempoTotal)}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error al registrar ciclo:', error);
      Alert.alert('Advertencia', 'Ciclo guardado localmente. Se sincronizará después.');
    }

    // Resetear timer
    setTiempoInicioCiclo(null);
    setTiempoTranscurrido(0);
    setRutaActual([]);
  };

  // ============================================
  // CALCULAR DISTANCIA (HAVERSINE)
  // ============================================
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  };

  // ============================================
  // FORMATEAR TIEMPO
  // ============================================
  const formatearTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos
      .toString()
      .padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // MANEJAR FINALIZAR SESIÓN
  // ============================================
  const handleFinalizarSesion = () => {
    Alert.alert(
      'Finalizar Sesión',
      `Has completado ${ciclosState.ciclosCompletados.length} ciclos.\n¿Deseas finalizar la sesión?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: () => {
            dispatch(finalizarSesion());
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  // ============================================
  // CENTRAR MAPA EN UBICACIÓN ACTUAL
  // ============================================
  const centrarMapa = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Iniciando GPS...</Text>
      </View>
    );
  }

  if (errorMsg || !location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {errorMsg || 'Error al acceder al GPS'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { puntoRecoleccion, puntoAcopio, estadoActual } = ciclosState;

  return (
    <View style={styles.container}>
      {/* MAPA */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
      >
        {/* Marcador: Punto de Recolección (Azul) */}
        {puntoRecoleccion && (
          <>
            <Marker
              coordinate={{
                latitude: puntoRecoleccion.latitud,
                longitude: puntoRecoleccion.longitud,
              }}
              title={puntoRecoleccion.nombre}
              description="Punto de Recolección"
              pinColor="blue"
            />
            <Circle
              center={{
                latitude: puntoRecoleccion.latitud,
                longitude: puntoRecoleccion.longitud,
              }}
              radius={LOCATION_CONFIG.RADIO_INFLUENCIA}
              fillColor="rgba(0, 122, 255, 0.2)"
              strokeColor="rgba(0, 122, 255, 0.5)"
              strokeWidth={2}
            />
          </>
        )}

        {/* Marcador: Punto de Acopio (Verde) */}
        {puntoAcopio && (
          <>
            <Marker
              coordinate={{
                latitude: puntoAcopio.latitud,
                longitude: puntoAcopio.longitud,
              }}
              title={puntoAcopio.nombre}
              description="Punto de Acopio"
              pinColor="green"
            />
            <Circle
              center={{
                latitude: puntoAcopio.latitud,
                longitude: puntoAcopio.longitud,
              }}
              radius={LOCATION_CONFIG.RADIO_INFLUENCIA}
              fillColor="rgba(76, 175, 80, 0.2)"
              strokeColor="rgba(76, 175, 80, 0.5)"
              strokeWidth={2}
            />
          </>
        )}

        {/* Línea de ruta actual */}
        {rutaActual.length > 1 && (
          <Polyline
            coordinates={rutaActual.map(coord => ({
              latitude: coord.latitude,
              longitude: coord.longitude,
            }))}
            strokeColor={COLORS.primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* PANEL SUPERIOR: Estado del Ciclo */}
      <View style={styles.topPanel}>
        <View style={styles.estadoContainer}>
          <Text style={styles.estadoLabel}>Estado:</Text>
          <Text style={styles.estadoValue}>
            {getEstadoTexto(estadoActual)}
          </Text>
        </View>
        
        {tiempoInicioCiclo && (
          <View style={styles.tiempoContainer}>
            <Text style={styles.tiempoLabel}>⏱️</Text>
            <Text style={styles.tiempoValue}>
              {formatearTiempo(tiempoTranscurrido)}
            </Text>
          </View>
        )}
      </View>

      {/* PANEL LATERAL: Información */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoPanelTitle}>Ciclo #{ciclosState.numeroCicloActual}</Text>
        <Text style={styles.infoPanelText}>
          Completados: {ciclosState.ciclosCompletados.length}
        </Text>
        
        {/* Indicadores de proximidad */}
        <View style={styles.proximityContainer}>
          <View style={[
            styles.proximityBadge,
            enProximidadRecoleccion && styles.proximityBadgeActive
          ]}>
            <Text style={styles.proximityText}>
              🔵 {enProximidadRecoleccion ? 'En Recolección' : 'Lejos'}
            </Text>
          </View>
          
          <View style={[
            styles.proximityBadge,
            enProximidadAcopio && styles.proximityBadgeActive
          ]}>
            <Text style={styles.proximityText}>
              🟢 {enProximidadAcopio ? 'En Acopio' : 'Lejos'}
            </Text>
          </View>
        </View>
      </View>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity style={styles.centerButton} onPress={centrarMapa}>
          <Text style={styles.centerButtonText}>📍</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.finishButton} onPress={handleFinalizarSesion}>
          <Text style={styles.finishButtonText}>🏁 Finalizar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// FUNCIÓN AUXILIAR: Texto del estado
// ============================================
const getEstadoTexto = (estado) => {
  switch (estado) {
    case ESTADO_CICLO.EN_PUNTO_RECOLECCION:
      return '🔵 En Punto de Recolección';
    case ESTADO_CICLO.EN_RUTA_A_ACOPIO:
      return '🚛 En Ruta a Acopio';
    case ESTADO_CICLO.EN_PUNTO_ACOPIO:
      return '🟢 En Punto de Acopio';
    case ESTADO_CICLO.EN_RUTA_A_RECOLECCION:
      return '🔙 Regresando a Recolección';
    default:
      return 'Iniciando...';
  }
};

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Panel superior
  topPanel: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  estadoContainer: {
    flex: 1,
  },
  estadoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  estadoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tiempoLabel: {
    fontSize: 20,
    marginRight: 8,
  },
  tiempoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  // Panel lateral
  infoPanel: {
    position: 'absolute',
    top: 120,
    left: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoPanelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  proximityContainer: {
    gap: 8,
  },
  proximityBadge: {
    backgroundColor: COLORS.textSecondary + '20',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary + '40',
  },
  proximityBadgeActive: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  proximityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  
  // Panel inferior
  bottomPanel: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centerButton: {
    backgroundColor: COLORS.white,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centerButtonText: {
    fontSize: 24,
  },
  finishButton: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  finishButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});