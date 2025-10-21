import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { preloadUserData } from '../services/preloadService';

export default function ProfileLoadingScreen({ navigation }) {
  const { user, userId, updatePreloadedData } = useAuth();

  useEffect(() => {
    checkAndLoadProfile();
  }, []);

  const checkAndLoadProfile = async () => {
    if (user && user.email) {
      try {
        console.log('🚀 Iniciando carga optimizada del perfil...');
        const startTime = Date.now();

        // Precargar TODOS los datos en paralelo (perfil, plan, timeline)
        const preloadedData = await preloadUserData(user.email, userId);

        // Guardar en caché global para acceso instantáneo
        updatePreloadedData(preloadedData);

        const loadTime = Date.now() - startTime;
        console.log(`✅ Carga completada en ${loadTime}ms`);

        // Esperar mínimo 800ms para animación suave (reducido de 1500ms)
        const remainingTime = Math.max(0, 800 - loadTime);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        const profile = preloadedData.profile;

        if (profile) {
          // Verificar si el perfil está incompleto
          const isIncomplete = !profile.weight || !profile.height || !profile.age || !profile.name;

          if (isIncomplete) {
            // Perfil incompleto - ir a EditProfile con datos precargados
            navigation.replace('EditProfile', {
              isProfileIncomplete: true,
              preloadedProfile: profile
            });
          } else {
            // Perfil completo - ir a Main con TODOS los datos precargados
            navigation.replace('Main', {
              preloadedProfile: profile,
              preloadedPlan: preloadedData.activePlan,
              preloadedTimeline: preloadedData.timeline
            });
          }
        } else {
          // No hay perfil - ir a EditProfile sin datos precargados
          navigation.replace('EditProfile', {
            isProfileIncomplete: true,
            preloadedProfile: null
          });
        }
      } catch (error) {
        console.error('❌ Error en carga de perfil:', error);
        // En caso de error, ir a Main de todos modos
        navigation.replace('Main');
      }
    } else {
      // No hay usuario - regresar a login
      navigation.replace('Login');
    }
  };

  return (
    <LoadingSpinner
      useDynamicMessages={true}
      subtitle="Cargando información del peleador"
      messageInterval={2000}
    />
  );
}
