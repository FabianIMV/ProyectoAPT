/**
 * Servicio de alertas para el timeline de weight cutting
 * Genera alertas automáticas basadas en progreso vs metas
 */

/**
 * Analiza el progreso actual y genera alertas específicas
 * @param {Object} params - Parámetros de análisis
 * @returns {Array} - Array de alertas generadas
 */
export const generateTimelineAlerts = ({
  currentDayNumber,
  totalDays,
  currentWeight,
  targetWeightToday,
  targetWeightFinal,
  startWeight,
  actualCalories,
  targetCalories,
  actualWater,
  targetWater,
  yesterdayWeight,
  phase
}) => {
  const alerts = [];
  
  // 1. ALERTA DE PESO - Comparar peso actual vs meta del día
  if (currentWeight && targetWeightToday) {
    const weightDiff = currentWeight - targetWeightToday;
    const weightDiffPercent = (weightDiff / targetWeightToday) * 100;

    if (weightDiff > 1) {
      // Más de 1kg por encima de la meta
      alerts.push({
        id: 'weight_above',
        type: 'critical',
        icon: '⚠️',
        title: 'Peso por Encima de Meta',
        message: `Estás ${weightDiff.toFixed(1)}kg por encima de tu meta de hoy (${targetWeightToday}kg). Ajusta calorías e incrementa cardio.`,
        color: '#F44336',
        action: 'Revisa tu plan del día'
      });
    } else if (weightDiff > 0.3 && weightDiff <= 1) {
      // Ligeramente por encima
      alerts.push({
        id: 'weight_slightly_above',
        type: 'warning',
        icon: '⚡',
        title: 'Peso Levemente Alto',
        message: `Estás ${weightDiff.toFixed(1)}kg sobre tu meta. Mantén el déficit calórico y buena hidratación.`,
        color: '#FF9800',
        action: 'Ajustar alimentación'
      });
    } else if (weightDiff <= 0 && weightDiff >= -0.3) {
      // En meta o ligeramente por debajo (perfecto)
      alerts.push({
        id: 'weight_on_track',
        type: 'success',
        icon: '✅',
        title: 'Peso en Meta',
        message: `¡Excelente! Estás en ${currentWeight.toFixed(1)}kg, cumpliendo tu objetivo de ${targetWeightToday}kg.`,
        color: '#4CAF50',
        action: 'Continúa así'
      });
    } else if (weightDiff < -0.3) {
      // Muy por debajo (puede ser peligroso)
      alerts.push({
        id: 'weight_below',
        type: 'warning',
        icon: '⚠️',
        title: 'Peso Bajo',
        message: `Estás ${Math.abs(weightDiff).toFixed(1)}kg por debajo de meta. Asegúrate de no bajar demasiado rápido.`,
        color: '#FF9800',
        action: 'Monitorear de cerca'
      });
    }
  }

  // 2. ALERTA DE PROGRESO DIARIO - Comparar con día anterior
  if (currentWeight && yesterdayWeight && currentDayNumber > 1) {
    const dailyLoss = yesterdayWeight - currentWeight;
    
    if (dailyLoss < 0) {
      // Ganó peso en lugar de perder
      alerts.push({
        id: 'weight_gain',
        type: 'critical',
        icon: '🚨',
        title: 'Aumento de Peso Detectado',
        message: `Ganaste ${Math.abs(dailyLoss).toFixed(1)}kg desde ayer. Revisa tu alimentación y retención de agua.`,
        color: '#F44336',
        action: 'Acción inmediata requerida'
      });
    } else if (dailyLoss > 1.5) {
      // Perdió demasiado rápido (puede ser peligroso)
      alerts.push({
        id: 'rapid_loss',
        type: 'warning',
        icon: '⚠️',
        title: 'Pérdida Acelerada',
        message: `Perdiste ${dailyLoss.toFixed(1)}kg en un día. Verifica hidratación y no sobreentrenes.`,
        color: '#FF9800',
        action: 'Reducir intensidad'
      });
    }
  }

  // 3. ALERTA DE CALORÍAS
  if (actualCalories !== null && actualCalories !== undefined && targetCalories) {
    const caloriesDiff = actualCalories - targetCalories;
    const caloriesPercent = (actualCalories / targetCalories) * 100;

    if (caloriesPercent > 110) {
      // Exceso de calorías
      alerts.push({
        id: 'calories_over',
        type: 'warning',
        icon: '🔥',
        title: 'Calorías Excedidas',
        message: `Consumiste ${actualCalories} cal, ${caloriesDiff} por encima de tu meta de ${targetCalories} cal.`,
        color: '#FF9800',
        action: 'Ajustar próxima comida'
      });
    } else if (caloriesPercent >= 85 && caloriesPercent <= 110) {
      // En rango correcto
      alerts.push({
        id: 'calories_good',
        type: 'success',
        icon: '✅',
        title: 'Calorías en Rango',
        message: `Consumo calórico correcto: ${actualCalories}/${targetCalories} cal.`,
        color: '#4CAF50',
        action: 'Mantener plan'
      });
    } else if (caloriesPercent < 85 && caloriesPercent > 0) {
      // Muy bajo en calorías (puede afectar rendimiento)
      alerts.push({
        id: 'calories_low',
        type: 'info',
        icon: 'ℹ️',
        title: 'Calorías Bajas',
        message: `Solo has consumido ${actualCalories}/${targetCalories} cal. Considera agregar una comida pequeña.`,
        color: '#2196F3',
        action: 'Aumentar ingesta'
      });
    }
  }

  // 4. ALERTA DE HIDRATACIÓN
  if (actualWater !== null && actualWater !== undefined && targetWater) {
    const waterPercent = (actualWater / targetWater) * 100;

    if (waterPercent < 50) {
      alerts.push({
        id: 'water_critical',
        type: 'critical',
        icon: '💧',
        title: 'Hidratación Crítica',
        message: `Solo has bebido ${actualWater.toFixed(1)}L de ${targetWater}L. La deshidratación afecta el rendimiento.`,
        color: '#F44336',
        action: 'Beber agua ahora'
      });
    } else if (waterPercent >= 50 && waterPercent < 80) {
      alerts.push({
        id: 'water_low',
        type: 'warning',
        icon: '💧',
        title: 'Aumentar Hidratación',
        message: `Llevas ${actualWater.toFixed(1)}L de ${targetWater}L. Aumenta tu consumo de agua.`,
        color: '#FF9800',
        action: 'Beber más agua'
      });
    } else if (waterPercent >= 100) {
      alerts.push({
        id: 'water_complete',
        type: 'success',
        icon: '💧',
        title: 'Meta de Hidratación',
        message: `¡Excelente! Completaste ${actualWater.toFixed(1)}L de hidratación.`,
        color: '#4CAF50',
        action: 'Objetivo cumplido'
      });
    }
  }

  // 5. ALERTA DE DÍAS RESTANTES
  const daysRemaining = totalDays - currentDayNumber;
  const weightRemaining = currentWeight - targetWeightFinal;

  if (daysRemaining <= 2 && weightRemaining > 2) {
    alerts.push({
      id: 'time_critical',
      type: 'critical',
      icon: '⏰',
      title: 'Tiempo Crítico',
      message: `Solo quedan ${daysRemaining} días y faltan ${weightRemaining.toFixed(1)}kg. Considera estrategias finales.`,
      color: '#F44336',
      action: 'Plan de emergencia'
    });
  } else if (daysRemaining <= 5 && weightRemaining > 1) {
    alerts.push({
      id: 'time_warning',
      type: 'warning',
      icon: '⏰',
      title: 'Tiempo Limitado',
      message: `Quedan ${daysRemaining} días para perder ${weightRemaining.toFixed(1)}kg. Mantén disciplina.`,
      color: '#FF9800',
      action: 'Acelerar progreso'
    });
  }

  // 6. ALERTA DE FASE
  if (phase === 'FINAL_PUSH') {
    alerts.push({
      id: 'final_push',
      type: 'info',
      icon: '🏁',
      title: 'Fase Final',
      message: 'Estás en la fase final. Máxima concentración y adherencia al plan.',
      color: '#9C27B0',
      action: 'Último esfuerzo'
    });
  }

  // Ordenar por prioridad: critical > warning > success > info
  const priority = { critical: 0, warning: 1, success: 2, info: 3 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);

  return alerts;
};

/**
 * Filtra alertas para mostrar solo las más relevantes
 * @param {Array} alerts - Array de alertas
 * @param {number} maxAlerts - Número máximo de alertas a mostrar
 * @returns {Array} - Alertas filtradas
 */
export const filterTopAlerts = (alerts, maxAlerts = 3) => {
  // Priorizar critical y warning
  const critical = alerts.filter(a => a.type === 'critical');
  const warning = alerts.filter(a => a.type === 'warning');
  const others = alerts.filter(a => a.type !== 'critical' && a.type !== 'warning');

  const result = [...critical, ...warning, ...others];
  return result.slice(0, maxAlerts);
};
