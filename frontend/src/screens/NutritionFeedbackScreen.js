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
        // Error: mostrar fallback
        setError(result.error || 'No se pudo obtener feedback');
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
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.message);
      Alert.alert('Error', 'Ocurrió un error al obtener el feedback');
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
      <Text style={styles.emptyTitle}>Feedback Nutricional IA</Text>
      <Text style={styles.emptySubtitle}>
        Análisis personalizado de tu progreso diario en calorías e hidratación
      </Text>

      <TouchableOpacity
        style={styles.getFeedbackButton}
        onPress={fetchFeedback}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="analytics" size={28} color="#fff" />
            <Text style={styles.getFeedbackButtonText}>
              Generar Análisis IA
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          <Text style={styles.featureText}>Evaluación de calorías e hidratación</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          <Text style={styles.featureText}>Recomendaciones personalizadas</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
          <Text style={styles.featureText}>Sugerencias de próxima comida</Text>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Nutricional IA</Text>
        <TouchableOpacity
          onPress={fetchFeedback}
          disabled={loading}
          style={styles.refreshHeaderButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.secondary} />
          ) : (
            <Ionicons name="refresh" size={24} color={COLORS.secondary} />
          )}
        </TouchableOpacity>
      </View>

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
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.loadingText}>Analizando tu progreso...</Text>
            <Text style={styles.loadingSubtext}>
              La IA está generando recomendaciones personalizadas
            </Text>
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
                  <ActivityIndicator color="#fff" />
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
              onPress={fetchFeedback}
              disabled={loading}
            >
              <Ionicons name="refresh-circle" size={24} color={COLORS.secondary} />
              <Text style={styles.newAnalysisText}>Actualizar Análisis</Text>
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
  featuresList: {
    marginTop: 30,
    width: '100%',
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
  },
  getFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getFeedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
});
