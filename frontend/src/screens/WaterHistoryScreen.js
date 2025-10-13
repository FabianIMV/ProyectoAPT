import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getDailyWaterIntake, getWeeklyWaterIntake } from '../services/waterService';
import WaterIntakeModal from '../components/WaterIntakeModal';

export default function WaterHistoryScreen({ navigation }) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayIntake, setTodayIntake] = useState(null);
  const [weeklyIntake, setWeeklyIntake] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [addingWater, setAddingWater] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayResult, weeklyResult] = await Promise.all([
        getDailyWaterIntake(userId),
        getWeeklyWaterIntake(userId)
      ]);

      if (todayResult.success) {
        setTodayIntake(todayResult.data);
      }

      if (weeklyResult.success) {
        setWeeklyIntake(weeklyResult.data || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddWater = async (amount) => {
    setAddingWater(true);
    try {
      const { addWaterIntake } = require('../services/waterService');
      const result = await addWaterIntake(userId, amount);

      if (result.success) {
        await loadData();
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error agregando agua:', error);
    } finally {
      setAddingWater(false);
    }
  };

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  const targetLiters = 3.0;
  const todayLiters = todayIntake?.totalLiters || 0;
  const todayProgress = getProgressPercentage(todayLiters, targetLiters);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Agua</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>Consumo de Hoy</Text>
          <Text style={styles.todayDate}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>

        <View style={styles.circleContainer}>
          <View style={styles.progressCircle}>
            <Text style={styles.circleValue}>{todayLiters.toFixed(1)}L</Text>
            <Text style={styles.circleLabel}>de {targetLiters}L</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${todayProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{todayProgress.toFixed(0)}%</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="water" size={20} color={COLORS.secondary} />
            <Text style={styles.statLabel}>Registros</Text>
            <Text style={styles.statValue}>{todayIntake?.intakeCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={20} color={COLORS.secondary} />
            <Text style={styles.statLabel}>Promedio</Text>
            <Text style={styles.statValue}>
              {todayIntake?.intakeCount > 0
                ? Math.round(todayIntake.totalMl / todayIntake.intakeCount)
                : 0}ml
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name={todayProgress >= 100 ? "checkmark-circle" : "time"} size={20} color={todayProgress >= 100 ? '#4CAF50' : '#FF9800'} />
            <Text style={styles.statLabel}>Estado</Text>
            <Text style={styles.statValue}>
              {todayProgress >= 100 ? 'Completo' : 'En progreso'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.weeklySection}>
        <Text style={styles.sectionTitle}>Últimos 7 Días</Text>

        {weeklyIntake.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No hay datos esta semana</Text>
          </View>
        ) : (
          weeklyIntake.map((day, index) => {
            const progress = getProgressPercentage(day.totalLiters, targetLiters);
            const isToday = new Date(day.date).toDateString() === new Date().toDateString();

            return (
              <View key={index} style={[styles.dayCard, isToday && styles.dayCardToday]}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayName}>{getDayName(day.date)}</Text>
                    <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                  </View>
                  <View style={styles.dayValueContainer}>
                    <Text style={styles.dayValue}>{day.totalLiters.toFixed(1)}L</Text>
                    {isToday && <Text style={styles.todayBadge}>Hoy</Text>}
                  </View>
                </View>

                <View style={styles.dayProgressBar}>
                  <View style={[styles.dayProgressFill, { width: `${progress}%` }]} />
                </View>

                <Text style={styles.dayProgressText}>
                  {progress >= 100 ? '✓ Meta alcanzada' : `${(targetLiters - day.totalLiters).toFixed(1)}L restantes`}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Consejos de Hidratación</Text>
        <Text style={styles.tipText}>• Bebe agua al despertar para activar tu metabolismo</Text>
        <Text style={styles.tipText}>• Mantén una botella cerca durante el entrenamiento</Text>
        <Text style={styles.tipText}>• Bebe antes de sentir sed para mantenerte hidratado</Text>
        <Text style={styles.tipText}>• Distribuye tu consumo a lo largo del día</Text>
      </View>

      <View style={styles.bottomSpacing} />

      <WaterIntakeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddWater}
        loading={addingWater}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  todayCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  todayHeader: {
    marginBottom: 20,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  todayDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  circleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  progressCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary,
    borderWidth: 8,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  circleLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    minWidth: 45,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  weeklySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  dayCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dayDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  todayBadge: {
    backgroundColor: COLORS.secondary,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dayProgressBar: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  dayProgressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  dayProgressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tipsCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});
