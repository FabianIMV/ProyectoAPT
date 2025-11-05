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

  const userName = user?.full_name?.split(' ')[0] || user?.name || 'Atleta';

  // Parámetros opcionales desde navegación
  const timelineId = route?.params?.timelineId;
  const dayNumber = route?.params?.dayNumber;

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

        if (cacheDate === today) {
          setCachedFeedback(parsedCache.data);
          setFeedback(parsedCache.data);
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

  // Render: Estado vacío
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bulb-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>¿Cómo va tu día?</Text>
      <Text style={styles.emptySubtitle}>
        Obtén feedback inteligente sobre tu progreso nutricional del día
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
            <Ionicons name="sparkles" size={24} color="#fff" />
            <Text style={styles.getFeedbackButtonText}>
              🤖 Obtener Feedback del Día
            </Text>
          </>
        )}
      </TouchableOpacity>

      {cachedFeedback && (
        <TouchableOpacity
          style={styles.viewCachedButton}
          onPress={() => setFeedback(cachedFeedback)}
        >
          <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.viewCachedText}>
            Ver último análisis
          </Text>
        </TouchableOpacity>
      )}
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
        ) : feedback ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <FeedbackCard feedback={feedback} userName={userName} />

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
  emptyTitle: {
    fontSize: 24,
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
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  newAnalysisText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
