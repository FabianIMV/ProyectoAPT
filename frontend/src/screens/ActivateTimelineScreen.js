import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUserTimezone } from '../utils/dateUtils';

export default function ActivateTimelineScreen({ route, navigation }) {
  const { activePlan, totalDays } = route.params;
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState(null);
  const [weighInDate, setWeighInDate] = useState(null);
  const [weighInTime, setWeighInTime] = useState(null); // Read-only desde el plan
  const [showWeighInTime, setShowWeighInTime] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [dateWarning, setDateWarning] = useState(null);

  // Auto-detectar timezone del usuario y cargar fechas del plan
  useEffect(() => {
    const userTimezone = getUserTimezone();
    setTimezone(userTimezone);

    // Cargar fechas del plan guardado (desde analysis_request JSON)
    if (activePlan && activePlan.analysis_request) {
      const request = activePlan.analysis_request;

      if (request.startDate) {
        const startDate = new Date(request.startDate);
        setPlannedStartDate(startDate);
        // Usar fecha planeada como default para selectedDate
        setSelectedDate(startDate);
      }

      if (request.weighInDate) {
        const weighIn = new Date(request.weighInDate);
        setWeighInDate(weighIn);

        // Calcular días restantes desde HOY hasta la fecha del pesaje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        weighIn.setHours(0, 0, 0, 0);

        const diffTime = weighIn - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays);

        // Generar advertencia si es necesario
        if (diffDays < totalDays) {
          setDateWarning({
            type: 'warning',
            message: `Activación tardía: El plan original era de ${totalDays} días, pero solo quedan ${diffDays} días hasta el pesaje. El plan será más agresivo.`
          });
        } else if (diffDays > totalDays) {
          setDateWarning({
            type: 'info',
            message: `Activación anticipada: Tienes ${diffDays} días disponibles (${diffDays - totalDays} días extra). El plan será más gradual y seguro.`
          });
        } else if (diffDays === 1) {
          setDateWarning({
            type: 'critical',
            message: `¡ADVERTENCIA CRÍTICA! Solo queda 1 día. Este será un corte extremo de agua. Procede con precaución.`
          });
        } else if (diffDays <= 0) {
          setDateWarning({
            type: 'error',
            message: 'La fecha del pesaje ya pasó o es hoy. No puedes activar este plan.'
          });
        }
      }
    }
  }, [activePlan, totalDays]);

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

  const validateWeighInTime = (time) => {
    if (!time) return true; // Opcional
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  };

  const validateDate = () => {
    const today = new Date();
    const dateToCheck = new Date(selectedDate);
    today.setHours(0, 0, 0, 0);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck < today) {
      Alert.alert('Error', 'La fecha de inicio debe ser hoy o posterior');
      return false;
    }

    if (showWeighInTime && weighInTime && !validateWeighInTime(weighInTime)) {
      Alert.alert(
        'Formato inválido',
        'La hora debe estar en formato 24h (HH:mm). Ejemplo: 08:00, 14:30'
      );
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
      const requestBody = {
        userId: userId,
        startDate: formatDateForAPI(selectedDate),
      };

      // Agregar weighInTime y timezone si el usuario activó la opción
      if (showWeighInTime && weighInTime) {
        requestBody.weighInTime = weighInTime;
        requestBody.timezone = timezone;
      }

      // Crear AbortController para timeout de 180 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s = 3 minutos

      const response = await fetch(WEIGHT_CUT_API.activateTimeline, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Manejar error 502 específicamente
      if (response.status === 502) {
        const textResponse = await response.text();
        console.error('Timeline Lambda timeout/error (502):', textResponse);
        throw new Error('El servidor tardó demasiado en generar el timeline.\n\nIntenta con menos días o usando gemini-2.5-flash.');
      }

      // Verificar Content-Type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Expected JSON but got:', textResponse.substring(0, 200));
        throw new Error('El servidor no devolvió un JSON válido.');
      }

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

      // Manejo específico de errores de red
      let errorMessage = 'No se pudo generar el timeline. Por favor intenta nuevamente.';

      if (error.name === 'AbortError') {
        errorMessage = 'La operación tardó demasiado tiempo (>3 min). El timeline puede estar generándose en segundo plano. Revisa tu dashboard en unos minutos.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
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

        {/* Tarjeta de información de fechas */}
        {weighInDate && plannedStartDate && (
          <View style={styles.datesInfoCard}>
            <Text style={styles.datesInfoTitle}>Información del Plan</Text>

            <View style={styles.dateInfoRow}>
              <Text style={styles.dateInfoIcon}>📅</Text>
              <View style={styles.dateInfoContent}>
                <Text style={styles.dateInfoLabel}>Inicio planeado</Text>
                <Text style={styles.dateInfoValue}>{formatDate(plannedStartDate)}</Text>
              </View>
            </View>

            <View style={styles.dateInfoRow}>
              <Text style={styles.dateInfoIcon}>🏆</Text>
              <View style={styles.dateInfoContent}>
                <Text style={styles.dateInfoLabel}>Fecha del pesaje</Text>
                <Text style={styles.dateInfoValue}>{formatDate(weighInDate)}</Text>
              </View>
            </View>

            <View style={styles.dateInfoRow}>
              <Text style={styles.dateInfoIcon}>⏱️</Text>
              <View style={styles.dateInfoContent}>
                <Text style={styles.dateInfoLabel}>Días restantes</Text>
                <Text style={[
                  styles.dateInfoValue,
                  daysRemaining !== null && daysRemaining < totalDays && { color: '#FF9800' },
                  daysRemaining !== null && daysRemaining === 1 && { color: '#F44336' }
                ]}>
                  {daysRemaining !== null ? `${daysRemaining} días` : 'Calculando...'}
                </Text>
              </View>
            </View>

            <View style={styles.dateInfoRow}>
              <Text style={styles.dateInfoIcon}>📋</Text>
              <View style={styles.dateInfoContent}>
                <Text style={styles.dateInfoLabel}>Plan original</Text>
                <Text style={styles.dateInfoValue}>{totalDays} días</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tarjeta de advertencia */}
        {dateWarning && dateWarning.type !== 'error' && (
          <View style={[
            styles.warningCard,
            dateWarning.type === 'warning' && { backgroundColor: '#FF9800', borderColor: '#F57C00' },
            dateWarning.type === 'info' && { backgroundColor: '#2196F3', borderColor: '#1976D2' },
            dateWarning.type === 'critical' && { backgroundColor: '#F44336', borderColor: '#D32F2F' }
          ]}>
            <Text style={styles.warningIcon}>
              {dateWarning.type === 'warning' && '⚠️'}
              {dateWarning.type === 'info' && 'ℹ️'}
              {dateWarning.type === 'critical' && '🚨'}
            </Text>
            <Text style={styles.warningText}>{dateWarning.message}</Text>
          </View>
        )}

        {/* Bloqueador si la fecha ya pasó */}
        {dateWarning && dateWarning.type === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Plan Expirado</Text>
            <Text style={styles.errorText}>{dateWarning.message}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.errorButtonText}>Crear Nuevo Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiempo estimado de generación:</Text>
            <Text style={styles.infoValue}>{Math.max(90, (daysRemaining || totalDays) * 15)}s</Text>
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

        {/* Nueva sección: Hora de pesaje */}
        <View style={styles.weighInSection}>
          <View style={styles.weighInHeader}>
            <View style={styles.weighInTitleContainer}>
              <Text style={styles.weighInTitle}>Hora del pesaje oficial</Text>
              <Text style={styles.weighInSubtitle}>
                {showWeighInTime
                  ? 'Se generará un día parcial con instrucciones para las últimas horas'
                  : 'Opcional - Activa si conoces la hora exacta del pesaje'}
              </Text>
            </View>
            <Switch
              value={showWeighInTime}
              onValueChange={setShowWeighInTime}
              trackColor={{ false: '#767577', true: COLORS.secondary }}
              thumbColor={showWeighInTime ? COLORS.secondary : '#f4f3f4'}
            />
          </View>

          {showWeighInTime && (
            <View style={styles.weighInInputContainer}>
              <TextInput
                style={styles.weighInInput}
                placeholder="08:00"
                placeholderTextColor={COLORS.textSecondary}
                value={weighInTime}
                onChangeText={setWeighInTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <Text style={styles.weighInHelp}>
                Formato 24h (HH:mm). Ej: 08:00, 14:30
              </Text>
              <Text style={styles.timezoneInfo}>
                Zona horaria: {timezone}
              </Text>
            </View>
          )}
        </View>

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
          style={[
            styles.activateButton,
            (dateWarning && dateWarning.type === 'error') && styles.disabledButton
          ]}
          onPress={handleActivateTimeline}
          disabled={dateWarning && dateWarning.type === 'error'}
        >
          <Text style={styles.activateButtonText}>
            {dateWarning && dateWarning.type === 'error' ? 'Plan Expirado' : 'Generar Timeline'}
          </Text>
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
  weighInSection: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  weighInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weighInTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  weighInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  weighInSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  weighInInputContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  weighInInput: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  weighInHelp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  timezoneInfo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Dates Info Card Styles
  datesInfoCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  datesInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  dateInfoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateInfoContent: {
    flex: 1,
  },
  dateInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  // Warning Card Styles
  warningCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
  },
  // Error Card Styles
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F44336',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#721C24',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
});
