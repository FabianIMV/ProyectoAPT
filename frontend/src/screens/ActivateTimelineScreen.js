import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ActivateTimelineScreen({ route, navigation }) {
  const { activePlan, totalDays } = route.params;
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const validateDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('Error', 'La fecha de inicio debe ser hoy o posterior');
      return false;
    }
    return true;
  };

  const handleActivateTimeline = async () => {
    if (!validateDate()) return;

    const estimatedTime = Math.max(90, totalDays * 15);

    Alert.alert(
      'Generar Timeline',
      `Se generará tu plan diario personalizado.\n\nTiempo estimado: ${estimatedTime}s\n\n¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          onPress: () => activateTimeline()
        }
      ]
    );
  };

  const activateTimeline = async () => {
    setIsActivating(true);

    try {
      const response = await fetch(WEIGHT_CUT_API.activateTimeline, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          startDate: formatDateForAPI(selectedDate)
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(
          '✅ Timeline Generado',
          `Tu plan diario ha sido generado exitosamente para ${totalDays} días.`,
          [
            {
              text: 'Ver Dashboard',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Main' },
                  ],
                });
              }
            }
          ]
        );
      } else if (response.status === 404) {
        Alert.alert(
          'Error',
          'No tienes un plan de corte activo. Por favor genera uno primero.'
        );
      } else {
        throw new Error(result.message || 'Error al generar timeline');
      }
    } catch (error) {
      console.error('❌ Error activando timeline:', error);
      Alert.alert(
        'Error',
        'No se pudo generar el timeline. Por favor intenta nuevamente.'
      );
    } finally {
      setIsActivating(false);
    }
  };

  if (isActivating) {
    return (
      <LoadingSpinner
        useDynamicMessages={true}
        subtitle={`Generando timeline personalizado de ${totalDays} días...`}
        messageInterval={3000}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📅</Text>
        </View>

        <Text style={styles.title}>Activar Timeline Diario</Text>
        <Text style={styles.subtitle}>
          Genera tu plan personalizado día por día con objetivos y recomendaciones específicas
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan de corte:</Text>
            <Text style={styles.infoValue}>{totalDays} días</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiempo estimado:</Text>
            <Text style={styles.infoValue}>{Math.max(90, totalDays * 15)}s</Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>Fecha de inicio del plan</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Text style={styles.dateIcon}>📆</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Tu timeline incluirá:</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Objetivos diarios de peso, calorías y macros</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💧</Text>
            <Text style={styles.featureText}>Plan de hidratación específico por fase</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏃</Text>
            <Text style={styles.featureText}>Recomendaciones de cardio y entrenamiento</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🍽️</Text>
            <Text style={styles.featureText}>Timing de comidas y estrategias nutricionales</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚠️</Text>
            <Text style={styles.featureText}>Alertas y precauciones personalizadas</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.activateButton}
          onPress={handleActivateTimeline}
        >
          <Text style={styles.activateButtonText}>Generar Timeline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  dateSection: {
    marginBottom: 25,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  dateIcon: {
    fontSize: 24,
  },
  featuresCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  activateButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  activateButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
