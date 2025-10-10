import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
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

        const weightProgress = calculateWeightProgress(
          parseFloat(activePlan.analysis_request?.currentWeightKg),
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
      <View style={styles.header}>
        {refreshing && (
          <View style={styles.loadingHeader}>
            <ActivityIndicator size="small" color={COLORS.secondary} />
            <Text style={styles.loadingText}>Actualizando datos...</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>Dashboard Informativo</Text>
      </View>

      {!loadingWeightCut && activeWeightCut && (
        <TouchableOpacity
          style={[
            styles.activeWeightCutBar,
            { borderLeftColor: getRiskColor(activeWeightCut.analysis_response?.riskAnalysis?.riskCode) }
          ]}
          onPress={() => {
            navigation.navigate('ActivePlanDetails', {
              activePlan: activeWeightCut
            });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.activeWeightCutContent}>
            <View style={styles.activeWeightCutLeft}>
              <Text style={styles.activeWeightCutTitle}>🎯 Plan de Corte Activo</Text>
              <Text style={styles.activeWeightCutInfo}>
                {activeWeightCut.analysis_request?.currentWeightKg} kg → {activeWeightCut.analysis_request?.targetWeightKg} kg
                <Text style={styles.activeWeightCutDays}> ({activeWeightCut.analysis_request?.daysToCut} días)</Text>
              </Text>
            </View>
            <View style={styles.activeWeightCutRight}>
              <View
                style={[
                  styles.activeWeightCutBadge,
                  { backgroundColor: getRiskColor(activeWeightCut.analysis_response?.riskAnalysis?.riskCode) }
                ]}
              >
                <Text style={styles.activeWeightCutBadgeText}>
                  {getRiskLabel(activeWeightCut.analysis_response?.riskAnalysis?.riskCode)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

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

      {dashboardData && !dashboardData.timeRemaining.isExpired && (
        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>TIEMPO RESTANTE</Text>
          <Text style={styles.timeValue}>
            {formatTimeRemaining(dashboardData.timeRemaining.days, dashboardData.timeRemaining.hours)}
          </Text>
          <Text style={styles.timeSubtext}>hasta pesaje oficial</Text>
        </View>
      )}

      {dashboardData && dashboardData.timeRemaining.isExpired && (
        <View style={[styles.timeCard, { backgroundColor: '#9E9E9E' }]}>
          <Text style={styles.timeLabel}>PLAN COMPLETADO</Text>
          <Text style={styles.timeValue}>✓</Text>
          <Text style={styles.timeSubtext}>El plan ha finalizado</Text>
        </View>
      )}



      {dashboardData && (
        <View style={styles.weightCard}>
          <Text style={styles.sectionTitle}>Progreso de Peso Diario</Text>
          <View style={styles.weightInfoRow}>
            <View style={styles.weightInfoItem}>
              <Text style={styles.weightInfoLabel}>Peso Actual</Text>
              <Text style={styles.weightInfoValue}>{dashboardData.weightProgress.startWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.weightInfoItem}>
              <Text style={styles.weightInfoLabel}>Peso Objetivo</Text>
              <Text style={styles.weightInfoValue}>{dashboardData.weightProgress.targetWeight.toFixed(1)} kg</Text>
            </View>
          </View>

          <Text style={styles.weightNote}>
            Actualiza tu peso diariamente para ver tu progreso real
          </Text>
        </View>
      )}

      {currentDayData && (
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>📅 OBJETIVOS DE HOY - Día {currentDayData.day}</Text>
          <Text style={styles.todayDate}>{new Date(currentDayData.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

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

          {currentDayData.targets.cardioMinutes > 0 && (
            <View style={styles.todayCardioSection}>
              <Text style={styles.todayCardioText}>
                🏃 Cardio: {currentDayData.targets.cardioMinutes} min
                {currentDayData.targets.saunaSuitRequired && ' 🧥 (con traje sauna)'}
              </Text>
            </View>
          )}

          <View style={styles.todayRecommendations}>
            <Text style={styles.todayRecommendationsTitle}>Plan del Día</Text>
            <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.nutritionFocus}</Text>
            <Text style={styles.todayRecommendationText}>{currentDayData.recommendations.hydrationNote}</Text>
          </View>
        </View>
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

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Hidratación</Text>
            <Text style={styles.metricValue}>
              {dashboardData.nutritionMetrics.hydration?.hasData
                ? `${dashboardData.nutritionMetrics.hydration.current}L`
                : '--'}
            </Text>
            <View style={styles.metricStatus}>
              <Text style={styles.metricNote}>
                Meta: {dashboardData.nutritionMetrics.hydration?.target || 3.0}L
              </Text>
            </View>
            {!dashboardData.nutritionMetrics.hydration?.hasData && (
              <Text style={styles.metricPlaceholder}>Sin tracking</Text>
            )}
          </View>
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
        <Text style={styles.sectionTitle}>Acceso Rapido</Text>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('NutritionTracking')}
          activeOpacity={0.7}
        >
          <View style={styles.navCardContent}>
            <View style={[styles.navIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="restaurant" size={28} color="white" />
            </View>
            <View style={styles.navTextContainer}>
              <Text style={styles.navTitle}>Seguimiento Nutricional</Text>
              <Text style={styles.navDescription}>Registra tus comidas y macros</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.secondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('Recommendations')}
          activeOpacity={0.7}
        >
          <View style={styles.navCardContent}>
            <View style={[styles.navIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="bulb" size={28} color="white" />
            </View>
            <View style={styles.navTextContainer}>
              <Text style={styles.navTitle}>Recomendaciones</Text>
              <Text style={styles.navDescription}>Consejos personalizados para ti</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.secondary} />
          </View>
        </TouchableOpacity>

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
              <Text style={styles.navTitle}>Estadisticas</Text>
              <Text style={styles.navDescription}>Visualiza tu progreso</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.secondary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Acciones Rapidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.actionGreen]}>
            <Ionicons name="scale" size={24} color="white" />
            <Text style={styles.actionText}>Peso</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionGreen]}>
            <Ionicons name="water" size={24} color="white" />
            <Text style={styles.actionText}>+250ml</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionGreen]}>
            <Ionicons name="restaurant" size={24} color="white" />
            <Text style={styles.actionText}>Comida</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionRed]}>
            <Ionicons name="alert-circle" size={24} color="white" />
            <Text style={styles.actionText}>Urgencia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacing} />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
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
});