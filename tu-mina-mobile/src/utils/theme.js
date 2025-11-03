// src/utils/theme.js
// Tema institucional para Tu Mina

export const THEME = {
  // Colores principales (similar al frontend web ANM-FRI)
  colors: {
    primary: '#1565C0',      // Azul institucional oscuro
    primaryLight: '#1976D2',  // Azul principal
    primaryDark: '#0D47A1',   // Azul muy oscuro
    secondary: '#FF6F00',     // Naranja acento
    secondaryLight: '#FF9800',
    
    success: '#2E7D32',       // Verde éxito
    successLight: '#4CAF50',
    
    warning: '#F57C00',       // Naranja advertencia
    warningLight: '#FF9800',
    
    danger: '#C62828',        // Rojo peligro
    dangerLight: '#F44336',
    
    info: '#0277BD',          // Azul información
    infoLight: '#03A9F4',
    
    // Neutros
    white: '#FFFFFF',
    black: '#212121',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    
    // Backgrounds
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#FAFAFA',
    
    // Bordes y divisores
    border: '#E0E0E0',
    divider: '#E0E0E0',
    
    // Texto
    textPrimary: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9E9E9E',
    textHint: '#BDBDBD',
  },
  
  // Espaciado consistente
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Bordes redondeados
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  
  // Sombras
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Tipografía
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body1: {
      fontSize: 16,
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  },
};

export default THEME;