/**
 * Servicio para obtener feedback automático con IA sobre el progreso nutricional
 */

import { NUTRITION_FEEDBACK_API } from '../config/api';

/**
 * Obtiene feedback inteligente sobre el progreso diario del usuario
 *
 * @param {string} userId - ID del usuario
 * @param {string} [timelineId] - ID del timeline (opcional, se obtiene el activo si no se proporciona)
 * @param {number} [dayNumber] - Número del día (opcional, se usa el día actual si no se proporciona)
 * @returns {Promise<Object>} Feedback con recomendaciones, alertas y análisis
 */
export const getDailyNutritionFeedback = async (userId, timelineId = null, dayNumber = null) => {
  try {
    console.log('📊 Solicitando feedback nutricional para:', { userId, timelineId, dayNumber });

    const body = { userId };

    if (timelineId) {
      body.timelineId = timelineId;
    }

    if (dayNumber) {
      body.dayNumber = dayNumber;
    }

    const response = await fetch(NUTRITION_FEEDBACK_API.getDailyFeedback, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Manejo específico para error 500 (modelo saturado)
      if (response.status === 500) {
        return {
          success: false,
          error: 'Servicio saturado. El modelo de IA está procesando muchas solicitudes. Por favor, intenta nuevamente en unos minutos.',
          isModelSaturated: true,
          data: null,
        };
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo feedback');
    }

    console.log('✅ Feedback recibido:', result.data);

    return {
      success: true,
      data: result.data,
    };

  } catch (error) {
    console.error('❌ Error obteniendo feedback nutricional:', error);

    // Detectar errores 500 en el mensaje de error
    const is500Error = error.message && (error.message.includes('500') || error.message.includes('saturado'));
    
    return {
      success: false,
      error: is500Error 
        ? 'Servicio saturado. El modelo de IA está procesando muchas solicitudes. Por favor, intenta nuevamente en unos minutos.'
        : error.message || 'Error al obtener feedback nutricional',
      isModelSaturated: is500Error,
      data: null,
    };
  }
};

/**
 * Obtiene feedback con retry automático (útil para casos donde el Lambda está frío)
 *
 * @param {string} userId - ID del usuario
 * @param {string} [timelineId] - ID del timeline
 * @param {number} [dayNumber] - Número del día
 * @param {number} [maxRetries=2] - Número máximo de reintentos
 * @returns {Promise<Object>} Feedback con recomendaciones
 */
export const getDailyNutritionFeedbackWithRetry = async (
  userId,
  timelineId = null,
  dayNumber = null,
  maxRetries = 2
) => {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Reintentando feedback (intento ${attempt + 1}/${maxRetries + 1})...`);
        // Esperar un poco antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const result = await getDailyNutritionFeedback(userId, timelineId, dayNumber);

      if (result.success) {
        return result;
      }

      lastError = result.error;

    } catch (error) {
      lastError = error.message;
      console.warn(`⚠️ Intento ${attempt + 1} falló:`, error.message);
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  return {
    success: false,
    error: lastError || 'No se pudo obtener feedback después de varios intentos',
    data: null,
  };
};

/**
 * Genera un feedback básico local si el servicio de IA falla
 * (Fallback para cuando el Lambda no está disponible)
 *
 * @param {Object} progressData - Datos del progreso actual
 * @returns {Object} Feedback básico
 */
export const getLocalFallbackFeedback = (progressData) => {
  const caloriesPercentage = progressData.actual_calories && progressData.target_calories
    ? Math.round((progressData.actual_calories / progressData.target_calories) * 100)
    : 0;

  let emoji, title, message, severity;

  if (caloriesPercentage >= 80 && caloriesPercentage <= 120) {
    emoji = '🎯';
    title = '¡Vas muy bien!';
    message = 'Tu consumo calórico está en el rango óptimo. Sigue así para alcanzar tu objetivo.';
    severity = 'success';
  } else if (caloriesPercentage < 50) {
    emoji = '⚠️';
    title = 'Consumo muy bajo';
    message = 'Estás consumiendo muy pocas calorías. Asegúrate de cumplir con tu plan nutricional.';
    severity = 'danger';
  } else if (caloriesPercentage > 150) {
    emoji = '🚨';
    title = 'Consumo elevado';
    message = 'Has superado significativamente tu objetivo calórico. Ajusta tus próximas comidas.';
    severity = 'danger';
  } else {
    emoji = 'ℹ️';
    title = 'Ajusta tu progreso';
    message = 'Tu consumo está fuera del rango óptimo. Revisa tu plan y ajusta según sea necesario.';
    severity = 'warning';
  }

  return {
    emoji,
    title,
    message,
    severity,
    complianceScore: Math.max(0, Math.min(100, caloriesPercentage)),
    recommendations: [
      'Revisa tu progreso del día',
      'Mantén tu hidratación constante',
      'Sigue las recomendaciones de tu fase actual',
    ],
    metadata: {
      fallback: true,
      source: 'local',
    },
  };
};

export default {
  getDailyNutritionFeedback,
  getDailyNutritionFeedbackWithRetry,
  getLocalFallbackFeedback,
};
