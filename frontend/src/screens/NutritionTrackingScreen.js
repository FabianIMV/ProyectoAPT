import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';
import { getDayProgress } from '../services/progressService';

const { width } = Dimensions.get('window');

export default function NutritionTrackingScreen({ navigation }) {
  const { userId } = useAuth();
  const [currentDayData, setCurrentDayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dayProgress, setDayProgress] = useState(null);
  const [timelineId, setTimelineId] = useState(null);
  const [currentDayNumber, setCurrentDayNumber] = useState(null);

  useEffect(() => {
    loadTimelineData();
  }, [userId]);

  const loadTimelineData = async () => {
    if (!userId) return;

    try {
      const response = await fetch(WEIGHT_CUT_API.getTimeline(userId));

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const timeline = result.data;
          setTimelineId(timeline.id);

          const dayIndex = calculateCurrentDay(timeline.start_date, timeline.total_days);

          if (dayIndex !== null && dayIndex >= 0 && dayIndex !== 'completed') {
            const dayNum = dayIndex + 1;
            setCurrentDayNumber(dayNum);
            setCurrentDayData(timeline.timeline_data.days[dayIndex]);

            // Cargar progreso del día
            const progressResult = await getDayProgress(userId, timeline.id, dayNum);
            if (progressResult.success) {
              setDayProgress(progressResult.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cargando timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimelineData();
    setRefreshing(false);
  };

  // Listener para recargar cuando vuelve de Scanner
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userId) {
        loadTimelineData();
      }
    });

    return unsubscribe;
  }, [navigation, userId]);

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

  // Usar datos del progreso si están disponibles (manejar tanto camelCase como snake_case)
  const totalCalories = dayProgress?.actualCalories || dayProgress?.actual_calories || 0;
  const targetCalories = currentDayData ? currentDayData.targets.caloriesIntake : 2200;
  const remainingCalories = targetCalories - totalCalories;
  const progressPercentage = (totalCalories / targetCalories) * 100;

  const totalProtein = dayProgress?.actualProteinGrams || dayProgress?.actual_protein_grams || 0;
  const totalCarbs = dayProgress?.actualCarbsGrams || dayProgress?.actual_carbs_grams || 0;
  const totalFats = dayProgress?.actualFatsGrams || dayProgress?.actual_fats_grams || 0;

  const targetProtein = currentDayData ? currentDayData.targets.macros.proteinGrams : 150;
  const targetCarbs = currentDayData ? currentDayData.targets.macros.carbGrams : 200;
  const targetFats = currentDayData ? currentDayData.targets.macros.fatGrams : 60;

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
        <Text style={styles.headerTitle}>Seguimiento Nutricional</Text>
      </View>

      {/* Daily Summary Card */}
      {isLoading ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen Diario</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.loadingNote}>Cargando datos...</Text>
          </View>
        </View>
      ) : (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen Diario</Text>
          <View style={styles.caloriesContainer}>
            <View style={styles.caloriesCircle}>
              <Text style={styles.caloriesValue}>{totalCalories}</Text>
              <Text style={styles.caloriesLabel}>de {targetCalories}</Text>
              <Text style={styles.caloriesUnit}>calorias</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} />
            </View>
          </View>

          <View style={styles.remainingContainer}>
            <Text style={remainingCalories >= 0 ? styles.remainingText : styles.exceededText}>
              {remainingCalories >= 0 ? `Quedan ${remainingCalories} cal` : `Excedido por ${Math.abs(remainingCalories)} cal`}
            </Text>
          </View>
        </View>
      )}

      {/* Macros Card */}
      {isLoading ? (
        <View style={styles.macrosCard}>
          <Text style={styles.sectionTitle}>Macronutrientes del Día</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        </View>
      ) : currentDayData ? (
        <View style={styles.macrosCard}>
          <Text style={styles.sectionTitle}>Macronutrientes del Día</Text>
          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <View style={styles.macroCircleContainer}>
                <View style={[styles.macroCircle, { borderColor: '#4CAF50' }]}>
                  <Text style={styles.macroCircleValue}>{Math.round(totalProtein)}</Text>
                  <Text style={styles.macroCircleLabel}>de {targetProtein}</Text>
                  <Text style={styles.macroCircleUnit}>gramos</Text>
                </View>
              </View>
              <Text style={styles.macroLabel}>Proteínas</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={styles.macroCircleContainer}>
                <View style={[styles.macroCircle, { borderColor: '#FF9800' }]}>
                  <Text style={styles.macroCircleValue}>{Math.round(totalCarbs)}</Text>
                  <Text style={styles.macroCircleLabel}>de {targetCarbs}</Text>
                  <Text style={styles.macroCircleUnit}>gramos</Text>
                </View>
              </View>
              <Text style={styles.macroLabel}>Carbohidratos</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={styles.macroCircleContainer}>
                <View style={[styles.macroCircle, { borderColor: '#2196F3' }]}>
                  <Text style={styles.macroCircleValue}>{Math.round(totalFats)}</Text>
                  <Text style={styles.macroCircleLabel}>de {targetFats}</Text>
                  <Text style={styles.macroCircleUnit}>gramos</Text>
                </View>
              </View>
              <Text style={styles.macroLabel}>Grasas</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Timeline Recommendations */}
      {currentDayData && (
        <View style={styles.recommendationsCard}>
          <Text style={styles.sectionTitle}>Recomendaciones del Día</Text>
          <Text style={styles.recommendationText}>{currentDayData.recommendations.nutritionFocus}</Text>
          <Text style={styles.recommendationText}>{currentDayData.recommendations.mealTiming}</Text>
        </View>
      )}

      {/* Meals List */}
      <View style={styles.mealsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registrar comida</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.secondary} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  summaryCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  caloriesContainer: {
    marginBottom: 20,
  },
  caloriesCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: COLORS.secondary,
  },
  caloriesValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  caloriesLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  caloriesUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 10,
  },
  progressBar: {
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
  remainingContainer: {
    marginTop: 5,
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  exceededText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  recommendationsCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 20,
  },
  macrosCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroCircleContainer: {
    marginBottom: 10,
  },
  macroCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
  },
  macroCircleValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  macroCircleLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  macroCircleUnit: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  timelineInfo: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  timelineInfoText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  mealsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    padding: 5,
  },
  mealCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  mealTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mealCalories: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  mealMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  mealMacroItem: {
    alignItems: 'center',
  },
  mealMacroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  editMealButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editMealText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  emptyMealsCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderStyle: 'dashed',
  },
  emptyMealsIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyMealsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyMealsSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  complianceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  complianceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  complianceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingNote: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
});
