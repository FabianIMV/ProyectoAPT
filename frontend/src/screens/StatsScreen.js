import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';
import { calculateRealStats, getComplianceLevel } from '../services/statsService';
import { calculateCurrentDayNumber } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

export default function StatsScreen({ navigation }) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [realStats, setRealStats] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [activeWeightCut, setActiveWeightCut] = useState(null);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Cargar timeline activo
      const timelineResponse = await fetch(WEIGHT_CUT_API.getTimeline(userId));
      if (!timelineResponse.ok) {
        setLoading(false);
        return;
      }

      const timelineResult = await timelineResponse.json();
      if (!timelineResult.success || !timelineResult.data) {
        setLoading(false);
        return;
      }

      const timelineData = timelineResult.data;
      setTimeline(timelineData);

      // Cargar plan activo
      const planResponse = await fetch(WEIGHT_CUT_API.getUserPlans(userId));
      if (planResponse.ok) {
        const planData = await planResponse.json();
        const activePlan = planData.data?.find(wc => wc.is_active);
        setActiveWeightCut(activePlan);

        // Calcular día actual
        const currentDay = calculateCurrentDayNumber(timelineData.start_date, timelineData.total_days);

        if (currentDay && currentDay > 1 && activePlan) {
          // Calcular estadísticas reales
          const stats = await calculateRealStats(
            userId,
            timelineData.id,
            currentDay,
            timelineData,
            activePlan
          );
          setRealStats(stats);
        }
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner 
        message="Cargando estadísticas..."
        size="large"
        showTitle={false}
      />
    );
  }

  if (!realStats) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={80} color={COLORS.secondary} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyTitle}>Sin Estadísticas</Text>
          <Text style={styles.emptyText}>
            Necesitas registrar al menos 2 días de progreso para ver tus estadísticas.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyButtonText}>Ir al Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const complianceLevel = getComplianceLevel(realStats.overallCompliance);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 20 }}>

      {/* Plan Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: realStats.planStatusColor + '20', borderColor: realStats.planStatusColor }]}>
        <Ionicons 
          name={realStats.isAheadOfSchedule ? "trending-down" : realStats.planStatus === 'on_track' ? "checkmark-circle" : "warning"} 
          size={32} 
          color={realStats.planStatusColor} 
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.statusTitle, { color: realStats.planStatusColor }]}>
            {realStats.planStatus === 'ahead' ? '¡Excelente Progreso!' : 
             realStats.planStatus === 'on_track' ? 'En el Plan' : 
             realStats.planStatus === 'behind' ? 'Ajusta tu Ritmo' : 'Atención Requerida'}
          </Text>
          <Text style={styles.statusMessage}>{realStats.planStatusMessage}</Text>
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitle}>Resumen General</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="trending-down" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{realStats.currentWeight} kg</Text>
            <Text style={styles.statLabel}>Peso Actual</Text>
            <View style={styles.changeContainer}>
              <Ionicons name="arrow-down" size={14} color="#4CAF50" />
              <Text style={styles.changePositive}>{realStats.weightLost} kg perdidos</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="flame" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{realStats.avgCalories}</Text>
            <Text style={styles.statLabel}>Calorías Promedio</Text>
            <View style={styles.changeContainer}>
              <Ionicons name="trending-up" size={14} color={getComplianceLevel(realStats.caloriesCompliance).color} />
              <Text style={[styles.changePositive, { color: getComplianceLevel(realStats.caloriesCompliance).color }]}>
                {realStats.caloriesCompliance}% cumplimiento
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="water" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{realStats.avgWater} L</Text>
            <Text style={styles.statLabel}>Hidratación Promedio</Text>
            <View style={styles.changeContainer}>
              <Ionicons name="trending-up" size={14} color={getComplianceLevel(realStats.waterCompliance).color} />
              <Text style={[styles.changePositive, { color: getComplianceLevel(realStats.waterCompliance).color }]}>
                {realStats.waterCompliance}% cumplimiento
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: complianceLevel.color }]}>
              <Ionicons name="checkmark-circle" size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{realStats.overallCompliance}%</Text>
            <Text style={styles.statLabel}>Cumplimiento General</Text>
            <View style={styles.changeContainer}>
              <Ionicons name="checkmark" size={14} color={complianceLevel.color} />
              <Text style={[styles.changePositive, { color: complianceLevel.color }]}>
                {complianceLevel.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Detalles del Progreso</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Peso Inicial</Text>
            <Text style={styles.detailValue}>{realStats.startWeight} kg</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Peso Actual</Text>
            <Text style={[styles.detailValue, { color: COLORS.secondary }]}>{realStats.currentWeight} kg</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Peso Meta</Text>
            <Text style={styles.detailValue}>{realStats.targetWeight} kg</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Perdido</Text>
            <Text style={[styles.detailValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
              {realStats.weightLost} kg
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Por Perder</Text>
            <Text style={styles.detailValue}>{realStats.weightRemaining} kg</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Progreso</Text>
            <View style={styles.detailProgress}>
              <View style={styles.detailProgressBar}>
                <View style={[
                  styles.detailProgressFill,
                  { width: `${Math.min(100, realStats.weightProgress)}%` }
                ]} />
              </View>
              <Text style={styles.detailProgressText}>{realStats.weightProgress}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Días Completados</Text>
            <Text style={styles.detailValue}>{realStats.daysCompleted} días</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Días Restantes</Text>
            <Text style={styles.detailValue}>{realStats.daysRemaining} días</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Racha Actual</Text>
            <Text style={[styles.detailValue, { color: '#FF5722' }]}>
              🔥 {realStats.currentStreak} días
            </Text>
          </View>
        </View>
      </View>

      {/* Nutrition Averages */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Promedios Nutricionales</Text>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementIcon, { backgroundColor: '#FF9800' }]}>
            <Ionicons name="flame" size={28} color="white" />
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>{realStats.avgCalories} calorías/día</Text>
            <Text style={styles.achievementDescription}>
              Meta promedio: {realStats.avgCaloriesTarget} cal ({realStats.caloriesCompliance}% cumplimiento)
            </Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementIcon, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="water" size={28} color="white" />
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>{realStats.avgWater}L agua/día</Text>
            <Text style={styles.achievementDescription}>
              Meta promedio: {realStats.avgWaterTarget}L ({realStats.waterCompliance}% cumplimiento)
            </Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementIcon, { backgroundColor: realStats.planStatusColor }]}>
            <Ionicons 
              name={realStats.isAheadOfSchedule ? "trending-down" : "speedometer"} 
              size={28} 
              color="white" 
            />
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>
              {realStats.isAheadOfSchedule ? 'Adelantado al Plan' : 'Ritmo del Plan'}
            </Text>
            <Text style={styles.achievementDescription}>
              Peso esperado hoy: {realStats.expectedWeightToday}kg (desviación: {realStats.weightDeviation}kg)
            </Text>
          </View>
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
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 5,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodButtonActive: {
    backgroundColor: COLORS.secondary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: 'white',
  },
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changePositive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  changeNegative: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 4,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 5,
    fontWeight: '600',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  targetLine: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    alignItems: 'center',
  },
  dashedLine: {
    width: '100%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    marginBottom: 5,
  },
  targetLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  achievementsSection: {
    paddingHorizontal: 20,
  },
  achievementCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  achievementDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bottomSpacing: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.primary,
    marginVertical: 8,
  },
  detailProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1, // Fix: tomar espacio disponible
    maxWidth: '100%', // Fix iOS: prevenir overflow
  },
  detailProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    overflow: 'hidden',
    minWidth: 0, // Fix: permite que flex funcione correctamente
  },
  detailProgressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  detailProgressText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: 'bold',
    width: 45, // Fix: ancho fijo para el porcentaje
    textAlign: 'right',
    flexShrink: 0, // Fix: no permitir que se encoja
  },
  gloveSpinner: {
    fontSize: 24,
    textAlign: 'center',
  },
  gloveSpinnerLarge: {
    fontSize: 48,
    textAlign: 'center',
  },
});
