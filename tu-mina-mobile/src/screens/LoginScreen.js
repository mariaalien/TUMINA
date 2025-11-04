// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure, selectAuth } from '../store/authSlice';
import { authService } from '../services/api';
import { COLORS } from '../utils/constants';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading } = useSelector(selectAuth);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    dispatch(loginStart());

    try {
      const response = await authService.login(email.trim(), password);

      if (response.success) {
        dispatch(loginSuccess(response));
      } else {
        dispatch(loginFailure(response.message || 'Error al iniciar sesión'));
        Alert.alert('Error', response.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Error en login:', error);
      dispatch(loginFailure(error.message));
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 5000.'
      );
    }
  };

  // Función para auto-completar credenciales
  const autoCompletar = (emailUser, passwordUser) => {
    setEmail(emailUser);
    setPassword(passwordUser);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Tu Mina</Text>
          <Text style={styles.subtitle}>Registro de Producción</Text>
          <Text style={styles.version}>ANM - Resolución 371/2024</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@tumina.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          {/* Usuarios Reales de la Base de Datos */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>👥 Usuarios Disponibles:</Text>
            <Text style={styles.helpSubtitle}>
              (Toca cualquier tarjeta para usar sus credenciales)
            </Text>
            
            {/* SECCIÓN: OPERADORES */}
            <Text style={styles.sectionTitle}>👷 OPERADORES</Text>
            
            {/* Operador 1: Cristian */}
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => autoCompletar('cristian.salazar@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Cristian Salazar</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>cristian.salazar@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-250-20</Text>
            </TouchableOpacity>

            {/* Operador 2: Daniel */}
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => autoCompletar('daniel.franco@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Daniel Franco</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>daniel.franco@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-250-20</Text>
            </TouchableOpacity>

            {/* Operador 3: María */}
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => autoCompletar('maria.rodriguez@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>María Rodríguez</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>maria.rodriguez@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-816-17</Text>
            </TouchableOpacity>

            {/* Operador 4: Paula */}
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => autoCompletar('paula.arias@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Paula Arias</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>paula.arias@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-816-17</Text>
            </TouchableOpacity>

            {/* SECCIÓN: ADMINISTRADORES */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>🔐 ADMINISTRADORES</Text>
            
            {/* Admin 1: Carlos */}
            <TouchableOpacity 
              style={[styles.userCard, styles.userCardAdmin]}
              onPress={() => autoCompletar('carlos.fajardo@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Carlos Fajardo</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>carlos.fajardo@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-816-17</Text>
            </TouchableOpacity>

            {/* Admin 2: Carolina */}
            <TouchableOpacity 
              style={[styles.userCard, styles.userCardAdmin]}
              onPress={() => autoCompletar('carolina.gomez@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Carolina Gómez</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>carolina.gomez@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-250-20</Text>
            </TouchableOpacity>

            {/* Admin 3: Jesús */}
            <TouchableOpacity 
              style={[styles.userCard, styles.userCardAdmin]}
              onPress={() => autoCompletar('jesus.arias@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Jesús Arias</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>jesus.arias@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-816-17</Text>
            </TouchableOpacity>

            {/* Admin 4: Zharick */}
            <TouchableOpacity 
              style={[styles.userCard, styles.userCardAdmin]}
              onPress={() => autoCompletar('zharick.lopez@tumina.com', 'password123')}
              disabled={loading}
            >
              <View style={styles.userCardHeader}>
                <Text style={styles.userName}>Zharick López</Text>
                <Text style={styles.userTap}>Tap →</Text>
              </View>
              <Text style={styles.userEmail}>zharick.lopez@tumina.com</Text>
              <Text style={styles.userInfo}>Título: titulo-250-20</Text>
            </TouchableOpacity>

            {/* Nota sobre contraseña */}
            <View style={styles.passwordNote}>
              <Text style={styles.passwordNoteText}>
                🔑 Contraseña para todos: password123
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  version: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 8,
  },
  userCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  userCardAdmin: {
    borderLeftColor: COLORS.danger,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userTap: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  userEmail: {
    fontSize: 11,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  userInfo: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  passwordNote: {
    backgroundColor: COLORS.info + '15',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  passwordNoteText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
