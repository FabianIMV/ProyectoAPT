import { WATER_API } from '../config/api';

export const addWaterIntake = async (userId, amountMl) => {
  try {
    const response = await fetch(WATER_API.addIntake, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        amountMl,
        date: new Date().toISOString().split('T')[0],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error registrando consumo de agua');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error en addWaterIntake:', error);
    return { success: false, error: error.message };
  }
};

export const getDailyWaterIntake = async (userId, date = null) => {
  try {
    const response = await fetch(WATER_API.getDailyIntake(userId, date));
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error obteniendo consumo diario');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error en getDailyWaterIntake:', error);
    return { success: false, error: error.message };
  }
};

export const getWeeklyWaterIntake = async (userId) => {
  try {
    const response = await fetch(WATER_API.getWeeklyIntake(userId));
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error obteniendo consumo semanal');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error en getWeeklyWaterIntake:', error);
    return { success: false, error: error.message };
  }
};
