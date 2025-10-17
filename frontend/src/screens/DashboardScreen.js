import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API, PROFILE_API } from '../config/api';
import {
  calculateTimeRemaining,
  calculateWeightProgress,
  determineCurrentPhase,
  getNutritionMetrics,
  formatTimeRemaining,
  getPhaseColor,
  getCurrentAlert
} from '../services/dashboardService';
import { addWaterIntake as addWaterIntakeOld, getDailyWaterIntake } from '../services/waterService';
import { addWaterIntake, getDayProgress, setDailyWeight } from '../services/progressService';
import WaterIntakeModal from '../components/WaterIntakeModal';
import WeightInputModal from '../components/WeightInputModal';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { userId, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeWeightCut, setActiveWeightCut] = useState(null);
  const [loadingWeightCut, setLoadingWeightCut] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTimeline, setActiveTimeline] = useState(null);
  const [currentDayData, setCurrentDayData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [needsTimeline, setNeedsTimeline] = useState(false);
  const [dailyWaterIntake, setDailyWaterIntake] = useState(0);
  const [addingWater, setAddingWater] = useState(false);
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);
  const [currentDayNumber, setCurrentDayNumber] = useState(null);
  const [timelineId, setTimelineId] = useState(null);
  const [dailyProgressData, setDailyProgressData] = useState(null);
  const [showWeightReminder, setShowWeightReminder] = useState(false);
  const [yesterdayProgressData, setYesterdayProgressData] = useState(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  useEffect(() => {
    if (userId && user) {
      loadDashboardData();
    }
  }, [userId, user]);

  // Listener para recargar cuando vuelve de otras pantallas
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId && user) {
        loadDashboardData();
      }
    });

    return unsubscribe;
  }, [navigation, userId, user]);

  // Cargar agua cuando tengamos timelineId y currentDayNumber
  useEffect(() => {
    if (timelineId && currentDayNumber !== null) {
      loadWaterIntake();
    }
  }, [timelineId, currentDayNumber]);

  const loadUserProfile = async () => {
    if (!user || !user.email) return null;

    try {
      const response = await fetch(PROFILE_API.getProfile(user.email));
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          return data.data[0];
        }
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
    }
    return null;
  };

  const loadActiveWeightCut = async () => {
    if (!userId) return null;

    try {
      const response = await fetch(WEIGHT_CUT_API.getUserPlans(userId));

      if (response.ok) {
        const data = await response.json();
        const active = data.data?.find(wc => wc.is_active);
        return active || null;
      }
    } catch (error) {
      console.error('❌ Error cargando weight cut activo:', error);
    }
    return null;
  };

  const loadActiveTimeline = async () => {
    if (!userId) return null;

    try {
      const response = await fetch(WEIGHT_CUT_API.getTimeline(userId));

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      } else if (response.status === 404) {
        console.log('ℹ️ No active timeline found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error cargando timeline:', error);
    }
    return null;
  };

  const calculateCurrentDay = (startDate, totalDays) => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const dayIndex = Math.floor((today - start) / (1000 * 60 * 60 * 24));

    if (dayIndex < 0) return null;
    if (dayIndex >= totalDays) return 'completed';

    return dayIndex;
  };

  const loadWaterIntake = async () => {
    if (!userId || !timelineId || currentDayNumber === null) {
      console.log('⚠️ No se puede cargar agua: faltan datos', { userId, timelineId, currentDayNumber });
      return;
    }

    try {
      // Intentar obtener datos del día actual desde Daily Progress
      const result = await getDayProgress(userId, timelineId, currentDayNumber);
      if (result.success && result.data) {
        const waterLiters = result.data.actualWaterLiters || 0;
        setDailyWaterIntake(waterLiters);
        console.log(`✅ Agua del día ${currentDayNumber}: ${waterLiters}L`);
      } else if (result.notFound) {
        // Día aún no iniciado (pending)
        setDailyWaterIntake(0);
        console.log(`ℹ️ Día ${currentDayNumber} aún no tiene progreso registrado`);
      }
    } catch (error) {
      console.error('Error cargando consumo de agua:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoadingWeightCut(true);
    setLoadingTimeline(true);

    try {
      const [profile, activePlan, timeline] = await Promise.all([
        loadUserProfile(),
        loadActiveWeightCut(),
        loadActiveTimeline()
      ]);

      setUserProfile(profile);
      setActiveWeightCut(activePlan);
      setActiveTimeline(timeline);

      // Guardar timelineId y calcular día actual
      let calculatedTimelineId = null;
      let calculatedDayNumber = null;

      if (timeline) {
        calculatedTimelineId = timeline.id;
        setTimelineId(calculatedTimelineId);

        const dayIndex = calculateCurrentDay(timeline.start_date, timeline.total_days);
        if (dayIndex !== 'completed' && dayIndex !== null && dayIndex >= 0) {
          // dayNumber es 1-indexed, dayIndex es 0-indexed
          calculatedDayNumber = dayIndex + 1;
          setCurrentDayNumber(calculatedDayNumber);
        }
      }

      // Cargar progreso del día actual y del día anterior (para peso)
      let loadedProgressData = null;
      let loadedYesterdayProgress = null;

      if (calculatedTimelineId && calculatedDayNumber !== null) {
        try {
          // Cargar progreso del día actual
          const result = await getDayProgress(userId, calculatedTimelineId, calculatedDayNumber);

          if (result.success && result.data) {
            loadedProgressData = result.data;
            setDailyProgressData(result.data);

            const waterLiters = result.data.actualWaterLiters || result.data.actual_water_liters || 0;
            setDailyWaterIntake(waterLiters);
          } else if (result.notFound) {
            setDailyWaterIntake(0);
            setDailyProgressData(null);
          }

          // Si es día 2 o posterior, cargar progreso del día anterior para obtener el peso
          if (calculatedDayNumber > 1) {
            const yesterdayResult = await getDayProgress(userId, calculatedTimelineId, calculatedDayNumber - 1);
            if (yesterdayResult.success && yesterdayResult.data) {
              loadedYesterdayProgress = yesterdayResult.data;
              setYesterdayProgressData(yesterdayResult.data);

              // Verificar si falta registrar el peso del día anterior
              const yesterdayWeight = yesterdayResult.data.actualWeightKg || yesterdayResult.data.actual_weight_kg;
              if (!yesterdayWeight) {
                setShowWeightReminder(true);
              }
            }
          }
        } catch (error) {
          console.error('Error cargando progreso del día:', error);
        }
      }

      if (activePlan && !timeline) {
        setNeedsTimeline(true);
        setLoadingTimeline(false);
        setLoadingWeightCut(false);
        return;
      }

      if (activePlan && profile) {
        let currentDayInfo = null;
        let phaseData = null;

        if (timeline && timeline.timeline_data?.days) {
          const dayIndex = calculateCurrentDay(timeline.start_date, timeline.total_days);

          if (dayIndex === 'completed') {
            setDashboardData({ timeRemaining: { isExpired: true } });
          } else if (dayIndex !== null && dayIndex >= 0) {
            currentDayInfo = timeline.timeline_data.days[dayIndex];
            setCurrentDayData(currentDayInfo);
          }
        }

        const timeRemaining = timeline
          ? calculateTimeRemaining(timeline.start_date, timeline.total_days)
          : calculateTimeRemaining(activePlan.created_at, activePlan.analysis_request?.daysToCut);

        // Usar peso del Daily Progress
        // Día 1: Usar peso del día 1 si existe, si no del perfil
        // Día 2+: Usar peso del día anterior (peso matutino que se registró en la mañana)
        let actualWeight;
        if (calculatedDayNumber === 1) {
          // Día 1: usar peso registrado del día 1, o del perfil
          actualWeight = loadedProgressData?.actualWeightKg || loadedProgressData?.actual_weight_kg;
        } else {
          // Día 2+: usar peso del día anterior (que fue registrado esta mañana)
          actualWeight = loadedYesterdayProgress?.actualWeightKg || loadedYesterdayProgress?.actual_weight_kg;
        }

        // Peso a mostrar: si hay peso registrado del día correspondiente, usarlo; sino usar peso del perfil
        const currentWeight = actualWeight
          ? parseFloat(actualWeight)
          : parseFloat(activePlan.analysis_request?.currentWeightKg);

        const weightProgress = calculateWeightProgress(
          currentWeight,
          currentDayInfo ? parseFloat(currentDayInfo.targets.weightKg) : parseFloat(activePlan.analysis_request?.targetWeightKg),
          parseFloat(activePlan.analysis_request?.currentWeightKg)
        );

        const currentPhase = currentDayInfo
          ? { phase: currentDayInfo.phase, description: currentDayInfo.phaseReference, daysInPhase: currentDayInfo.day - 1, totalDaysInPlan: timeline.total_days }
          : determineCurrentPhase(activePlan.created_at, activePlan.analysis_request?.daysToCut);

        const nutritionMetrics = currentDayInfo
          ? {
              calories: { current: null, target: currentDayInfo.targets.caloriesIntake, hasData: false },
              hydration: { current: null, target: currentDayInfo.targets.waterIntakeLiters, hasData: false },
              sodium: { current: null, limit: 2300, hasData: false },
              macros: currentDayInfo.targets.macros
            }
          : getNutritionMetrics(activePlan, profile);

        const currentAlert = currentDayInfo && currentDayInfo.warnings?.length > 0
          ? { level: 'WARNING', icon: '⚠️', title: 'Advertencias del Día', message: currentDayInfo.warnings.join(' ') }
          : getCurrentAlert(currentPhase.phase, nutritionMetrics);

        setDashboardData({
          timeRemaining,
          weightProgress,
          currentPhase,
          nutritionMetrics,
          currentAlert,
          hasTimeline: !!timeline,
          currentDayInfo
        });

        console.log('✅ Dashboard data loaded:', {
          hasActivePlan: true,
          hasTimeline: !!timeline,
          phase: currentPhase.phase,
          daysRemaining: timeRemaining.days
        });
      } else {
        setDashboardData(null);
        console.log('ℹ️ No active plan found');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoadingWeightCut(false);
      setLoadingTimeline(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getRiskColor = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return '#4CAF50';
      case 'MODERATE': return '#FF9800';
      case 'AGGRESSIVE': return '#FF5722';
      case 'DANGEROUS': return '#F44336';
      default: return COLORS.secondary;
    }
  };

  const getRiskLabel = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return 'Riesgo Bajo';
      case 'MODERATE': return 'Riesgo Moderado';
      case 'AGGRESSIVE': return 'Riesgo Agresivo';
      case 'DANGEROUS': return 'Riesgo Peligroso';
      default: return 'Sin riesgo';
    }
  };

  const handleAddWater = async (amount = 250) => {
    if (!userId) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    if (!timelineId || currentDayNumber === null) {
      Alert.alert(
        'Timeline Requerido',
        'Debes activar tu timeline diario para registrar progreso'
      );
      return;
    }

    setAddingWater(true);

    try {
      const result = await addWaterIntake(userId, timelineId, currentDayNumber, amount);

      if (result.success) {
        await loadWaterIntake();
        Alert.alert('Registrado', `${amount}ml de agua agregados correctamente`);
        setWaterModalVisible(false);
      } else {
        Alert.alert('Error', result.error || 'No se pudo registrar el consumo de agua');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al registrar el agua');
      console.error('Error en handleAddWater:', error);
    } finally {
      setAddingWater(false);
    }
  };

  const handleAddWeight = async (weightKg) => {
    if (!userId) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    if (!timelineId || currentDayNumber === null) {
      Alert.alert(
        'Timeline Requerido',
        'Debes activar tu timeline diario para registrar progreso'
      );
      return;
    }

    setSavingWeight(true);

    try {
      // Determinar a qué día guardar el peso
      // Si es día 1: guardar en día 1 (no hay día anterior)
      // Si es día 2+: guardar en día anterior (peso matutino refleja día anterior)
      const targetDay = currentDayNumber > 1 ? currentDayNumber - 1 : currentDayNumber;

      const result = await setDailyWeight(userId, timelineId, targetDay, weightKg);

      if (result.success) {
        await loadDashboardData();
        const message = currentDayNumber > 1
          ? `Peso de ${weightKg.toFixed(1)}kg registrado como resultado del día ${targetDay}`
          : `Peso inicial de ${weightKg.toFixed(1)}kg registrado`;
        Alert.alert('Registrado', message);
        setWeightModalVisible(false);
      } else {
        Alert.alert('Error', result.error || 'No se pudo registrar el peso');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al registrar el peso');
      console.error('Error en handleAddWeight:', error);
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.secondary]}
          tintColor={COLORS.secondary}
        />
      }
    >
      {/* Modal de recordatorio de peso */}
      {showWeightReminder && currentDayNumber > 1 && (
        <View style={styles.reminderOverlay}>
          <View style={styles.reminderModal}>
            <View style={styles.reminderIconContainer}>
              <Ionicons name="scale" size={48} color={COLORS.secondary} />
            </View>
            <Text style={styles.reminderTitle}>Registra tu Peso Matutino</Text>
            <Text style={styles.reminderText}>
              Estás en el Día {currentDayNumber}. Por favor registra tu peso de esta mañana
              para cerrar el progreso del Día {currentDayNumber - 1}.
            </Text>
            <Text style={styles.reminderNote}>
              El peso matutino refleja el resultado del día anterior.
            </Text>
            <View style={styles.reminderButtons}>
              <TouchableOpacity
                style={styles.reminderButtonPrimary}
                onPress={() => {
                  setShowWeightReminder(false);
                  setWeightModalVisible(true);
                }}
              >
                <Text style={styles.reminderButtonPrimaryText}>Registrar Peso</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reminderButtonSecondary}
                onPress={() => setShowWeightReminder(false)}
              >
                <Text style={styles.reminderButtonSecondaryText}>Más Tarde</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.header}>
        {refreshing && (
          <View style={styles.loadingHeader}>
            <ActivityIndicator size="small" color={COLORS.secondary} />
            <Text style={styles.loadingText}>Actualizando datos...</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>Avance Diario</Text>
        {currentDayData && currentDayData.date && (
          <Text style={styles.todayDate}>
            {new Date(currentDayData.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        )}
      </View>

      {/* Empty state - No plan */}
      {!loadingWeightCut && !activeWeightCut && (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateTitle}>No tienes un plan activo</Text>
          <Text style={styles.emptyStateText}>
            Crea un plan de corte de peso personalizado para empezar a trackear tu progreso
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('WeightCutCalculator')}
          >
            <Text style={styles.emptyStateButtonText}>Crear Plan de Corte</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline needed */}
      {!loadingWeightCut && !loadingTimeline && needsTimeline && activeWeightCut && (
        <View style={styles.timelineNeededCard}>
          <Text style={styles.timelineNeededIcon}>📅</Text>
          <Text style={styles.timelineNeededTitle}>Timeline Requerido</Text>
          <Text style={styles.timelineNeededText}>
            Necesitas activar tu timeline diario para acceder al dashboard personalizado.
          </Text>
          <Text style={styles.timelineNeededSubtext}>
            El timeline generará objetivos específicos para cada día de tu plan de corte.
          </Text>
          <TouchableOpacity
            style={styles.timelineNeededButton}
            onPress={() => navigation.navigate('ActivateTimeline', {
              activePlan: activeWeightCut,
              totalDays: activeWeightCut.analysis_request?.daysToCut
            })}
          >
            <Text style={styles.timelineNeededButtonText}>Activar Timeline</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === HERO METRICS SECTION === */}
      {/* F-Pattern: Información más importante en la parte superior */}
      {currentDayData && dashboardData && (
        <View style={styles.heroMetricsSection}>
          <Text style={styles.heroMetricsTitle}>Métricas del Día</Text>

          <View style={styles.heroMetricsGrid}>
            {/* Peso Card */}
            <TouchableOpacity
              style={styles.heroMetricCard}
              onPress={() => setWeightModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.heroMetricIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="scale" size={24} color="white" />
              </View>
              <Text style={styles.heroMetricLabel}>Peso</Text>
              <View style={styles.heroMetricValues}>
                <Text style={styles.heroMetricCurrent}>
                  {(() => {
                    // Día 1: Mostrar peso del día 1 o peso inicial del plan
                    if (currentDayNumber === 1) {
                      const day1Weight = dailyProgressData?.actualWeightKg || dailyProgressData?.actual_weight_kg;
                      return (day1Weight || dashboardData.weightProgress.startWeight).toFixed(1);
                    }
                    // Día 2+: Mostrar peso del día anterior
                    const yesterdayWeight = yesterdayProgressData?.actualWeightKg || yesterdayProgressData?.actual_weight_kg;
                    return (yesterdayWeight || dashboardData.weightProgress.startWeight).toFixed(1);
                  })()}
                </Text>
                <Text style={styles.heroMetricUnit}>kg</Text>
              </View>
              <Text style={styles.heroMetricTarget}>
                Meta: {currentDayData.targets.weightKg} kg
              </Text>
              <View style={styles.heroMetricProgress}>
                <View style={[
                  styles.heroMetricProgressFill,
                  {
                    width: `${Math.min(100, Math.abs(dashboardData.weightProgress.percentageAchieved))}%`,
                    backgroundColor: dashboardData.weightProgress.percentageAchieved >= 100 ? '#4CAF50' : '#FF9800'
                  }
                ]} />
              </View>
            </TouchableOpacity>

            {/* Calorías Card */}
            <TouchableOpacity
              style={styles.heroMetricCard}
              onPress={() => navigation.navigate('NutritionTracking')}
              activeOpacity={0.7}
            >
              <View style={[styles.heroMetricIcon, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="flame" size={24} color="white" />
              </View>
              <Text style={styles.heroMetricLabel}>Calorías</Text>
              <View style={styles.heroMetricValues}>
                <Text style={styles.heroMetricCurrent}>
                  {dailyProgressData?.actualCalories || dailyProgressData?.actual_calories || 0}
                </Text>
                <Text style={styles.heroMetricUnit}>cal</Text>
              </View>
              <Text style={styles.heroMetricTarget}>
                Meta: {currentDayData.targets.caloriesIntake} cal
              </Text>
              <View style={styles.heroMetricProgress}>
                <View style={[
                  styles.heroMetricProgressFill,
                  {
                    width: `${Math.min(100, ((dailyProgressData?.actualCalories || dailyProgressData?.actual_calories || 0) / currentDayData.targets.caloriesIntake) * 100)}%`,
                    backgroundColor: ((dailyProgressData?.actualCalories || dailyProgressData?.actual_calories || 0) / currentDayData.targets.caloriesIntake) >= 1 ? '#4CAF50' : COLORS.secondary
                  }
                ]} />
              </View>
            </TouchableOpacity>

            {/* Agua Card */}
            <TouchableOpacity
              style={styles.heroMetricCard}
              onPress={() => setWaterModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.heroMetricIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="water" size={24} color="white" />
              </View>
              <Text style={styles.heroMetricLabel}>Hidratación</Text>
              <View style={styles.heroMetricValues}>
                <Text style={styles.heroMetricCurrent}>{dailyWaterIntake.toFixed(1)}</Text>
                <Text style={styles.heroMetricUnit}>L</Text>
              </View>
              <Text style={styles.heroMetricTarget}>
                Meta: {currentDayData.targets.waterIntakeLiters}L
              </Text>
              <View style={styles.heroMetricProgress}>
                <View style={[
                  styles.heroMetricProgressFill,
                  {
                    width: `${Math.min(100, (dailyWaterIntake / currentDayData.targets.waterIntakeLiters) * 100)}%`,
                    backgroundColor: dailyWaterIntake >= currentDayData.targets.waterIntakeLiters ? '#4CAF50' : '#2196F3'
                  }
                ]} />
              </View>
              {dailyWaterIntake >= currentDayData.targets.waterIntakeLiters && (
                <View style={styles.heroMetricBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={styles.heroMetricBadgeText}>Completado</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. PLAN DEL DÍA - Colapsable */}
      {currentDayData && (
        <TouchableOpacity
          style={styles.todayCard}
          onPress={() => setIsPlanExpanded(!isPlanExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.todayCardHeader}>
            <View>
              <Text style={styles.todayTitle}>📅 Plan del Día {currentDayData.day}</Text>

            </View>
            <Ionicons
              name={isPlanExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color={COLORS.secondary}
            />
          </View>

          {/* Vista compacta - siempre visible */}
          {!isPlanExpanded && (
            <View style={styles.todayCompactView}>
              <View style={styles.todayTargetsRow}>
                <View style={styles.todayCompactItem}>
                  <Text style={styles.todayCompactIcon}>🎯</Text>
                  <Text style={styles.todayCompactValue}>{currentDayData.targets.weightKg} kg</Text>
                </View>
                <View style={styles.todayCompactItem}>
                  <Text style={styles.todayCompactIcon}>🔥</Text>
                  <Text style={styles.todayCompactValue}>{currentDayData.targets.caloriesIntake} cal</Text>
                </View>
                {currentDayData.targets.cardioMinutes > 0 && (
                  <View style={styles.todayCompactItem}>
                    <Text style={styles.todayCompactIcon}>🏃</Text>
                    <Text style={styles.todayCompactValue}>{currentDayData.targets.cardioMinutes} min</Text>
                  </View>
                )}
              </View>
              <Text style={styles.todayCompactHint}>Toca para ver detalles</Text>
            </View>
          )}

          {/* Vista expandida */}
          {isPlanExpanded && (
            <View style={styles.todayExpandedView}>
              <View style={styles.todayTargetsGrid}>
                <View style={styles.todayTargetItem}>
                  <Text style={styles.todayTargetIcon}>🎯</Text>
                  <Text style={styles.todayTargetLabel}>Peso Objetivo</Text>
                  <Text style={styles.todayTargetValue}>{currentDayData.targets.weightKg} kg</Text>
                </View>
                <View style={styles.todayTargetItem}>
                  <Text style={styles.todayTargetIcon}>🔥</Text>
                  <Text style={styles.todayTargetLabel}>Calorías</Text>
                  <Text style={styles.todayTargetValue}>{currentDayData.targets.caloriesIntake}</Text>
                </View>
                <View style={styles.todayTargetItem}>
                  <Text style={styles.todayTargetIcon}>💧</Text>
                  <Text style={styles.todayTargetLabel}>Agua</Text>
                  <Text style={styles.todayTargetValue}>{currentDayData.targets.waterIntakeLiters}L</Text>
                </View>
              </View>

              {/* Macros */}
              {currentDayData.targets.macros && (
                <View style={styles.todayMacrosSection}>
                  <Text style={styles.todayMacrosTitle}>Macronutrientes</Text>
                  <View style={styles.todayMacrosRow}>
                    <View style={styles.todayMacroItem}>
                      <Text style={styles.todayMacroLabel}>Proteína</Text>
                      <Text style={styles.todayMacroValue}>
                        {Math.round(currentDayData.targets.proteinGrams || currentDayData.targets.protein_grams || currentDayData.targets.macros?.proteinGrams || 0)}g
                      </Text>
                    </View>
                    <View style={styles.todayMacroItem}>
                      <Text style={styles.todayMacroLabel}>Carbos</Text>
                      <Text style={styles.todayMacroValue}>
                        {Math.round(currentDayData.targets.carbsGrams || currentDayData.targets.carbs_grams || currentDayData.targets.macros?.carbsGrams || 0)}g
                      </Text>
                    </View>
                    <View style={styles.todayMacroItem}>
                      <Text style={styles.todayMacroLabel}>Grasas</Text>
                      <Text style={styles.todayMacroValue}>
                        {Math.round(currentDayData.targets.fatsGrams || currentDayData.targets.fats_grams || currentDayData.targets.macros?.fatsGrams || 0)}g
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {currentDayData.targets.cardioMinutes > 0 && (
                <View style={styles.todayCardioSection}>
                  <Text style={styles.todayCardioText}>
                    🏃 Cardio: {currentDayData.targets.cardioMinutes} min
                    {currentDayData.targets.saunaSuitRequired && ' 🧥 (con traje sauna)'}
                  </Text>
                </View>
              )}

              <View style={styles.todayRecommendations}>
                <Text style={styles.todayRecommendationsTitle}>Recomendaciones del Día</Text>
                <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.nutritionFocus}</Text>
                <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.hydrationNote}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {dashboardData && !currentDayData && (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Sodio Hoy</Text>
            <Text style={styles.metricValue}>
              {dashboardData.nutritionMetrics.sodium?.hasData
                ? `${dashboardData.nutritionMetrics.sodium.current}mg`
                : '--'}
            </Text>
            <View style={styles.metricStatus}>
              <Text style={styles.metricNote}>
                /{dashboardData.nutritionMetrics.sodium?.limit || 2300}mg límite
              </Text>
            </View>
            {!dashboardData.nutritionMetrics.sodium?.hasData && (
              <Text style={styles.metricPlaceholder}>Sin tracking</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('WaterHistory')}
            activeOpacity={0.7}
          >
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Hidratación</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.metricValue}>
              {dailyWaterIntake > 0 ? `${dailyWaterIntake.toFixed(1)}L` : '--'}
            </Text>
            <View style={styles.metricStatus}>
              <Text style={styles.metricNote}>
                Meta: {dashboardData.nutritionMetrics.hydration?.target || 3.0}L
              </Text>
            </View>
            {dailyWaterIntake === 0 && (
              <Text style={styles.metricPlaceholder}>Sin tracking</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {dashboardData && dashboardData.currentAlert && (
        <View style={[
          styles.alertCard,
          dashboardData.currentAlert.level === 'CRITICAL' && { backgroundColor: '#F44336' },
          dashboardData.currentAlert.level === 'WARNING' && { backgroundColor: '#FF9800' },
          dashboardData.currentAlert.level === 'INFO' && { backgroundColor: '#2196F3' }
        ]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>{dashboardData.currentAlert.icon}</Text>
            <Text style={styles.alertTitle}>{dashboardData.currentAlert.title}</Text>
          </View>
          <Text style={styles.alertText}>{dashboardData.currentAlert.message}</Text>
        </View>
      )}

      <View style={styles.navigationSection}>
        <Text style={styles.sectionTitle}>Acceso Rápido</Text>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('Stats')}
          activeOpacity={0.7}
        >
          <View style={styles.navCardContent}>
            <View style={[styles.navIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="stats-chart" size={28} color="white" />
            </View>
            <View style={styles.navTextContainer}>
              <Text style={styles.navTitle}>Estadísticas</Text>
              <Text style={styles.navDescription}>Visualiza tu progreso</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.secondary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />

      <WaterIntakeModal
        visible={waterModalVisible}
        onClose={() => setWaterModalVisible(false)}
        onSubmit={handleAddWater}
        loading={addingWater}
      />

      <WeightInputModal
        visible={weightModalVisible}
        onClose={() => setWeightModalVisible(false)}
        onSubmit={handleAddWeight}
        loading={savingWeight}
        currentDay={currentDayNumber}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    fontWeight: '500',
  },
  activeWeightCutBar: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  activeWeightCutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeWeightCutLeft: {
    flex: 1,
  },
  activeWeightCutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  activeWeightCutInfo: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  activeWeightCutDays: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activeWeightCutRight: {
    marginLeft: 10,
  },
  activeWeightCutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeWeightCutBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeCard: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  timeLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  timeValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timeSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  phaseCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  phaseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  phaseTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  phaseSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  weightCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  weightInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  weightInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  weightInfoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  weightInfoValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  weightNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  weightSource: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  weightRemaining: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  progressPercent: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 15,
  },
  metricTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  metricValue: {
    color: COLORS.secondary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLimit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 5,
  },
  metricIcon: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricIconWarning: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricNote: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  alertCard: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  alertTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  alertIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  alertText: {
    color: 'white',
    fontSize: 14,
  },
  navigationSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  navCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  navIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  navTextContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  navDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 85,
  },
  actionGreen: {
    backgroundColor: COLORS.secondary,
  },
  actionRed: {
    backgroundColor: '#FF6B6B',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  loadingText: {
    color: COLORS.secondary,
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricPlaceholder: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  timelineNeededCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  timelineNeededIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  timelineNeededTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  timelineNeededText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  timelineNeededSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  timelineNeededButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  timelineNeededButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  todayCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  todayDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 15,
  },
  todayPhaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  todayPhaseText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  todayTargetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 15,
  },
  todayTargetItem: {
    width: '33.33%',
    paddingHorizontal: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  todayTargetIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  todayTargetLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  todayTargetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  todayCardioSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  todayCardioText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayRecommendations: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
  },
  todayRecommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  todayRecommendationText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  reminderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reminderModal: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: '100%',
  },
  reminderIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reminderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  reminderText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  reminderNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 25,
  },
  reminderButtons: {
    gap: 12,
  },
  reminderButtonPrimary: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  reminderButtonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reminderButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  reminderButtonSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Water Progress Card Styles
  waterProgressCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  waterProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  waterProgressInfo: {
    flex: 1,
  },
  waterProgressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  waterProgressValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  waterProgressCurrent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  waterProgressTarget: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  waterProgressButton: {
    marginLeft: 15,
  },
  waterProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waterProgressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },
  waterProgressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    minWidth: 45,
  },
  waterProgressSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    gap: 8,
  },
  waterProgressSuccessText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Collapsible Plan Styles
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayCompactView: {
    marginTop: 8,
  },
  todayTargetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginBottom: 10,
  },
  todayCompactItem: {
    alignItems: 'center',
    flex: 1,
  },
  todayCompactIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  todayCompactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  todayCompactHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  todayExpandedView: {
    marginTop: 8,
  },
  todayMacrosSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  todayMacrosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 12,
  },
  todayMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayMacroItem: {
    alignItems: 'center',
  },
  todayMacroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  todayMacroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  // Hero Metrics Section - F-Pattern Design
  heroMetricsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroMetricsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  heroMetricCard: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 16,
    minHeight: 170,
    maxWidth: '48%',
  },
  heroMetricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroMetricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  heroMetricValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  heroMetricCurrent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  heroMetricUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  heroMetricTarget: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  heroMetricProgress: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  heroMetricProgressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
  heroMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  heroMetricBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
});