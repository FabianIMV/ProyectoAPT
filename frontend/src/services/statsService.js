import { getDayProgress } from './progressService';

/**
 * Valida si hay suficientes datos para mostrar estadísticas significativas
 */
const hasMinimumDataRequirements = (daysWithData) => {
  if (daysWithData.length === 0) return false;
  
  // Verificar que al menos 1 día tenga datos de calorías O agua
  const hasNutritionData = daysWithData.some(day => {
    const calories = day.actualCalories || day.actual_calories || 0;
    const water = day.actualWaterLiters || day.actual_water_liters || 0;
    return calories > 0 || water > 0;
  });
  
  return hasNutritionData;
};

/**
 * Calcula estadísticas reales del progreso del usuario en su timeline
 * Con validaciones robustas y lógica mejorada
 */
export const calculateRealStats = async (userId, timelineId, currentDayNumber, timeline, activeWeightCut) => {
  try {
    // Validación de parámetros esenciales
    if (!userId || !timelineId || !currentDayNumber || !timeline) {
      console.log('❌ Faltan parámetros esenciales para calcular stats');
      return null;
    }

    // Verificar que haya un plan activo
    if (!activeWeightCut || !activeWeightCut.analysis_request) {
      console.log('❌ No hay plan de corte activo');
      return null;
    }

    // Solo calcular desde día 2 en adelante
    if (currentDayNumber < 2) {
      console.log('ℹ️ Estadísticas disponibles desde día 2');
      return null;
    }

    // Obtener progreso de días anteriores (no incluir día actual para evitar datos incompletos)
    const daysToAnalyze = currentDayNumber - 1; // Solo días completados
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

    console.log(`📊 Analizando ${daysWithData.length} días completados (de ${daysToAnalyze} posibles)`);

    // Validar que haya datos mínimos necesarios
    if (!hasMinimumDataRequirements(daysWithData)) {
      console.log('⚠️ No hay suficientes datos para calcular estadísticas');
      return null;
    }

    // === ANÁLISIS DE PESO ===
    const startWeight = parseFloat(activeWeightCut.analysis_request.currentWeightKg || 0);
    const targetWeight = parseFloat(activeWeightCut.analysis_request.targetWeightKg || 0);
    const totalWeightToLose = startWeight - targetWeight;

    if (startWeight === 0 || targetWeight === 0) {
      console.log('❌ Datos de peso del plan inválidos');
      return null;
    }

    // Buscar pesos registrados (excluyendo el peso inicial si aparece en día 1)
    let weightDataPoints = [];
    daysWithData.forEach((day, index) => {
      const weight = day.actualWeightKg || day.actual_weight_kg;
      const dayNumber = index + 1;
      
      if (weight && weight > 0) {
        // Solo considerar pesos diferentes al inicial o si es día 2+
        if (Math.abs(weight - startWeight) > 0.1 || dayNumber > 1) {
          weightDataPoints.push({
            day: dayNumber,
            weight: parseFloat(weight)
          });
        }
      }
    });

    const hasWeightData = weightDataPoints.length > 0;
    
    // Usar último peso registrado o peso inicial
    const currentWeight = hasWeightData 
      ? weightDataPoints[weightDataPoints.length - 1].weight 
      : startWeight;

    const weightLost = startWeight - currentWeight;
    const weightRemaining = Math.max(0, currentWeight - targetWeight);
    const weightProgress = totalWeightToLose > 0 ? Math.max(0, (weightLost / totalWeightToLose) * 100) : 0;

    console.log(`💪 Peso: inicio=${startWeight}kg, actual=${currentWeight}kg, perdido=${weightLost.toFixed(1)}kg, datos=${weightDataPoints.length}`);

    // Calcular peso esperado para hoy según el plan
    const todayIndex = currentDayNumber - 1;
    const expectedWeightToday = timeline.timeline_data?.days?.[todayIndex]?.targets?.weightKg 
      ? parseFloat(timeline.timeline_data.days[todayIndex].targets.weightKg)
      : currentWeight;

    const weightDeviation = currentWeight - expectedWeightToday;
    const isAheadOfSchedule = weightDeviation < 0; // Si peso actual es menor que esperado, vamos adelantados

    // === ANÁLISIS DE NUTRICIÓN ===
    let totalCalories = 0;
    let totalCaloriesTarget = 0;
    let totalWater = 0;
    let totalWaterTarget = 0;
    let daysWithCalories = 0;
    let daysWithWater = 0;

    daysWithData.forEach((dayData, index) => {
      const dayIndex = index;
      const dayTargets = timeline.timeline_data?.days?.[dayIndex]?.targets;

      if (!dayTargets) return; // Skip si no hay targets del día

      const calories = parseFloat(dayData.actualCalories || dayData.actual_calories || 0);
      const water = parseFloat(dayData.actualWaterLiters || dayData.actual_water_liters || 0);
      const caloriesTarget = parseFloat(dayTargets.caloriesIntake || 0);
      const waterTarget = parseFloat(dayTargets.waterIntakeLiters || 0);

      // Solo contar días con registros válidos (> 0)
      if (calories > 0 && caloriesTarget > 0) {
        totalCalories += calories;
        totalCaloriesTarget += caloriesTarget;
        daysWithCalories++;
      }

      if (water > 0 && waterTarget > 0) {
        totalWater += water;
        totalWaterTarget += waterTarget;
        daysWithWater++;
      }
    });

    const hasCaloriesData = daysWithCalories > 0;
    const hasWaterData = daysWithWater > 0;

    const avgCalories = hasCaloriesData ? Math.round(totalCalories / daysWithCalories) : 0;
    const avgCaloriesTarget = hasCaloriesData ? Math.round(totalCaloriesTarget / daysWithCalories) : 0;
    const caloriesCompliance = (hasCaloriesData && avgCaloriesTarget > 0) 
      ? Math.min(150, (avgCalories / avgCaloriesTarget) * 100) // Cap al 150% para evitar valores absurdos
      : 0;

    const avgWater = hasWaterData ? (totalWater / daysWithWater).toFixed(1) : '0.0';
    const avgWaterTarget = hasWaterData ? (totalWaterTarget / daysWithWater).toFixed(1) : '0.0';
    const waterCompliance = (hasWaterData && parseFloat(avgWaterTarget) > 0)
      ? Math.min(150, (parseFloat(avgWater) / parseFloat(avgWaterTarget)) * 100) // Cap al 150%
      : 0;

    console.log(`🍽️ Nutrición: cal=${avgCalories}/${avgCaloriesTarget} (${caloriesCompliance.toFixed(0)}%), agua=${avgWater}/${avgWaterTarget}L (${waterCompliance.toFixed(0)}%)`);

    // === ANÁLISIS DE RACHA ===
    let currentStreak = 0;
    const COMPLIANCE_MIN = 0.7; // 70% mínimo
    const COMPLIANCE_MAX = 1.5; // 150% máximo (valores exagerados no cuentan)

    // Buscar desde el día más reciente hacia atrás
    for (let i = daysWithData.length - 1; i >= 0; i--) {
      const dayData = daysWithData[i];
      const dayIndex = i;
      const dayTargets = timeline.timeline_data?.days?.[dayIndex]?.targets;

      if (!dayTargets) continue;

      const calories = parseFloat(dayData.actualCalories || dayData.actual_calories || 0);
      const caloriesTarget = parseFloat(dayTargets.caloriesIntake || 0);
      const water = parseFloat(dayData.actualWaterLiters || dayData.actual_water_liters || 0);
      const waterTarget = parseFloat(dayTargets.waterIntakeLiters || 0);

      // Calcular cumplimiento
      const caloriesRatio = caloriesTarget > 0 ? (calories / caloriesTarget) : 0;
      const waterRatio = waterTarget > 0 ? (water / waterTarget) : 0;

      // Día cumplido si ambos están entre 70-150% de la meta
      const caloriesMet = caloriesRatio >= COMPLIANCE_MIN && caloriesRatio <= COMPLIANCE_MAX;
      const waterMet = waterRatio >= COMPLIANCE_MIN && waterRatio <= COMPLIANCE_MAX;
      const hasData = (calories > 0 && water > 0);

      console.log(`📅 Día ${dayIndex + 1}: Cal=${caloriesRatio.toFixed(2)} (${caloriesMet ? '✅' : '❌'}), Agua=${waterRatio.toFixed(2)} (${waterMet ? '✅' : '❌'})`);

      if (hasData && caloriesMet && waterMet) {
        currentStreak++;
      } else {
        break; // Racha se rompe
      }
    }

    // === CUMPLIMIENTO GENERAL ===
    // Calcular usando solo métricas con datos válidos
    const metrics = [];
    
    if (hasWeightData && weightProgress > 0) {
      metrics.push(Math.min(100, weightProgress)); // Peso no debe superar 100%
    }
    
    if (hasCaloriesData) {
      metrics.push(Math.min(100, caloriesCompliance)); // Cap a 100%
    }
    
    if (hasWaterData) {
      metrics.push(Math.min(100, waterCompliance)); // Cap a 100%
    }

    // Si no hay ninguna métrica válida, no se puede calcular cumplimiento
    if (metrics.length === 0) {
      console.log('⚠️ No hay métricas válidas para calcular cumplimiento');
      return null;
    }

    const overallCompliance = Math.round(
      metrics.reduce((sum, val) => sum + val, 0) / metrics.length
    );

    console.log(`🏆 Cumplimiento general: ${overallCompliance}% (${metrics.length} métricas), racha: ${currentStreak} días`);

    // === ESTADO DEL PLAN ===
    let planStatus = 'on_track';
    let planStatusMessage = '';
    let planStatusColor = '#4CAF50';

    // Evaluar basándose en métricas disponibles
    if (hasWeightData && weightDataPoints.length > 0) {
      // Evaluar basándose en desviación de peso
      if (isAheadOfSchedule && Math.abs(weightDeviation) > 0.5) {
        planStatus = 'ahead';
        planStatusMessage = `Excelente! Vas ${Math.abs(weightDeviation).toFixed(1)}kg adelantado`;
        planStatusColor = '#2196F3';
      } else if (!isAheadOfSchedule && weightDeviation > 1.0) {
        planStatus = 'critical';
        planStatusMessage = `Ajusta tu plan: +${weightDeviation.toFixed(1)}kg sobre meta`;
        planStatusColor = '#F44336';
      } else if (!isAheadOfSchedule && weightDeviation > 0.5) {
        planStatus = 'behind';
        planStatusMessage = `Ligeramente arriba: +${weightDeviation.toFixed(1)}kg`;
        planStatusColor = '#FF9800';
      } else {
        planStatusMessage = 'Vas perfecto según el plan!';
        planStatusColor = '#4CAF50';
      }
    } else {
      // Sin datos de peso, evaluar por cumplimiento general
      if (overallCompliance >= 90) {
        planStatus = 'excellent';
        planStatusMessage = `¡Excelente! ${overallCompliance}% cumplimiento`;
        planStatusColor = '#4CAF50';
      } else if (overallCompliance >= 70) {
        planStatusMessage = `Buen progreso (${overallCompliance}%)`;
        planStatusColor = '#2196F3';
      } else if (overallCompliance >= 50) {
        planStatus = 'behind';
        planStatusMessage = `${overallCompliance}% - Puedes mejorar`;
        planStatusColor = '#FF9800';
      } else {
        planStatus = 'critical';
        planStatusMessage = `${overallCompliance}% - Enfócate más`;
        planStatusColor = '#FF9800';
      }
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
      hasWeightData, // true si hay pesos registrados válidos
      weightDataPoints: weightDataPoints.length, // Cantidad de registros

      // Nutrición
      avgCalories,
      avgCaloriesTarget,
      caloriesCompliance: Math.round(caloriesCompliance),
      hasCaloriesData, // true si hay datos de calorías válidos
      avgWater: parseFloat(avgWater),
      avgWaterTarget: parseFloat(avgWaterTarget),
      waterCompliance: Math.round(waterCompliance),
      hasWaterData, // true si hay datos de agua válidos

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
