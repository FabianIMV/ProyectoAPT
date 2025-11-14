import { API_ENDPOINTS } from '../config/api';
import { getUserTimezone } from '../utils/dateUtils';

const PROGRESS_BASE = `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress`;

/**
 * Agrega progreso acumulativo (SUMA valores al total del día)
 * Usar para: comidas, agua, cardio
 */
export const addDailyProgress = async (userId, timelineId, dayNumber, progressData) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/add?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...progressData,
          clientTimezone: getUserTimezone(), // Enviar timezone del cliente
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error agregando progreso');
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error en addDailyProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Establece progreso absoluto (SOBRESCRIBE valores)
 * Usar para: peso diario, correcciones
 */
export const setDailyProgress = async (userId, timelineId, dayNumber, progressData) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/set?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...progressData,
          clientTimezone: getUserTimezone(), // Enviar timezone del cliente
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error estableciendo progreso');
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error en setDailyProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene progreso de un día específico
 */
export const getDayProgress = async (userId, timelineId, dayNumber) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/day?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Día no encontrado', notFound: true };
      }
      throw new Error(data.message || 'Error obteniendo progreso del día');
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error en getDayProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene timeline completo con todo el progreso y estadísticas
 */
export const getActiveProgress = async (userId) => {
  try {
    const response = await fetch(`${PROGRESS_BASE}/active/${userId}`);

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'No hay timeline activo', notFound: true };
      }
      throw new Error(data.message || 'Error obteniendo progreso activo');
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error en getActiveProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resetea todo el progreso de un día (vuelve a pending)
 */
export const resetDayProgress = async (userId, timelineId, dayNumber) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/reset?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error reseteando progreso');
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error en resetDayProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Marca un día como completado
 */
export const completeDayProgress = async (userId, timelineId, dayNumber) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/complete?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
      {
        method: 'POST',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error marcando día como completado');
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error en completeDayProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Marca un día como saltado
 */
export const skipDayProgress = async (userId, timelineId, dayNumber, reason = null) => {
  try {
    const response = await fetch(
      `${PROGRESS_BASE}/skip?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error marcando día como saltado');
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error en skipDayProgress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper: Agrega consumo de agua (wrapper sobre addDailyProgress)
 * NO incluye notes - el agua se registra solo como cantidad numérica
 */
export const addWaterIntake = async (userId, timelineId, dayNumber, amountMl) => {
  const waterLiters = amountMl / 1000;
  return await addDailyProgress(userId, timelineId, dayNumber, {
    waterLiters,
  });
};

/**
 * Helper: Agrega comida con macros (wrapper sobre addDailyProgress)
 * Almacena información estructurada en JSON para nutrition tracking
 */
export const addMealProgress = async (userId, timelineId, dayNumber, mealData) => {
  const {
    calories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    mealName = 'Comida',
    estimatedWeight = null,
    confidence = null,
    ingredients = null,
  } = mealData;

  // Crear objeto estructurado para la comida
  const mealEntry = {
    type: 'meal',
    name: mealName,
    calories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fats: fatsGrams,
    timestamp: new Date().toISOString(), // Timestamp en ISO format con timezone
  };

  // Agregar campos opcionales si existen
  if (estimatedWeight) mealEntry.weight = estimatedWeight;
  if (confidence) mealEntry.confidence = confidence;
  if (ingredients && ingredients.length > 0) mealEntry.ingredients = ingredients;

  return await addDailyProgress(userId, timelineId, dayNumber, {
    caloriesConsumed: calories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    notes: JSON.stringify(mealEntry),
  });
};

/**
 * Helper: Registra peso del día (wrapper sobre setDailyProgress)
 */
export const setDailyWeight = async (userId, timelineId, dayNumber, weightKg) => {
  return await setDailyProgress(userId, timelineId, dayNumber, {
    actualWeightKg: weightKg,
  });
};

/**
 * Helper: Agrega cardio (wrapper sobre addDailyProgress)
 */
export const addCardioProgress = async (userId, timelineId, dayNumber, minutes, usedSaunaSuit = false) => {
  return await addDailyProgress(userId, timelineId, dayNumber, {
    cardioMinutes: minutes,
    saunaSuitUsed: usedSaunaSuit,
    notes: `Cardio: ${minutes} min${usedSaunaSuit ? ' (con traje sauna)' : ''}`,
  });
};

/**
 * Helper: Guarda recomendaciones IA aceptadas (wrapper sobre addDailyProgress)
 */
export const saveAIRecommendations = async (userId, timelineId, dayNumber, recommendations) => {
  const aiEntry = {
    type: 'ai_recommendations',
    timestamp: new Date().toISOString(),
    status: recommendations.status,
    message: recommendations.message,
    actions: recommendations.actions,
    nextMeal: recommendations.nextMeal,
    motivation: recommendations.motivation,
    complianceScore: recommendations.complianceScore,
    severity: recommendations.severity,
  };

  return await addDailyProgress(userId, timelineId, dayNumber, {
    notes: JSON.stringify(aiEntry),
  });
};

/**
 * Reajusta el timeline desde un día específico hacia adelante
 * basándose en el progreso real del usuario hasta ese momento
 *
 * @param {string} userId - ID del usuario
 * @param {number} lastCompletedDay - Último día COMPLETADO (ej: 3 significa "completé el día 3")
 * @param {number} currentActualWeight - Peso actual en kg (opcional, si no se envía busca el último registrado)
 * @param {string} timelineId - ID del timeline (opcional, si no se envía usa el activo)
 * @param {string} reason - Razón del reajuste (opcional, para logging)
 *
 * @returns {Promise<Object>} Resultado con el timeline reajustado
 */
export const readjustTimeline = async (userId, lastCompletedDay, currentActualWeight = null, timelineId = null, reason = null) => {
  try {
    const requestBody = {
      userId,
      lastCompletedDay,
    };

    // Agregar campos opcionales si existen
    if (currentActualWeight !== null && currentActualWeight !== undefined) {
      requestBody.currentActualWeight = currentActualWeight;
    }
    if (timelineId) {
      requestBody.timelineId = timelineId;
    }
    if (reason) {
      requestBody.reason = reason;
    }

    const response = await fetch(`${PROGRESS_BASE}/readjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      // Manejar diferentes códigos de error
      if (response.status === 404) {
        throw new Error(data.message || 'Timeline no encontrado');
      }
      if (response.status === 400) {
        throw new Error(data.message || 'Parámetros inválidos');
      }
      throw new Error(data.message || 'Error reajustando timeline');
    }

    return {
      success: true,
      data: data.data,
      message: data.message
    };
  } catch (error) {
    console.error('Error en readjustTimeline:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
