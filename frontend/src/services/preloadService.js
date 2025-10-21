import { WEIGHT_CUT_API, PROFILE_API } from '../config/api';

/**
 * Servicio de precarga de datos para mejorar la experiencia de usuario
 * Carga datos en paralelo para evitar delays en el frontend
 */

/**
 * Precarga todos los datos necesarios para el usuario
 * @param {string} email - Email del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Objeto con todos los datos precargados
 */
export const preloadUserData = async (email, userId) => {
  console.log('🚀 Iniciando precarga de datos...');
  const startTime = Date.now();

  try {
    // Ejecutar todas las llamadas en paralelo para máxima velocidad
    const [profileResult, weightCutResult, timelineResult] = await Promise.allSettled([
      loadUserProfile(email),
      loadActiveWeightCut(userId),
      loadActiveTimeline(userId),
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`✅ Precarga completada en ${loadTime}ms`);

    // Extraer datos de los resultados
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const activePlan = weightCutResult.status === 'fulfilled' ? weightCutResult.value : null;
    const timeline = timelineResult.status === 'fulfilled' ? timelineResult.value : null;

    // Log de resultados
    console.log('📦 Datos precargados:', {
      hasProfile: !!profile,
      hasActivePlan: !!activePlan,
      hasTimeline: !!timeline,
      loadTimeMs: loadTime
    });

    return {
      profile,
      activePlan,
      timeline,
      loadTime,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Error en precarga de datos:', error);
    return {
      profile: null,
      activePlan: null,
      timeline: null,
      loadTime: Date.now() - startTime,
      timestamp: Date.now(),
      error: error.message
    };
  }
};

/**
 * Carga el perfil del usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} Perfil del usuario o null
 */
const loadUserProfile = async (email) => {
  if (!email) return null;

  try {
    console.log('📥 Precargando perfil...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(PROFILE_API.getProfile(email), {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        console.log('✅ Perfil precargado');
        return data.data[0];
      }
    }
    console.log('ℹ️ No se encontró perfil');
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Timeout cargando perfil');
    } else {
      console.error('❌ Error cargando perfil:', error);
    }
    return null;
  }
};

/**
 * Carga el plan de corte activo del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} Plan activo o null
 */
const loadActiveWeightCut = async (userId) => {
  if (!userId) return null;

  try {
    console.log('📥 Precargando plan de corte...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(WEIGHT_CUT_API.getUserPlans(userId), {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const active = data.data?.find(wc => wc.is_active);
      if (active) {
        console.log('✅ Plan de corte precargado');
      } else {
        console.log('ℹ️ No hay plan de corte activo');
      }
      return active || null;
    }
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Timeout cargando plan de corte');
    } else {
      console.error('❌ Error cargando plan de corte:', error);
    }
    return null;
  }
};

/**
 * Carga el timeline activo del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} Timeline activo o null
 */
const loadActiveTimeline = async (userId) => {
  if (!userId) return null;

  try {
    console.log('📥 Precargando timeline...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(WEIGHT_CUT_API.getTimeline(userId), {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        console.log('✅ Timeline precargado');
        return result.data;
      }
    } else if (response.status === 404) {
      console.log('ℹ️ No hay timeline activo');
    }
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Timeout cargando timeline');
    } else {
      console.error('❌ Error cargando timeline:', error);
    }
    return null;
  }
};

/**
 * Invalida la caché de datos precargados
 * Útil después de crear/actualizar planes o timelines
 */
export const invalidatePreloadCache = () => {
  console.log('🔄 Caché de precarga invalidada');
  // Podemos expandir esto más adelante con AsyncStorage si queremos persistir caché
};
