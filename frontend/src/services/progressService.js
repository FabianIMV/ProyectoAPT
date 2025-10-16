import { API_ENDPOINTS } from '../config/api';

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
        body: JSON.stringify(progressData),
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
        body: JSON.stringify(progressData),
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
 */
export const addWaterIntake = async (userId, timelineId, dayNumber, amountMl) => {
  const waterLiters = amountMl / 1000;
  return await addDailyProgress(userId, timelineId, dayNumber, {
    waterLiters,
    notes: `Agua: ${amountMl}ml`,
  });
};

/**
 * Helper: Agrega comida con macros (wrapper sobre addDailyProgress)
 */
export const addMealProgress = async (userId, timelineId, dayNumber, mealData) => {
  const {
    calories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    mealName = 'Comida',
  } = mealData;

  return await addDailyProgress(userId, timelineId, dayNumber, {
    caloriesConsumed: calories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    notes: mealName,
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
