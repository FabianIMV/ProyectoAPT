import { getDayProgress } from './progressService';

/**
 * Calcula estadísticas reales del progreso del usuario en su timeline
 */
export const calculateRealStats = async (userId, timelineId, currentDayNumber, timeline, activeWeightCut) => {
  try {
    if (!userId || !timelineId || !currentDayNumber || !timeline) {
      return null;
    }

    // Obtener progreso de todos los días hasta ahora
    const daysToAnalyze = Math.min(currentDayNumber, timeline.total_days);
    const progressPromises = [];
    
    for (let day = 1; day <= daysToAnalyze; day++) {
      progressPromises.push(
        getDayProgress(userId, timelineId, day)
      );
    }

    const progressResults = await Promise.all(progressPromises);
    const daysWithData = progressResults
      .filter(r => r.success && r.data)
      .map(r => r.data);

    console.log('📊 Días con datos para stats:', daysWithData.length, 'de', daysToAnalyze);

    if (daysWithData.length === 0) {
      console.log('⚠️ No hay datos de progreso registrados');
      return null;
    }

    // Peso inicial y actual
    const startWeight = parseFloat(activeWeightCut?.analysis_request?.currentWeightKg || 0);
    const targetWeight = parseFloat(activeWeightCut?.analysis_request?.targetWeightKg || 0);
    const totalWeightToLose = startWeight - targetWeight;

    // Obtener último peso registrado
    let currentWeight = startWeight;
    for (let i = daysWithData.length - 1; i >= 0; i--) {
      const weight = daysWithData[i].actualWeightKg || daysWithData[i].actual_weight_kg;
      if (weight) {
        currentWeight = parseFloat(weight);
        break;
      }
    }

    const weightLost = startWeight - currentWeight;
    const weightRemaining = currentWeight - targetWeight;
    const weightProgress = (weightLost / totalWeightToLose) * 100;

    // Calcular peso esperado para hoy según el plan
    const todayIndex = currentDayNumber - 1;
    const expectedWeightToday = timeline.timeline_data?.days?.[todayIndex]?.targets?.weightKg 
      ? parseFloat(timeline.timeline_data.days[todayIndex].targets.weightKg)
      : currentWeight;

    const weightDeviation = currentWeight - expectedWeightToday;
    const isAheadOfSchedule = weightDeviation < 0; // Si peso actual es menor que esperado, vamos adelantados

    // Calcular promedios de nutrición
    let totalCalories = 0;
    let totalCaloriesTarget = 0;
    let totalWater = 0;
    let totalWaterTarget = 0;
    let daysWithCalories = 0;
    let daysWithWater = 0;

    daysWithData.forEach((dayData, index) => {
      const dayIndex = index;
      const dayTargets = timeline.timeline_data?.days?.[dayIndex]?.targets;

      const calories = dayData.actualCalories || dayData.actual_calories || 0;
      const water = dayData.actualWaterLiters || dayData.actual_water_liters || 0;

      if (calories > 0) {
        totalCalories += calories;
        totalCaloriesTarget += dayTargets?.caloriesIntake || 0;
        daysWithCalories++;
      }

      if (water > 0) {
        totalWater += water;
        totalWaterTarget += dayTargets?.waterIntakeLiters || 0;
        daysWithWater++;
      }
    });

    const avgCalories = daysWithCalories > 0 ? Math.round(totalCalories / daysWithCalories) : 0;
    const avgCaloriesTarget = daysWithCalories > 0 ? Math.round(totalCaloriesTarget / daysWithCalories) : 0;
    const caloriesCompliance = avgCaloriesTarget > 0 ? (avgCalories / avgCaloriesTarget) * 100 : 0;

    const avgWater = daysWithWater > 0 ? (totalWater / daysWithWater).toFixed(1) : 0;
    const avgWaterTarget = daysWithWater > 0 ? (totalWaterTarget / daysWithWater).toFixed(1) : 0;
    const waterCompliance = avgWaterTarget > 0 ? (avgWater / avgWaterTarget) * 100 : 0;

    // Calcular racha de días cumpliendo metas
    let currentStreak = 0;
    for (let i = daysWithData.length - 1; i >= 0; i--) {
      const dayData = daysWithData[i];
      const dayIndex = i;
      const dayTargets = timeline.timeline_data?.days?.[dayIndex]?.targets;

      const calories = dayData.actualCalories || dayData.actual_calories || 0;
      const caloriesTarget = dayTargets?.caloriesIntake || 0;
      const water = dayData.actualWaterLiters || dayData.actual_water_liters || 0;
      const waterTarget = dayTargets?.waterIntakeLiters || 0;

      // Considerar día cumplido si tiene al menos 80% de calorías y agua
      const caloriesMet = calories >= (caloriesTarget * 0.8);
      const waterMet = water >= (waterTarget * 0.8);

      if (caloriesMet && waterMet) {
        currentStreak++;
      } else {
        break; // Racha se rompe
      }
    }

    // Calcular cumplimiento general
    const overallCompliance = Math.round((caloriesCompliance + waterCompliance + weightProgress) / 3);

    // Estado del plan
    let planStatus = 'on_track';
    let planStatusMessage = '¡Vas perfecto según el plan!';
    let planStatusColor = '#4CAF50';

    if (isAheadOfSchedule && Math.abs(weightDeviation) > 0.5) {
      planStatus = 'ahead';
      planStatusMessage = `¡Excelente! Vas ${Math.abs(weightDeviation).toFixed(1)}kg adelantado`;
      planStatusColor = '#2196F3';
    } else if (!isAheadOfSchedule && weightDeviation > 0.5) {
      planStatus = 'behind';
      planStatusMessage = `Estás ${weightDeviation.toFixed(1)}kg por encima del plan`;
      planStatusColor = '#FF9800';
    } else if (!isAheadOfSchedule && weightDeviation > 1.0) {
      planStatus = 'critical';
      planStatusMessage = `⚠️ ${weightDeviation.toFixed(1)}kg por encima - Ajusta tu plan`;
      planStatusColor = '#F44336';
    }

    return {
      // Peso
      startWeight: startWeight.toFixed(1),
      currentWeight: currentWeight.toFixed(1),
      targetWeight: targetWeight.toFixed(1),
      weightLost: weightLost.toFixed(1),
      weightRemaining: weightRemaining.toFixed(1),
      weightProgress: Math.round(weightProgress),
      expectedWeightToday: expectedWeightToday.toFixed(1),
      weightDeviation: weightDeviation.toFixed(1),
      isAheadOfSchedule,

      // Nutrición
      avgCalories,
      avgCaloriesTarget,
      caloriesCompliance: Math.round(caloriesCompliance),
      avgWater,
      avgWaterTarget,
      waterCompliance: Math.round(waterCompliance),

      // Progreso general
      daysCompleted: currentDayNumber - 1,
      totalDays: timeline.total_days,
      daysRemaining: timeline.total_days - (currentDayNumber - 1),
      currentStreak,
      overallCompliance,

      // Estado
      planStatus,
      planStatusMessage,
      planStatusColor,

      // Meta
      daysWithData: daysWithData.length
    };
  } catch (error) {
    console.error('Error calculando estadísticas reales:', error);
    return null;
  }
};

/**
 * Calcula el nivel de cumplimiento basado en el porcentaje
 */
export const getComplianceLevel = (percentage) => {
  if (percentage >= 90) return { level: 'excellent', color: '#4CAF50', label: 'Excelente' };
  if (percentage >= 75) return { level: 'good', color: '#2196F3', label: 'Bueno' };
  if (percentage >= 60) return { level: 'fair', color: '#FF9800', label: 'Regular' };
  return { level: 'poor', color: '#F44336', label: 'Bajo' };
};
