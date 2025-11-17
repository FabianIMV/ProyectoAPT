import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { addWaterIntake, getDayProgress, setDailyWeight, readjustTimeline } from '../services/progressService';
import WaterIntakeModal from '../components/WaterIntakeModal';
import WeightInputModal from '../components/WeightInputModal';
import { calculateCurrentDayIndex, calculateCurrentDayNumber } from '../utils/dateUtils';
import { generateTimelineAlerts, filterTopAlerts } from '../services/alertsService';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }) {
  const { userId, user, preloadedData } = useAuth();
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
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]); // Array de todas las recomendaciones
  const [timelineAlerts, setTimelineAlerts] = useState([]); // Alertas automáticas del timeline
  const [dismissedAlerts, setDismissedAlerts] = useState([]); // IDs de alertas cerradas
  const [isReadjustingTimeline, setIsReadjustingTimeline] = useState(false);

  // Cargar alertas cerradas desde AsyncStorage al montar
  useEffect(() => {
    loadDismissedAlerts();
  }, []);

  useEffect(() => {
    if (userId && user) {
      loadDashboardData(false); // false = no es refresh manual
    }
  }, [userId, user]);

  // Efecto para usar datos precargados al montar el componente
  useEffect(() => {
    if (preloadedData && preloadedData.profile) {
      console.log('⚡ Usando datos precargados del AuthContext');
      // Cargar datos instantáneamente desde caché
      setUserProfile(preloadedData.profile);
      setActiveWeightCut(preloadedData.activePlan);
      setActiveTimeline(preloadedData.timeline);
      setLoadingWeightCut(false);
      setLoadingTimeline(false);

      // Si hay timeline, configurar needsTimeline
      if (preloadedData.timeline) {
        setNeedsTimeline(false);
      } else if (preloadedData.activePlan) {
        setNeedsTimeline(true);
      }
    }
  }, [preloadedData]);

  // Listener para recargar cuando vuelve de otras pantallas
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId && user) {
        loadDashboardData(true); // true = recargar desde servidor al volver a la pantalla
      }
    });

    return unsubscribe;
  }, [navigation, userId, user]);

  // Listener para recibir recomendaciones aceptadas desde NutritionFeedback
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // No hacer nada, solo escuchar
    });

    return unsubscribe;
  }, [navigation]);

  // Cargar agua cuando tengamos timelineId y currentDayNumber
  useEffect(() => {
    if (timelineId && currentDayNumber !== null) {
      loadWaterIntake();
    }
  }, [timelineId, currentDayNumber]);

  // Cargar alertas cerradas desde AsyncStorage
  const loadDismissedAlerts = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('@dismissed_alerts');
      if (dismissed) {
        setDismissedAlerts(JSON.parse(dismissed));
      }
    } catch (error) {
      console.log('Error cargando alertas cerradas:', error);
    }
  };

  // Guardar alertas cerradas en AsyncStorage
  const saveDismissedAlerts = async (alertIds) => {
    try {
      await AsyncStorage.setItem('@dismissed_alerts', JSON.stringify(alertIds));
    } catch (error) {
      console.log('Error guardando alertas cerradas:', error);
    }
  };

  // Cerrar una alerta y guardarla
  const handleDismissAlert = (alertId) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    saveDismissedAlerts(newDismissed);
  };

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

  // Función deprecada - ahora se usa calculateCurrentDayIndex desde utils/dateUtils

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

  const loadDashboardData = async (isManualRefresh = false) => {
    setLoadingWeightCut(true);
    setLoadingTimeline(true);

    try {
      let profile, activePlan, timeline;

      // Si tenemos datos precargados y NO es un refresh manual, usarlos instantáneamente
      if (preloadedData && !isManualRefresh) {
        console.log('⚡ Usando datos precargados - carga instantánea');
        profile = preloadedData.profile;
        activePlan = preloadedData.activePlan;
        timeline = preloadedData.timeline;
      } else {
        // Si es refresh manual o no hay datos precargados, hacer fetch
        console.log('🔄 Cargando datos desde servidor...');
        [profile, activePlan, timeline] = await Promise.all([
          loadUserProfile(),
          loadActiveWeightCut(),
          loadActiveTimeline()
        ]);
      }

      setUserProfile(profile);
      setActiveWeightCut(activePlan);
      setActiveTimeline(timeline);

      // Guardar timelineId y calcular día actual
      let calculatedTimelineId = null;
      let calculatedDayNumber = null;

      if (timeline) {
        calculatedTimelineId = timeline.id;
        setTimelineId(calculatedTimelineId);

        const dayIndex = calculateCurrentDayIndex(timeline.start_date, timeline.total_days);
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

            // Buscar TODAS las recomendaciones IA en las notas
            const notes = result.data.notes || result.data.day_notes;
            if (notes) {
              try {
                const lines = typeof notes === 'string' ? notes.split('\n').filter(line => line.trim()) : [];
                const allRecommendations = [];

                // Buscar todas las entradas de recomendaciones IA
                for (let i = lines.length - 1; i >= 0; i--) {
                  const line = lines[i];
                  const match = line.match(/^\[[\d:]+\]\s*(.+)$/);
                  const jsonString = match ? match[1].trim() : line.trim();

                  try {
                    const parsed = JSON.parse(jsonString);
                    if (parsed.type === 'ai_recommendations') {
                      allRecommendations.push(parsed);
                    }
                  } catch (e) {
                    // No es JSON válido, continuar
                  }
                }

                setAiRecommendations(allRecommendations); // Guardar todas
              } catch (error) {
                console.log('Error parseando notas para recomendaciones IA:', error);
              }
            }
          } else if (result.notFound) {
            setDailyWaterIntake(0);
            setDailyProgressData(null);
            setAiRecommendations([]);
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

      // Si hay timeline, asegurar que needsTimeline esté en false
      if (timeline) {
        setNeedsTimeline(false);
      }

      if (activePlan && profile) {
        let currentDayInfo = null;
        let phaseData = null;

        if (timeline && timeline.timeline_data?.days) {
          const dayIndex = calculateCurrentDayIndex(timeline.start_date, timeline.total_days);

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

        // Generar alertas automáticas del timeline
        if (timeline && currentDayInfo && calculatedDayNumber) {
          // Obtener agua actualizada del progreso cargado
          const currentWaterIntake = loadedProgressData?.actualWaterLiters || loadedProgressData?.actual_water_liters || 0;
          
          const alerts = generateTimelineAlerts({
            currentDayNumber: calculatedDayNumber,
            totalDays: timeline.total_days,
            currentWeight: currentWeight,
            targetWeightToday: parseFloat(currentDayInfo.targets.weightKg),
            targetWeightFinal: parseFloat(activePlan.analysis_request?.targetWeightKg),
            startWeight: parseFloat(activePlan.analysis_request?.currentWeightKg),
            actualCalories: loadedProgressData?.actualCalories || loadedProgressData?.actual_calories || 0,
            targetCalories: currentDayInfo.targets.caloriesIntake,
            actualWater: currentWaterIntake,
            targetWater: currentDayInfo.targets.waterIntakeLiters,
            yesterdayWeight: loadedYesterdayProgress?.actualWeightKg || loadedYesterdayProgress?.actual_weight_kg,
            phase: currentDayInfo.phase
          });

          // Filtrar y mostrar solo las 3 alertas más importantes
          const topAlerts = filterTopAlerts(alerts, 3);
          setTimelineAlerts(topAlerts);
        }

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
    await loadDashboardData(true); // true = refresh manual, forzar recarga desde servidor
    setRefreshing(false);
  };

  const handleGenerateTimeline = async () => {
    if (!userId || !activeWeightCut) {
      Alert.alert('Error', 'No se encontró un plan activo');
      return;
    }

    const daysToCut = activeWeightCut.analysis_request?.daysToCut || 7;
    const estimatedSeconds = Math.max(90, daysToCut * 15);

    Alert.alert(
      'Generar Timeline',
      `Se generará tu plan diario personalizado de ${daysToCut} días.\n\n⏱️ Tiempo estimado: ${estimatedSeconds}s\n\n¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          onPress: () => executeGenerateTimeline()
        }
      ]
    );
  };

  const executeGenerateTimeline = async () => {
    setIsGeneratingTimeline(true);

    try {
      const timelinePayload = {
        userId: userId
      };

      // Agregar startDate si existe en el plan
      if (activeWeightCut.analysis_request?.startDate) {
        timelinePayload.startDate = activeWeightCut.analysis_request.startDate;
      }

      // NO enviar weighInTime ni timezone - el backend lo obtiene del plan guardado
      // Esto evita el timeout cuando el backend intenta generar día parcial

      console.log('📅 Generando timeline para plan existente:', timelinePayload);

      const response = await fetch(WEIGHT_CUT_API.activateTimeline, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timelinePayload),
      });

      // Verificar si la respuesta es JSON válida
      const contentType = response.headers.get('content-type');
      let result;

      // Manejar error 502 específicamente
      if (response.status === 502) {
        const textResponse = await response.text();
        console.error('Timeline Lambda timeout/error (502):', textResponse);
        throw new Error('El servidor tardó demasiado en generar el timeline.\n\nPuedes intentar:\n1. Usar gemini-2.5-flash-latest en lugar de pro\n2. Crear un plan con menos días\n3. Contactar soporte técnico');
      }

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Si no es JSON, leer como texto para debuggear
        const text = await response.text();
        console.error('❌ Respuesta no es JSON:', text);
        throw new Error('El servidor no devolvió una respuesta JSON válida. Verifica que el endpoint esté correcto.');
      }

      if (response.ok && result.success) {
        console.log('✅ Timeline generado exitosamente');

        let message = 'Tu timeline diario ha sido generado exitosamente.';

        if (result.warning) {
          message += `\n\n⚠️ ${result.warning}`;
        }

        if (result.adjustedDays && activeWeightCut.analysis_request?.daysToCut) {
          const originalDays = activeWeightCut.analysis_request.daysToCut;
          if (result.adjustedDays !== originalDays) {
            message += `\n\n📊 Plan ajustado a ${result.adjustedDays} días (original: ${originalDays} días).`;
          }
        }

        Alert.alert(
          '✅ Timeline Generado',
          message,
          [
            {
              text: 'Ver Dashboard',
              onPress: () => loadDashboardData()
            }
          ]
        );
      } else if (response.status === 404) {
        Alert.alert(
          'Error',
          'No se encontró el plan guardado. Por favor crea un nuevo plan.'
        );
      } else {
        throw new Error(result.message || 'Error al generar timeline');
      }
    } catch (error) {
      console.error('❌ Error generando timeline:', error);
      Alert.alert(
        'Error',
        'No se pudo generar el timeline. Por favor intenta nuevamente o crea un nuevo plan.'
      );
    } finally {
      setIsGeneratingTimeline(false);
    }
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

  const handleReadjustTimeline = async () => {
    if (!userId || !timelineId || !currentDayNumber || !activeTimeline) {
      Alert.alert('Error', 'No se encontró información del timeline activo');
      return;
    }

    // Validación: No se puede reajustar si estamos en el último día
    if (currentDayNumber >= activeTimeline.total_days) {
      Alert.alert(
        'No se puede reajustar',
        'No puedes reajustar el timeline desde el último día. El plan está por finalizar.'
      );
      return;
    }

    // Calcular qué días se verán afectados
    const lastCompletedDay = currentDayNumber - 1; // El día anterior al actual
    const firstDayAffected = currentDayNumber;
    const lastDayAffected = activeTimeline.total_days;
    const affectedDaysCount = lastDayAffected - firstDayAffected + 1;

    // Obtener peso actual para mostrarlo en el diálogo
    let currentWeight;
    if (currentDayNumber === 1) {
      currentWeight = dailyProgressData?.actualWeightKg || dailyProgressData?.actual_weight_kg;
    } else {
      currentWeight = yesterdayProgressData?.actualWeightKg || yesterdayProgressData?.actual_weight_kg;
    }

    const weightText = currentWeight
      ? `\n\n📊 Peso actual: ${currentWeight.toFixed(1)}kg`
      : '\n\n⚠️ No tienes peso registrado. Se usará el último peso disponible.';

    // Mostrar confirmación detallada
    Alert.alert(
      '🔄 Reajustar Timeline',
      `Esta acción regenerará tu plan desde el día ${firstDayAffected} hasta el día ${lastDayAffected} (${affectedDaysCount} días) basándose en tu progreso real hasta ahora.${weightText}\n\n⏱️ Tiempo estimado: ${Math.max(60, affectedDaysCount * 10)}s\n\n¿Deseas continuar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Reajustar Plan',
          style: 'default',
          onPress: () => executeReadjustTimeline(lastCompletedDay, currentWeight)
        }
      ]
    );
  };

  const executeReadjustTimeline = async (lastCompletedDay, currentWeight) => {
    setIsReadjustingTimeline(true);

    try {
      console.log('🔄 Iniciando reajuste de timeline...', {
        userId,
        timelineId,
        lastCompletedDay,
        currentWeight
      });

      const result = await readjustTimeline(
        userId,
        lastCompletedDay,
        currentWeight,
        timelineId,
        'Usuario solicitó reajuste desde DashboardScreen'
      );

      if (result.success) {
        const data = result.data;

        // Construir mensaje de éxito con detalles
        let successMessage = `✅ Timeline reajustado exitosamente\n\n`;
        successMessage += `📅 Días reajustados: ${data.firstDayReadjusted} al ${data.lastDayReadjusted} (${data.affectedDays} días)\n`;
        successMessage += `⚖️ Peso actual: ${data.currentWeight.toFixed(1)}kg\n`;
        successMessage += `🎯 Peso objetivo: ${data.targetWeight.toFixed(1)}kg\n`;
        successMessage += `📉 Por perder: ${data.remainingWeightToCut.toFixed(1)}kg`;

        // Mostrar razonamiento de IA si está disponible
        if (data.adjustmentReasoning) {
          successMessage += `\n\n🤖 Análisis IA:\n${data.adjustmentReasoning.substring(0, 200)}${data.adjustmentReasoning.length > 200 ? '...' : ''}`;
        }

        Alert.alert(
          '✅ Reajuste Exitoso',
          successMessage,
          [
            {
              text: 'Ver Timeline Actualizado',
              onPress: async () => {
                // Recargar datos del dashboard para reflejar cambios
                await loadDashboardData(true);
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Error desconocido al reajustar timeline');
      }
    } catch (error) {
      console.error('❌ Error reajustando timeline:', error);

      let errorMessage = 'No se pudo reajustar el timeline.';

      if (error.message.includes('Timeline no encontrado')) {
        errorMessage = 'No se encontró el timeline activo. Por favor recarga la app.';
      } else if (error.message.includes('Parámetros inválidos')) {
        errorMessage = 'Los parámetros del reajuste son inválidos. Verifica tu progreso.';
      } else if (error.message.includes('cannot be the last day')) {
        errorMessage = 'No puedes reajustar desde el último día del plan.';
      } else {
        errorMessage += `\n\n${error.message}`;
      }

      Alert.alert('Error al Reajustar', errorMessage);
    } finally {
      setIsReadjustingTimeline(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
            {(() => {
              // Parsear fecha explícitamente en hora local para evitar problemas de timezone
              const dateParts = currentDayData.date.split(/[-T]/);
              const localDate = new Date(
                parseInt(dateParts[0]),      // year
                parseInt(dateParts[1]) - 1,  // month (0-indexed)
                parseInt(dateParts[2])       // day
              );
              return localDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            })()}
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

      {/* Timeline needed - Generar timeline del plan existente */}
      {!loadingWeightCut && !loadingTimeline && needsTimeline && activeWeightCut && (
        <View style={styles.timelineNeededCard}>
          <Text style={styles.timelineNeededIcon}>⚠️</Text>
          <Text style={styles.timelineNeededTitle}>Plan Incompleto</Text>
          <Text style={styles.timelineNeededText}>
            Este plan no tiene un timeline diario asociado.
          </Text>
          <Text style={styles.timelineNeededSubtext}>
            Puedes generar el timeline para este plan o crear uno nuevo desde la calculadora.
          </Text>
          <TouchableOpacity
            style={[styles.timelineNeededButton, isGeneratingTimeline && styles.disabledButton]}
            onPress={handleGenerateTimeline}
            disabled={isGeneratingTimeline}
          >
            {isGeneratingTimeline ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.timelineNeededButtonText}>Generar Timeline</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timelineSecondaryButton}
            onPress={() => navigation.navigate('WeightCutCalculator')}
          >
            <Text style={styles.timelineSecondaryButtonText}>Crear Nuevo Plan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline futuro - El plan aún no ha comenzado */}
      {activeTimeline && !currentDayData && !needsTimeline && !loadingTimeline && (
        <View style={styles.timelineNeededCard}>
          <Text style={styles.timelineNeededIcon}>📅</Text>
          <Text style={styles.timelineNeededTitle}>Plan Programado</Text>
          <Text style={styles.timelineNeededText}>
            Tu plan de corte está programado para comenzar el{' '}
            {(() => {
              const startDate = new Date(activeTimeline.start_date);
              return startDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
            })()}
          </Text>
          <Text style={styles.timelineNeededSubtext}>
            El plan tiene {activeTimeline.total_days} días de duración. Las métricas y seguimiento estarán disponibles cuando comience tu plan.
          </Text>
          <TouchableOpacity
            style={styles.timelineSecondaryButton}
            onPress={() => navigation.navigate('WeightCutCalculator')}
          >
            <Text style={styles.timelineSecondaryButtonText}>Crear Nuevo Plan para Hoy</Text>
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

      {/* === ADVERTENCIA DEL DÍA - Colapsable === */}
      {dashboardData && dashboardData.currentAlert && (
        <TouchableOpacity
          style={[
            styles.unifiedCard,
            { borderLeftColor: 
              dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
              dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
            }
          ]}
          onPress={() => setIsAlertExpanded(!isAlertExpanded)}
          activeOpacity={0.8}
        >
          {/* Header siempre visible */}
          <View style={styles.unifiedCardHeader}>
            <View style={styles.unifiedHeaderLeft}>
              <Text style={styles.unifiedIcon}>{dashboardData.currentAlert.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.unifiedTitle}>{dashboardData.currentAlert.title}</Text>
              </View>
            </View>
            <Ionicons
              name={isAlertExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color={COLORS.secondary}
            />
          </View>

          {/* Vista compacta - Badge de nivel */}
          {!isAlertExpanded && (
            <View style={styles.unifiedCompactView}>
              <View style={[
                styles.unifiedBadge,
                { 
                  backgroundColor: (
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                  ) + '20',
                  borderColor: 
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                }
              ]}>
                <Text style={[
                  styles.unifiedBadgeText,
                  { color: 
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                  }
                ]}>
                  {dashboardData.currentAlert.level}
                </Text>
              </View>
              <Text style={styles.unifiedCompactHint}>Toca para ver detalles</Text>
            </View>
          )}

          {/* Vista expandida - Mensaje completo formateado */}
          {isAlertExpanded && (
            <View style={styles.unifiedExpandedView}>
              {/* Badge de nivel */}
              <View style={[
                styles.unifiedBadge,
                { 
                  backgroundColor: (
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                  ) + '20',
                  borderColor: 
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                }
              ]}>
                <Text style={[
                  styles.unifiedBadgeText,
                  { color: 
                    dashboardData.currentAlert.level === 'CRITICAL' ? '#F44336' :
                    dashboardData.currentAlert.level === 'WARNING' ? '#FF9800' : '#2196F3'
                  }
                ]}>
                  {dashboardData.currentAlert.level}
                </Text>
              </View>

              {/* Mensaje con formateo mejorado y estilizado */}
              <View style={styles.unifiedContentBox}>
                {(() => {
                  let text = dashboardData.currentAlert.message;
                  
                  // Lista de palabras clave que son títulos
                  const keywords = [
                    'PESAJE OFICIAL',
                    'CORTE DE AGUA',
                    'IR AL BAÑO',
                    'ROPA LIGERA',
                    'PESAJE DE VERIFICACIÓN',
                    'DESPERTAR',
                    'EVITAR',
                    'HIDRATACIÓN',
                    'CALORÍAS'
                  ];
                  
                  // Separar el texto en partes basándose en las palabras clave
                  const parts = [];
                  let currentText = text;
                  
                  // Procesar el texto palabra clave por palabra clave
                  keywords.forEach(keyword => {
                    if (currentText.includes(keyword)) {
                      const regex = new RegExp(`(${keyword}):?\\s*`, 'g');
                      const splits = currentText.split(regex);
                      
                      splits.forEach((part, idx) => {
                        if (part === keyword) {
                          parts.push({ type: 'title', text: keyword });
                        } else if (part && part.trim()) {
                          // Buscar el siguiente keyword para saber dónde termina este
                          let endText = part;
                          const nextKeywordIndex = keywords.findIndex(kw => 
                            part.includes(kw) && kw !== keyword
                          );
                          
                          if (nextKeywordIndex > -1) {
                            const nextKeyword = keywords[nextKeywordIndex];
                            const splitAgain = part.split(nextKeyword);
                            endText = splitAgain[0];
                            // Reconstruir el resto
                            if (splitAgain.length > 1) {
                              currentText = nextKeyword + splitAgain.slice(1).join(nextKeyword);
                            }
                          }
                          
                          if (endText.trim()) {
                            parts.push({ type: 'desc', text: endText.trim() });
                          }
                        }
                      });
                      
                      currentText = currentText.replace(regex, '');
                    }
                  });
                  
                  // Renderizar las partes procesadas
                  let renders = [];
                  for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    
                    if (part.type === 'title') {
                      // Buscar si la descripción está en la siguiente parte
                      const nextPart = parts[i + 1];
                      const hasDesc = nextPart && nextPart.type === 'desc';
                      
                      // Limpiar emojis de la descripción
                      const cleanDesc = hasDesc 
                        ? nextPart.text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
                        : '';
                      
                      renders.push(
                        <View key={i} style={styles.alertSectionBlock}>
                          <Text style={styles.alertTitleText}>{part.text}</Text>
                          {hasDesc && cleanDesc && (
                            <Text style={styles.alertDescriptionText}>{cleanDesc}</Text>
                          )}
                        </View>
                      );
                      
                      if (hasDesc) i++; // Saltar la descripción ya que la procesamos
                    }
                  }
                  
                  // Si no se procesó nada, mostrar el texto original
                  if (renders.length === 0) {
                    renders.push(
                      <Text key="original" style={styles.unifiedText}>{text}</Text>
                    );
                  }
                  
                  return renders;
                })()}
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* === ALERTAS AUTOMÁTICAS DEL TIMELINE === */}
      {timelineAlerts.filter(alert => !dismissedAlerts.includes(alert.id)).length > 0 && (
        <View style={styles.alertsSection}>
          {timelineAlerts
            .filter(alert => !dismissedAlerts.includes(alert.id))
            .map((alert) => (
              <View 
                key={alert.id}
                style={[styles.unifiedCard, { borderLeftColor: alert.color }]}
              >
                <TouchableOpacity
                  style={styles.alertCloseButton}
                  onPress={() => handleDismissAlert(alert.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                
                <View style={styles.unifiedCardHeader}>
                  <View style={styles.unifiedHeaderLeft}>
                    <Text style={styles.unifiedIcon}>{alert.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.unifiedTitle}>{alert.title}</Text>
                    </View>
                  </View>
                  <View style={[styles.unifiedBadge, { backgroundColor: alert.color + '20', borderColor: alert.color }]}>
                    <Text style={[styles.unifiedBadgeText, { color: alert.color }]}>
                      {alert.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                {/* Mensaje formateado con mejor estructura */}
                <View style={styles.unifiedContentBox}>
                  <Text style={styles.unifiedText}>
                    {alert.message.split('\n').map((line, idx) => {
                      // Detectar si la línea tiene un título (termina con :)
                      const isTitle = line.trim().endsWith(':');
                      // Detectar si es un punto de lista (empieza con - o •)
                      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
                      
                      return (
                        <Text key={idx}>
                          {isTitle ? (
                            <Text style={styles.unifiedKeyword}>{line}{'\n'}</Text>
                          ) : isBullet ? (
                            <Text>  {line}{'\n'}</Text>
                          ) : (
                            <Text>{line}{idx < alert.message.split('\n').length - 1 ? '\n' : ''}</Text>
                          )}
                        </Text>
                      );
                    })}
                  </Text>
                </View>
                
                {alert.action && (
                  <View style={styles.alertActionContainer}>
                    <Ionicons name="arrow-forward-circle" size={18} color={alert.color} />
                    <Text style={[styles.alertAction, { color: alert.color }]}>
                      {alert.action}
                    </Text>
                  </View>
                )}
              </View>
            ))}
        </View>
      )}

      {/* 2. PLAN DEL DÍA - Colapsable */}
      {currentDayData && (
        <>
        <TouchableOpacity
          style={[styles.unifiedCard, { borderLeftColor: COLORS.secondary }]}
          onPress={() => setIsPlanExpanded(!isPlanExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.unifiedCardHeader}>
            <View style={styles.unifiedHeaderLeft}>
              <Text style={styles.unifiedIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.unifiedTitle}>Plan del Día {currentDayData.day}</Text>
              </View>
            </View>
            <Ionicons
              name={isPlanExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color={COLORS.secondary}
            />
          </View>

          {/* Vista compacta - siempre visible */}
          {!isPlanExpanded && (
            <View style={styles.unifiedCompactView}>
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
              <Text style={styles.unifiedCompactHint}>Toca para ver detalles</Text>
            </View>
          )}

          {/* Vista expandida */}
          {isPlanExpanded && (
            <View style={styles.unifiedExpandedView}>
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
             

              {currentDayData.targets.cardioMinutes > 0 && (
                <View style={styles.todayCardioSection}>
                  <Text style={styles.todayCardioText}>
                    🏃 Cardio: {currentDayData.targets.cardioMinutes} min
                    {currentDayData.targets.saunaSuitRequired && ' 🧥 (con traje sauna)'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Recomendaciones FUERA del TouchableOpacity para permitir scroll */}
        {isPlanExpanded && currentDayData && (
          <View style={[styles.todayCard, { marginTop: 10 }]}>
            <Text style={styles.todayRecommendationsTitle}>Recomendaciones del Día</Text>

            {/* Carousel de recomendaciones */}
            <Text style={styles.carouselHint}>Desliza para ver más</Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.recommendationsCarousel}
              contentContainerStyle={styles.carouselContent}
              decelerationRate="fast"
              snapToInterval={Dimensions.get('window').width - 60}
              snapToAlignment="center"
            >
              {/* Recomendaciones IA (PRIMERO - todas las que existen) */}
              {aiRecommendations && aiRecommendations.length > 0 && aiRecommendations.map((recommendation, idx) => {
                const severity = recommendation.severity || 'normal';
                const severityIcon = severity === 'danger' ? '⚠️' : severity === 'warning' ? '⚡' : '✓';
                const severityColor = severity === 'danger' ? '#ff4444' : severity === 'warning' ? '#ffaa00' : '#4CAF50';

                return (
                  <View key={idx} style={styles.carouselCard}>
                    <View style={styles.aiRecommendationsBadge}>
                      <View style={styles.aiRecommendationsHeader}>
                        <Text style={{ fontSize: 18, marginRight: 5 }}>{severityIcon}</Text>
                        <Text style={styles.aiRecommendationsLabel}>Recomendaciones IA {aiRecommendations.length > 1 ? `(${idx + 1}/${aiRecommendations.length})` : ''}</Text>
                      </View>
                      <Text style={styles.aiRecommendationsTimestamp}>
                        {new Date(recommendation.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[styles.todayRecommendationText, { color: severityColor, fontWeight: '600', marginBottom: 10 }]}>
                        {recommendation.status}
                      </Text>
                      <Text style={styles.todayRecommendationText}>{recommendation.message}</Text>
                      {recommendation.actions && recommendation.actions.slice(0, 3).map((action, index) => {
                        const hasGoodWord = /bien|excelente|perfecto|correcto|óptimo|bueno/i.test(action);
                        const hasBadWord = /crítico|urgente|inmediatamente|peligro|inaceptable|bajo|mal/i.test(action);
                        const actionColor = hasGoodWord ? '#4CAF50' : hasBadWord ? '#ff4444' : COLORS.text;

                        return (
                          <Text key={index} style={[styles.aiActionItem, { color: actionColor }]}>
                            {hasBadWord ? '⚠️ ' : hasGoodWord ? '✓ ' : '• '}{action}
                          </Text>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Recomendaciones del Plan (SEGUNDO) */}
              <View style={styles.carouselCard}>
                <View style={styles.timelineRecommendationsCard}>
                  <View style={styles.timelineRecommendationsHeader}>
                    <Ionicons name="calendar" size={18} color={COLORS.text} />
                    <Text style={styles.timelineRecommendationsLabel}>Recomendaciones del Plan</Text>
                  </View>
                  <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.nutritionFocus}</Text>
                  <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.hydrationNote}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
        </>
      )}

      {/* Timeline expirado - El plan ya finalizó */}
      {activeTimeline && dashboardData && dashboardData.timeRemaining?.isExpired && (
        <View style={styles.timelineNeededCard}>
          <Text style={styles.timelineNeededIcon}>🏁</Text>
          <Text style={styles.timelineNeededTitle}>Plan Finalizado</Text>
          <Text style={styles.timelineNeededText}>
            Tu plan de corte ha finalizado. ¡Felicidades por completarlo!
          </Text>
          <Text style={styles.timelineNeededSubtext}>
            Puedes ver tus estadísticas finales o crear un nuevo plan si lo necesitas.
          </Text>
          <TouchableOpacity
            style={[styles.timelineNeededButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => navigation.navigate('Stats')}
          >
            <Text style={styles.timelineNeededButtonText}>Ver Estadísticas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timelineSecondaryButton}
            onPress={() => navigation.navigate('WeightCutCalculator')}
          >
            <Text style={styles.timelineSecondaryButtonText}>Crear Nuevo Plan</Text>
          </TouchableOpacity>
        </View>
      )}

      {dashboardData && !currentDayData && !dashboardData.timeRemaining?.isExpired && !activeTimeline && (
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

      {/* Botón de Reajustar Timeline - Solo visible si hay timeline activo y no es el último día */}
      <View style={styles.navigationSection}>
        {activeTimeline && currentDayNumber && currentDayNumber < activeTimeline.total_days && (
          <TouchableOpacity
            style={[styles.navCard, isReadjustingTimeline && styles.navCardDisabled]}
            onPress={handleReadjustTimeline}
            activeOpacity={0.7}
            disabled={isReadjustingTimeline}
          >
            <View style={styles.navCardContent}>
              <View style={[styles.navIcon, { backgroundColor: '#FF9800' }]}>
                {isReadjustingTimeline ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="refresh-circle" size={28} color="white" />
                )}
              </View>
              <View style={styles.navTextContainer}>
                <Text style={styles.navTitle}>Reajustar Timeline</Text>
                <Text style={styles.navDescription}>
                  {isReadjustingTimeline
                    ? 'Reajustando plan con IA...'
                    : 'Adapta tu plan al progreso real'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.secondary} />
            </View>
          </TouchableOpacity>
        )}
      </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Botón Flotante de Recomendaciones IA */}
      {currentDayData && timelineId && currentDayNumber && (
        <TouchableOpacity
          style={[
            styles.aiFloatingButton,
            (!dailyProgressData?.actualCalories && !dailyProgressData?.actual_calories) && styles.aiFloatingButtonDisabled
          ]}
          onPress={() => {
            // Validar que haya datos nutricionales ingresados
            const hasCalories = dailyProgressData?.actualCalories || dailyProgressData?.actual_calories;

            if (!hasCalories || hasCalories === 0) {
              Alert.alert(
                'Sin Datos Nutricionales',
                'Debes registrar al menos una comida en "Seguimiento Nutricional" antes de obtener feedback de IA sobre tu progreso del día.',
                [{ text: 'Entendido' }]
              );
              return;
            }

            navigation.navigate('NutritionFeedback', {
              timelineId: timelineId,
              dayNumber: currentDayNumber,
              onAccept: (recommendations) => {
                const newRecommendation = {
                  ...recommendations,
                  timestamp: new Date().toISOString()
                };
                // Agregar al inicio del array (más reciente primero)
                setAiRecommendations(prev => [newRecommendation, ...prev]);
              }
            });
          }}
          activeOpacity={0.8}
          disabled={!dailyProgressData?.actualCalories && !dailyProgressData?.actual_calories}
        >
          <Ionicons name="bulb" size={28} color="#fff" />
        </TouchableOpacity>
      )}

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
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  // ===== ESTILOS UNIFICADOS PARA TODAS LAS TARJETAS =====
  unifiedCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  unifiedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unifiedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  unifiedIcon: {
    fontSize: 28,
  },
  unifiedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 24,
  },
  unifiedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  unifiedBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  unifiedCompactView: {
    marginTop: 12,
  },
  unifiedCompactHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  unifiedExpandedView: {
    marginTop: 16,
  },
  unifiedContentBox: {
    backgroundColor: COLORS.primary + '40',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  unifiedText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  unifiedKeyword: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.secondary,
  },
  alertKeywordSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary + '15',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  alertKeywordIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  alertKeywordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  alertSectionBlock: {
    marginBottom: 16,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertEmojiIcon: {
    fontSize: 20,
    marginRight: 10,
    lineHeight: 24,
  },
  alertTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  alertDescriptionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    paddingLeft: 4,
  },
  alertFormattedLine: {
    marginVertical: 6,
    paddingLeft: 4,
  },
  alertFormattedLineWithEmoji: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
    paddingLeft: 4,
  },
  alertEmojiLeft: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  alertKeywordInline: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.secondary,
  },
  alertEmoji: {
    fontSize: 16,
  },
  alertTextLine: {
    marginVertical: 6,
    paddingLeft: 4,
  },
  alertInlineIcon: {
    fontSize: 14,
  },
  alertTimeText: {
    fontWeight: '600',
    color: COLORS.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 32 : 20,
    paddingBottom: 12,
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
  // OLD ALERT STYLES (deprecated - keeping for backwards compatibility)
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
  // NEW DAILY ALERT STYLES
  dailyAlertSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  dailyAlertHeader: {
    marginBottom: 16,
  },
  dailyAlertHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  dailyAlertHeaderSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  dailyAlertCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    position: 'relative',
  },
  dailyAlertBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dailyAlertBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dailyAlertContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 80,
  },
  dailyAlertIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  dailyAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 24,
    flex: 1,
  },
  dailyAlertMessageContainer: {
    backgroundColor: COLORS.primary + '40',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  dailyAlertMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  dailyAlertTitleWrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  dailyAlertMessageTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.secondary,
    lineHeight: 24,
  },
  dailyAlertBulletWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 8,
  },
  dailyAlertBulletPoint: {
    fontSize: 16,
    color: COLORS.secondary,
    marginRight: 8,
    marginTop: 2,
    fontWeight: 'bold',
  },
  dailyAlertMessageBullet: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  dailyAlertLabelWrapper: {
    marginVertical: 6,
  },
  dailyAlertLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: COLORS.secondary,
  },
  dailyAlertKeywordWrapper: {
    marginVertical: 8,
    paddingVertical: 4,
  },
  dailyAlertKeyword: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.secondary,
  },
  dailyAlertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyAlertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dailyAlertHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dailyAlertCompactView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dailyAlertCompactHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  dailyAlertExpandedView: {
    marginTop: 12,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyAlertTextWrapper: {
    marginVertical: 4,
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
  navCardDisabled: {
    opacity: 0.6,
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
    height: Platform.OS === 'ios' ? 40 : 30,
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
    marginBottom: 12,
  },
  timelineNeededButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timelineSecondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  timelineSecondaryButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  todayCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
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
  // Carousel de recomendaciones
  carouselHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  recommendationsCarousel: {
    marginTop: 10,
    marginHorizontal: -20, // Compensar padding del contenedor padre
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  carouselCard: {
    width: Dimensions.get('window').width - 80, // Ajustado para márgenes
    marginHorizontal: 10,
  },
  // Recomendaciones IA Badge
  aiRecommendationsBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 18, // Más padding
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    minHeight: 200,
  },
  aiRecommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiRecommendationsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  aiRecommendationsTimestamp: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  aiActionItem: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 5,
    marginBottom: 8,
    lineHeight: 20,
  },
  // Recomendaciones del timeline
  timelineRecommendationsCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.text,
    minHeight: 200,
  },
  timelineRecommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timelineRecommendations: {
    marginTop: 0,
  },
  timelineRecommendationsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  singleRecommendation: {
    marginTop: 10,
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
  aiButtonIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  aiButtonText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  // Botón flotante de IA
  // Alertas del Timeline
  alertsSection: {
    marginBottom: 10,
  },
  alertsSectionHeader: {
    marginBottom: 16,
  },
  alertsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  alertsSectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  alertCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
  },
  alertCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '80',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 30,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  alertTitleContainer: {
    flex: 1,
    gap: 8,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  alertTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  alertTypeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  alertMessageContainer: {
    backgroundColor: COLORS.primary + '40',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  alertMessageTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.secondary,
    marginTop: 8,
  },
  alertMessageBullet: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginLeft: 8,
  },
  alertActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '60',
    padding: 10,
    borderRadius: 10,
  },
  alertAction: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  aiFloatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#9C27B0',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiFloatingButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
});