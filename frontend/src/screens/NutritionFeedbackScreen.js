import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getDailyNutritionFeedbackWithRetry,
  getLocalFallbackFeedback
} from '../services/nutritionFeedbackService';
import { saveAIRecommendations } from '../services/progressService';
import FeedbackCard from '../components/FeedbackCard';

const { width, height } = Dimensions.get('window');
const CACHE_KEY = '@nutrition_feedback_cache';

export default function NutritionFeedbackScreen({ navigation, route }) {
  const { userId, user } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cachedFeedback, setCachedFeedback] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [accepting, setAccepting] = useState(false);
  const [refreshingAnalysis, setRefreshingAnalysis] = useState(false);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const userName = user?.full_name?.split(' ')[0] || user?.name || 'Atleta';

  // Parámetros opcionales desde navegación
  const timelineId = route?.params?.timelineId;
  const dayNumber = route?.params?.dayNumber;
  const onAccept = route?.params?.onAccept;

  // Debug: Log del estado actual
  console.log('🔍 NutritionFeedback State:', {
    hasFeedback: !!feedback,
    feedbackKeys: feedback ? Object.keys(feedback).length : 0,
    loading,
    error,
    hasCachedFeedback: !!cachedFeedback,
    userId,
    timelineId,
    dayNumber
  });

  useEffect(() => {
    loadCachedFeedback();
  }, []);

  // Animación del spinner
  useEffect(() => {
    if (refreshingAnalysis) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [refreshingAnalysis]);

  // Cargar feedback en caché
  const loadCachedFeedback = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Solo usar cache si es de hoy
        const cacheDate = new Date(parsedCache.timestamp).toDateString();
        const today = new Date().toDateString();

        if (cacheDate === today && parsedCache.data) {
          console.log('✅ Feedback en caché encontrado');
          setCachedFeedback(parsedCache.data);
          // NO establecer feedback automáticamente, solo guardarlo para mostrar botón
          // setFeedback(parsedCache.data);
        } else {
          console.log('ℹ️ No hay feedback en caché válido');
        }
      }
    } catch (error) {
      console.log('Error loading cache:', error);
    }
  };

  // Guardar feedback en caché
  const saveFeedbackToCache = async (feedbackData) => {
    try {
      const cacheData = {
        data: feedbackData,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Error saving cache:', error);
    }
  };

  // Obtener feedback del Lambda
  const fetchFeedback = async () => {
    if (!userId) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📊 Solicitando feedback para userId:', userId);

      const result = await getDailyNutritionFeedbackWithRetry(
        userId,
        timelineId,
        dayNumber
      );

      if (result.success && result.data) {
        setFeedback(result.data);
        await saveFeedbackToCache(result.data);

        // Animación de entrada
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      } else {
        // Error: verificar si es por modelo saturado
        setError(result.error || 'No se pudo obtener feedback');
        
        if (result.isModelSaturated) {
          // Mensaje específico para modelo saturado
          Alert.alert(
            'Servicio Temporalmente Saturado',
            'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
            [{ text: 'Entendido' }]
          );
        } else {
          // Error general: ofrecer análisis básico
          Alert.alert(
            'Feedback No Disponible',
            'No se pudo conectar con el servicio de IA. ¿Quieres usar un análisis básico?',
            [
              {
                text: 'Cancelar',
                style: 'cancel'
              },
              {
                text: 'Usar Análisis Básico',
                onPress: () => {
                  const fallback = getLocalFallbackFeedback({
                    actual_calories: 1800,
                    target_calories: 2000
                  });
                  setFeedback(fallback);
                }
              }
            ]
          );
        }
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.message);
      
      // Verificar si el error contiene indicios de saturación
      const isSaturatedError = err.message && (err.message.includes('500') || err.message.includes('saturado'));
      
      if (isSaturatedError) {
        Alert.alert(
          'Servicio Temporalmente Saturado',
          'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
          [{ text: 'Entendido' }]
        );
      } else {
        Alert.alert('Error', 'Ocurrió un error al obtener el feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeedback();
    setRefreshing(false);
  };

  // Aceptar recomendaciones y guardar
  const handleAcceptRecommendations = async () => {
    if (!feedback || !userId || !timelineId || !dayNumber) {
      Alert.alert('Error', 'Faltan datos para guardar las recomendaciones');
      return;
    }

    setAccepting(true);

    try {
      const result = await saveAIRecommendations(userId, timelineId, dayNumber, feedback);

      if (result.success) {
        Alert.alert(
          'Recomendaciones Guardadas',
          'Las recomendaciones personalizadas ahora aparecen en tu Plan del Día',
          [
            {
              text: 'Ver en Dashboard',
              onPress: () => {
                // Llamar callback si existe
                if (onAccept) {
                  onAccept(feedback);
                }
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudieron guardar las recomendaciones');
      }
    } catch (error) {
      console.error('Error guardando recomendaciones:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar las recomendaciones');
    } finally {
      setAccepting(false);
    }
  };

  // Render: Estado vacío
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.aiIconContainer}>
        <Ionicons name="bulb" size={100} color={COLORS.secondary} />
        <View style={styles.aiSparkle}>
          <Ionicons name="sparkles" size={40} color={COLORS.secondary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Feedback Nutricional con IA</Text>
      <Text style={styles.emptySubtitle}>
        Análisis personalizado de tu progreso diario en calorías e hidratación
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.getFeedbackButton}
          onPress={fetchFeedback}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.gloveSpinner}>🥊</Text>
          ) : (
            <>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="analytics" size={28} color="#fff" />
                <View style={styles.sparkleIcon}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                </View>
              </View>
              <Text style={styles.getFeedbackButtonText}>
                Generar Análisis IA
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.tapHint}>
          <Ionicons name="hand-left" size={16} color={COLORS.secondary} />
          <Text style={styles.tapHintText}>Toca para generar tu análisis personalizado</Text>
        </View>
      </View>

      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>¿Qué obtendrás?</Text>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTextBold}>Evaluación Completa</Text>
            <Text style={styles.featureText}>Análisis de calorías e hidratación del día</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTextBold}>Recomendaciones IA</Text>
            <Text style={styles.featureText}>Consejos personalizados según tu progreso</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTextBold}>Próxima Comida</Text>
            <Text style={styles.featureText}>Sugerencias de qué comer según tu plan</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Render: Error
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
      <Text style={styles.errorTitle}>Error al Obtener Feedback</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={fetchFeedback}
        disabled={loading}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  // Configurar título del header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Feedback Nutricional con IA',
      headerBackTitle: 'Atrás',
    });
  }, [navigation]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Loading Overlay */}
      {refreshingAnalysis && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContainer}>
            <Animated.Text style={[styles.gloveSpinnerLarge, { transform: [{ rotate: spin }] }]}>
              🥊
            </Animated.Text>
            <Text style={styles.loadingOverlayText}>Analizando de nuevo...</Text>
            <Text style={styles.loadingOverlaySubtext}>La IA está procesando tus datos actualizados</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.secondary}
            colors={[COLORS.secondary]}
          />
        }
      >
        {loading && !feedback ? (
          <View style={styles.loadingContainer}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="bulb" size={80} color={COLORS.secondary} />
              <View style={styles.aiSparkle}>
                <Ionicons name="sparkles" size={32} color={COLORS.secondary} />
              </View>
            </View>
            <Text style={styles.gloveSpinnerLarge}>🥊</Text>
            <Text style={styles.loadingText}>Analizando tu progreso...</Text>
            <Text style={styles.loadingSubtext}>
              La IA está procesando tus datos de nutrición e hidratación para generar recomendaciones personalizadas
            </Text>
            
            <View style={styles.loadingSteps}>
              <View style={styles.loadingStep}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.loadingStepText}>Recopilando datos del día</Text>
              </View>
              <View style={styles.loadingStep}>
                <Ionicons name="sync" size={20} color={COLORS.secondary} />
                <Text style={styles.loadingStepText}>Procesando con IA...</Text>
              </View>
              <View style={styles.loadingStep}>
                <Ionicons name="ellipsis-horizontal-circle" size={20} color={COLORS.textSecondary} />
                <Text style={styles.loadingStepText}>Generando recomendaciones</Text>
              </View>
            </View>
          </View>
        ) : error && !feedback ? (
          renderError()
        ) : feedback && Object.keys(feedback).length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header descriptivo del análisis */}
            <View style={styles.analysisHeader}>
              <View style={styles.analysisHeaderIcon}>
                <Ionicons name="bulb" size={32} color={COLORS.secondary} />
              </View>
              <View style={styles.analysisHeaderContent}>
                <Text style={styles.analysisHeaderTitle}>Análisis Generado</Text>
                <Text style={styles.analysisHeaderSubtitle}>
                  Evaluación personalizada de calorías e hidratación
                </Text>
              </View>
            </View>

            <FeedbackCard feedback={feedback} userName={userName} />

            {/* Botón para aceptar recomendaciones */}
            {timelineId && dayNumber && (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptRecommendations}
                disabled={accepting || loading}
              >
                {accepting ? (
                  <Text style={styles.gloveSpinner}>🥊</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.acceptButtonText}>Aceptar Recomendaciones</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Botón para nuevo análisis */}
            <TouchableOpacity
              style={styles.newAnalysisButton}
              onPress={() => {
                setRefreshingAnalysis(true);
                fetchFeedback().finally(() => setRefreshingAnalysis(false));
              }}
              disabled={loading || refreshingAnalysis}
            >
              <Ionicons name="refresh-circle" size={24} color={COLORS.secondary} />
              <Text style={styles.newAnalysisText}>Analizar de nuevo</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  refreshHeaderButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.15,
  },
  aiIconContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  aiSparkle: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  getFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 260,
  },
  buttonIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  getFeedbackButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  tapHintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  featuresList: {
    marginTop: 30,
    width: '100%',
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  featureIconContainer: {
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTextBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  viewCachedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 8,
  },
  viewCachedText: {
    color: COLORS.secondary,
    fontSize: 14,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.25,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  loadingSteps: {
    marginTop: 30,
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 16,
    width: '85%',
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  loadingStepText: {
    fontSize: 13,
    color: COLORS.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.2,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  newAnalysisText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  analysisHeaderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analysisHeaderContent: {
    flex: 1,
  },
  analysisHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  analysisHeaderSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  gloveSpinner: {
    fontSize: 24,
    textAlign: 'center',
  },
  gloveSpinnerLarge: {
    fontSize: 48,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingOverlayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  loadingOverlaySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
