export const calculateTimeRemaining = (createdAt, daysToCut) => {
  if (!createdAt || !daysToCut) {
    return { days: 0, hours: 0, isExpired: true, totalHours: 0 };
  }

  const planCreatedDate = new Date(createdAt);
  const competitionDate = new Date(planCreatedDate);
  competitionDate.setDate(competitionDate.getDate() + daysToCut);

  const now = new Date();
  const timeDiff = competitionDate - now;

  if (timeDiff <= 0) {
    return { days: 0, hours: 0, isExpired: true, totalHours: 0 };
  }

  const totalHours = Math.floor(timeDiff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    days,
    hours,
    isExpired: false,
    totalHours,
    competitionDate
  };
};

export const calculateWeightProgress = (currentWeight, targetWeight, startWeight) => {
  if (!currentWeight || !targetWeight || !startWeight) {
    return {
      remaining: 0,
      lost: 0,
      percentage: 0,
      startWeight: 0,
      currentWeight: 0,
      targetWeight: 0
    };
  }

  const totalToLose = startWeight - targetWeight;
  const alreadyLost = startWeight - currentWeight;
  const remaining = currentWeight - targetWeight;
  const percentage = totalToLose > 0 ? Math.round((alreadyLost / totalToLose) * 100) : 0;

  return {
    remaining: Math.max(0, remaining),
    lost: Math.max(0, alreadyLost),
    percentage: Math.min(100, Math.max(0, percentage)),
    startWeight,
    currentWeight,
    targetWeight
  };
};

export const determineCurrentPhase = (createdAt, daysToCut) => {
  if (!createdAt || !daysToCut) {
    return {
      phase: 'NO_PLAN',
      description: 'Sin plan activo',
      daysInPhase: 0,
      totalDaysInPlan: 0
    };
  }

  const planStartDate = new Date(createdAt);
  const now = new Date();
  const daysSinceStart = Math.floor((now - planStartDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = daysToCut - daysSinceStart;

  if (daysRemaining <= 0) {
    return {
      phase: 'COMPLETE',
      description: 'Plan completado',
      daysInPhase: daysSinceStart,
      totalDaysInPlan: daysToCut
    };
  } else if (daysRemaining <= 1) {
    return {
      phase: 'WEIGH_IN',
      description: 'Día de pesaje',
      daysInPhase: daysSinceStart,
      totalDaysInPlan: daysToCut
    };
  } else if (daysRemaining <= 3) {
    return {
      phase: 'WATER_CUT',
      description: 'Corte de agua activo',
      daysInPhase: daysSinceStart,
      totalDaysInPlan: daysToCut
    };
  } else if (daysRemaining <= 7) {
    return {
      phase: 'FINAL_WEEK',
      description: 'Semana final - Corte intensivo',
      daysInPhase: daysSinceStart,
      totalDaysInPlan: daysToCut
    };
  } else {
    return {
      phase: 'INITIAL',
      description: 'Fase inicial - Déficit controlado',
      daysInPhase: daysSinceStart,
      totalDaysInPlan: daysToCut
    };
  }
};

export const getNutritionMetrics = (activePlan, userProfile) => {

  if (!activePlan) {
    return {
      sodium: { current: 0, limit: 2300, unit: 'mg', hasData: false },
      hydration: { current: 0, target: 3.0, unit: 'L', hasData: false },
      calories: { current: 0, target: 2000, unit: 'cal', hasData: false }
    };
  }

  const phase = determineCurrentPhase(
    activePlan.created_at,
    activePlan.analysis_request?.daysToCut
  );

  let sodiumLimit = 2300;
  let hydrationTarget = 3.0;
  let caloriesTarget = activePlan.analysis_response?.actionPlan?.summary?.estimatedTDEE || 2000;

  if (phase.phase === 'WATER_CUT') {
    sodiumLimit = 300;
    hydrationTarget = 1.0;
    caloriesTarget = Math.round(caloriesTarget * 0.5);
  } else if (phase.phase === 'FINAL_WEEK') {
    sodiumLimit = 1500;
    hydrationTarget = 2.5;
    caloriesTarget = Math.round(caloriesTarget * 0.7);
  }

  const deficitCals = activePlan.analysis_response?.actionPlan?.summary?.targetDeficitCalories || 500;
  caloriesTarget = caloriesTarget - deficitCals;

  return {
    sodium: {
      current: null,
      limit: sodiumLimit,
      unit: 'mg',
      hasData: false,
      recommendation: `Máximo ${sodiumLimit}mg/día en esta fase`
    },
    hydration: {
      current: null,
      target: hydrationTarget,
      unit: 'L',
      hasData: false,
      recommendation: `Objetivo ${hydrationTarget}L/día`
    },
    calories: {
      current: null,
      target: Math.round(caloriesTarget),
      unit: 'cal',
      hasData: false,
      recommendation: `Meta ${Math.round(caloriesTarget)} cal/día`
    }
  };
};

export const formatTimeRemaining = (days, hours) => {
  if (days === 0 && hours === 0) {
    return '0H';
  }
  return `${days}D ${hours}H`;
};

export const getPhaseColor = (phase) => {
  const phaseColors = {
    'INITIAL': '#4CAF50',
    'DEPLETION': '#FF9800',
    'WATER_CUT': '#FF5722',
    'FINAL': '#F44336',
    'FINAL_WEEK': '#FF9800',
    'WEIGH_IN': '#F44336',
    'COMPLETE': '#9E9E9E',
    'NO_PLAN': '#607D8B'
  };

  return phaseColors[phase] || '#607D8B';
};

export const getCurrentAlert = (phase, nutritionMetrics) => {
  const alerts = {
    'WATER_CUT': {
      level: 'CRITICAL',
      icon: '!',
      title: 'FASE CRÍTICA - CORTE DE AGUA',
      message: `Reduce sodio a ${nutritionMetrics.sodium.limit}mg/día máximo. Monitorea hidratación.`
    },
    'FINAL_WEEK': {
      level: 'WARNING',
      icon: '⚠',
      title: 'SEMANA FINAL',
      message: `Mantén sodio bajo ${nutritionMetrics.sodium.limit}mg/día. Hidratación ${nutritionMetrics.hydration.target}L.`
    },
    'WEIGH_IN': {
      level: 'INFO',
      icon: '🎯',
      title: 'DÍA DE PESAJE',
      message: 'Sigue el protocolo de pesaje. Minimiza ingesta de líquidos y alimentos.'
    }
  };

  return alerts[phase] || null;
};
