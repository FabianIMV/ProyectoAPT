import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Animated, Alert } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API, NUTRITION_API } from '../config/api';
import { getDayProgress } from '../services/progressService';
import { calculateCurrentDayIndex, formatTime } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

export default function NutritionTrackingScreen({ navigation }) {
  const { userId, user } = useAuth();
  const [currentDayData, setCurrentDayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dayProgress, setDayProgress] = useState(null);
  const [timelineId, setTimelineId] = useState(null);
  const [currentDayNumber, setCurrentDayNumber] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

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
          const timelineData = result.data;
          setTimeline(timelineData); // Guardar timeline completo
          setTimelineId(timelineData.id);

          const dayIndex = calculateCurrentDayIndex(timelineData.start_date, timelineData.total_days);

          if (dayIndex !== null && dayIndex >= 0 && dayIndex !== 'completed') {
            const dayNum = dayIndex + 1;
            setCurrentDayNumber(dayNum);
            setCurrentDayData(timelineData.timeline_data.days[dayIndex]);

            // Cargar progreso del día
            const progressResult = await getDayProgress(userId, timelineData.id, dayNum);
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

  // Cargar recomendaciones con IA
  const loadAIRecommendations = async () => {
    if (!currentDayData || !dayProgress || !timeline) {
      console.log('⚠️ Faltan datos para generar recomendaciones');
      return;
    }

    setLoadingRecommendations(true);

    try {
      const response = await fetch(NUTRITION_API.recommendations, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caloriesConsumed: totalCalories,
          caloriesTarget: targetCalories,
          proteinConsumed: totalProtein,
          proteinTarget: targetProtein,
          carbsConsumed: totalCarbs,
          carbsTarget: targetCarbs,
          fatsConsumed: totalFats,
          fatsTarget: targetFats,
          currentPhase: currentDayData.phase,
          dayNumber: currentDayNumber,
          totalDays: timeline.total_days,
          sport: timeline.analysis_request?.combatSport || 'deportes de combate',
          userAge: user?.age || 25,
          userWeight: timeline.analysis_request?.currentWeightKg || 70,
          meals: meals.map(m => ({
            name: m.name,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fats: m.fats
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAiRecommendations(result.data);
          setShowRecommendations(true);

          // Animación de entrada
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }).start();

          console.log('✅ Recomendaciones cargadas:', result.data);
        }
      } else {
        // Manejo específico para error 500
        if (response.status === 500) {
          Alert.alert(
            'Servicio Temporalmente Saturado',
            'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
            [{ text: 'Entendido' }]
          );
        }
        console.error('❌ Error en respuesta:', response.status);
      }
    } catch (error) {
      console.error('❌ Error cargando recomendaciones:', error);
      
      // Verificar si es error 500
      if (error.message && error.message.includes('500')) {
        Alert.alert(
          'Servicio Temporalmente Saturado',
          'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
          [{ text: 'Entendido' }]
        );
      }
    } finally {
      setLoadingRecommendations(false);
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

  // Función deprecada - ahora se usa calculateCurrentDayIndex desde utils/dateUtils

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

  // Parsear meals del array de notes o string
  const meals = React.useMemo(() => {
    if (!dayProgress) return [];

    // Manejar tanto camelCase como snake_case
    const notesData = dayProgress.notes || dayProgress.day_notes;

    console.log('📝 notesData tipo:', typeof notesData);

    if (!notesData) return [];

    let mealsArray = [];

    // Si notes es un string con formato "[HH:MM] {...}\n[HH:MM] {...}"
    if (typeof notesData === 'string') {
      try {
        // Dividir por líneas y procesar cada una
        const lines = notesData.split('\n').filter(line => line.trim());

        console.log('📝 Encontradas', lines.length, 'líneas');

        mealsArray = lines
          .map((line, index) => {
            try {
              // Remover el timestamp [HH:MM] del inicio
              // Formato: "[17:58] {...json...}"
              const match = line.match(/^\[[\d:]+\]\s*(.+)$/);

              if (match && match[1]) {
                const jsonString = match[1].trim();
                const parsed = JSON.parse(jsonString);

                if (parsed.type === 'meal') {
                  console.log('✅ Meal parseada:', parsed.name);
                  return { ...parsed, id: index };
                }
              } else {
                // Intentar parsear directamente si no tiene timestamp
                const parsed = JSON.parse(line);
                if (parsed.type === 'meal') {
                  console.log('✅ Meal parseada (sin timestamp):', parsed.name);
                  return { ...parsed, id: index };
                }
              }
              return null;
            } catch (error) {
              console.log('⚠️ Error parsing line:', line.substring(0, 50), error.message);
              return null;
            }
          })
          .filter(meal => meal !== null);

        console.log('📊 Total meals procesadas:', mealsArray.length);

      } catch (error) {
        console.log('❌ Error procesando notes:', error);
        return [];
      }
    } else if (Array.isArray(notesData)) {
      // Si notes ya es un array
      mealsArray = notesData
        .map((note, index) => {
          try {
            if (typeof note === 'string') {
              const parsed = JSON.parse(note);
              if (parsed.type === 'meal') {
                return { ...parsed, id: index };
              }
            } else if (note && note.type === 'meal') {
              return { ...note, id: index };
            }
            return null;
          } catch (error) {
            console.log('Error parsing meal:', error);
            return null;
          }
        })
        .filter(meal => meal !== null);
    }

    // Ordenar por timestamp de más reciente a más viejo (reverse)
    return mealsArray.reverse();
  }, [dayProgress]);

  // Formatear hora de la comida usando utility function
  const formatMealTime = (timestamp) => formatTime(timestamp);

  return (
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
      {/* Daily Summary Card */}
      {isLoading ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen Diario</Text>
          <View style={styles.loadingContainer}>
            <Text style={styles.gloveSpinnerLarge}>🥊</Text>
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
              <Text style={styles.caloriesUnit}>calorías</Text>
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
            <Text style={styles.gloveSpinnerLarge}>🥊</Text>
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

      {/* AI Recommendations eliminadas - ahora se usa el botón flotante */}
      {false && !isLoading && currentDayData && meals.length > 0 && (
        <View style={styles.aiRecommendationsContainer}>
          {showRecommendations && aiRecommendations && (
            <Animated.View style={[styles.aiRecommendationsCard, { opacity: fadeAnim }]}>
              {/* Header con emoji y título */}
              <View style={[
                styles.aiRecommendationsHeader,
                {
                  backgroundColor: aiRecommendations.severity === 'danger' ? '#FF6B6B20' :
                                   aiRecommendations.severity === 'warning' ? '#FF980020' :
                                   aiRecommendations.severity === 'success' ? '#4CAF5020' : '#2196F320'
                }
              ]}>
                <Text style={styles.aiRecommendationsEmoji}>{aiRecommendations.emoji}</Text>
                <Text style={[
                  styles.aiRecommendationsTitle,
                  {
                    color: aiRecommendations.severity === 'danger' ? '#FF6B6B' :
                           aiRecommendations.severity === 'warning' ? '#FF9800' :
                           aiRecommendations.severity === 'success' ? '#4CAF50' : '#2196F3'
                  }
                ]}>
                  {aiRecommendations.title}
                </Text>
              </View>

              {/* Mensaje principal */}
              <Text style={styles.aiRecommendationsMessage}>
                {aiRecommendations.message}
              </Text>

              {/* Recomendaciones lista */}
              <View style={styles.aiRecommendationsList}>
                <Text style={styles.aiRecommendationsListTitle}>Recomendaciones:</Text>
                {aiRecommendations.recommendations.map((rec, index) => (
                  <View key={index} style={styles.aiRecommendationItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={COLORS.secondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.aiRecommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>

              {/* Siguiente comida sugerida */}
              {aiRecommendations.nextMealSuggestion && (
                <View style={styles.aiNextMealCard}>
                  <Text style={styles.aiNextMealTitle}>
                    💡 Próxima Comida Sugerida:
                  </Text>
                  <Text style={styles.aiNextMealType}>
                    {aiRecommendations.nextMealSuggestion.type}
                  </Text>
                  <Text style={styles.aiNextMealCalories}>
                    ~{aiRecommendations.nextMealSuggestion.calories} calorías
                  </Text>
                  <Text style={styles.aiNextMealExamplesTitle}>Ejemplos:</Text>
                  {aiRecommendations.nextMealSuggestion.examples.map((example, index) => (
                    <Text key={index} style={styles.aiNextMealExample}>
                      • {example}
                    </Text>
                  ))}
                </View>
              )}

              {/* Frase motivacional */}
              {aiRecommendations.motivationalQuote && (
                <View style={styles.aiMotivationalQuote}>
                  <Text style={styles.aiMotivationalQuoteText}>
                    "{aiRecommendations.motivationalQuote}"
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>
      )}

      {/* Meals List */}
      <View style={styles.mealsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comidas Registradas</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.gloveSpinnerLarge}>🥊</Text>
          </View>
        ) : meals.length === 0 ? (
          <View style={styles.emptyMealsCard}>
            <Text style={styles.emptyMealsIcon}>🍽️</Text>
            <Text style={styles.emptyMealsText}>No has registrado comidas aún</Text>
            <Text style={styles.emptyMealsSubtext}>
              Toca el botón + para escanear tu comida
            </Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealTimeHeader}>
                <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.mealTimeHeaderText}>{formatMealTime(meal.timestamp)}</Text>
              </View>
              <View style={styles.mealHeader}>
                <View style={styles.mealInfoContainer}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  {meal.weight && (
                    <Text style={styles.mealTime}><Text style={styles.boldLabel}>Peso:</Text> {meal.weight}g</Text>
                  )}
                  {meal.confidence && (
                    <Text style={styles.mealTime}><Text style={styles.boldLabel}>Confianza:</Text> {meal.confidence}%</Text>
                  )}
                </View>
                <View style={styles.caloriesBadge}>
                  <Text style={styles.mealCalories}>{meal.calories}</Text>
                  <Text style={styles.caloriesLabel}>cal</Text>
                </View>
              </View>

              <View style={styles.mealMacros}>
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroValue, { color: '#4CAF50' }]}>
                    {meal.protein}g
                  </Text>
                  <Text style={styles.macroLabel}>Proteínas</Text>
                </View>
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroValue, { color: '#FF9800' }]}>
                    {meal.carbs}g
                  </Text>
                  <Text style={styles.macroLabel}>Carbohidratos</Text>
                </View>
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroValue, { color: '#2196F3' }]}>
                    {meal.fats}g
                  </Text>
                  <Text style={styles.macroLabel}>Grasas</Text>
                </View>
              </View>

              {meal.ingredients && meal.ingredients.length > 0 && (
                <View style={styles.ingredientsContainer}>
                  <Text style={styles.ingredientsTitle}>Ingredientes:</Text>
                  <Text style={styles.ingredientsText}>
                    {meal.ingredients.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
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
  mealTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + '30',
    gap: 6,
  },
  mealTimeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealInfoContainer: {
    flex: 1,
    marginRight: 12,
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
  boldLabel: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  caloriesBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  mealCalories: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  caloriesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
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
  ingredientsContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  ingredientsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // AI Recommendations Styles
  aiRecommendationsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  aiRecommendationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  aiRecommendationsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  aiRecommendationsCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    marginBottom: 15,
  },
  aiRecommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  aiRecommendationsEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  aiRecommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  aiRecommendationsMessage: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  aiRecommendationsList: {
    marginBottom: 20,
  },
  aiRecommendationsListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  aiRecommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 5,
  },
  aiRecommendationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    flex: 1,
  },
  aiNextMealCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  aiNextMealTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  aiNextMealType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  aiNextMealCalories: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  aiNextMealExamplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  aiNextMealExample: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 10,
    marginBottom: 4,
    lineHeight: 18,
  },
  aiMotivationalQuote: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    padding: 15,
    borderTopWidth: 3,
    borderTopColor: COLORS.secondary,
  },
  aiMotivationalQuoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Floating Feedback Button
  feedbackFloatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: COLORS.secondary,
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
  gloveSpinner: {
    fontSize: 24,
    textAlign: 'center',
  },
  gloveSpinnerLarge: {
    fontSize: 48,
    textAlign: 'center',
  },
});
