import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { preloadUserData } from '../services/preloadService';
import { getUserIdByEmail } from '../services/userService';

export default function SplashScreen({ navigation }) {
  const { user, userId, isLoading, setUserIdInSession, updatePreloadedData } = useAuth();

  useEffect(() => {
    checkAuthAndNavigate();
  }, [isLoading]);

  const checkAuthAndNavigate = async () => {
    // Esperar a que AuthContext termine de cargar
    if (isLoading) {
      return;
    }

    console.log('🔍 Verificando sesión guardada...');

    // Si NO hay usuario, ir directo a Login
    if (!user) {
      console.log('❌ No hay sesión guardada - redirigiendo a Login');
      navigation.replace('Login');
      return;
    }

    // Si hay usuario, verificar y precargar datos
    console.log('✅ Sesión encontrada para:', user.email);

    try {
      // Obtener userId si no está guardado
      let currentUserId = userId;
      if (!currentUserId && user.email) {
        console.log('🔄 Obteniendo userId...');
        currentUserId = await getUserIdByEmail(user.email);
        if (currentUserId) {
          await setUserIdInSession(currentUserId);
        }
      }

      // Precargar todos los datos en paralelo
      console.log('🚀 Precargando datos del usuario...');
      const startTime = Date.now();

      const preloadedData = await preloadUserData(user.email, currentUserId);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Datos precargados en ${loadTime}ms`);

      // Guardar en caché global
      updatePreloadedData(preloadedData);

      const profile = preloadedData.profile;

      // Determinar a dónde navegar basado en el perfil
      if (!profile) {
        // No hay perfil - ir a crear uno
        console.log('➡️ No hay perfil - navegando a EditProfile');
        navigation.replace('EditProfile', {
          isProfileIncomplete: true,
          preloadedProfile: null
        });
      } else {
        // Verificar si el perfil está completo
        const isIncomplete = !profile.weight || !profile.height || !profile.age || !profile.name;

        if (isIncomplete) {
          console.log('➡️ Perfil incompleto - navegando a EditProfile');
          navigation.replace('EditProfile', {
            isProfileIncomplete: true,
            preloadedProfile: profile
          });
        } else {
          console.log('➡️ Sesión válida - navegando a Main');
          navigation.replace('Main', {
            preloadedProfile: profile,
            preloadedPlan: preloadedData.activePlan,
            preloadedTimeline: preloadedData.timeline
          });
        }
      }
    } catch (error) {
      console.error('❌ Error en verificación de sesión:', error);
      // En caso de error, ir a Login para evitar bucles
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🥊</Text>
        <Text style={styles.appName}>NutriCombat IA</Text>
      </View>

      <ActivityIndicator size="large" color={COLORS.secondary} style={styles.loader} />

      <Text style={styles.loadingText}>
        {isLoading ? 'Iniciando...' : 'Cargando datos...'}
      </Text>

      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  loader: {
    marginVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 20,
    fontWeight: '500',
  },
  version: {
    position: 'absolute',
    bottom: 30,
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
