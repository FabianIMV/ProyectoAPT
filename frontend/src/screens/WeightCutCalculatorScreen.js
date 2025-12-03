import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API, PROFILE_API } from '../config/api';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function WeightCutCalculatorScreen({ navigation }) {
  const { user, userId } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const scrollViewRef = useRef(null);
  
  // Refs para los inputs
  const targetWeightRef = useRef(null);
  const weighInTimeRef = useRef(null);
  const sessionsPerWeekRef = useRef(null);
  const sessionsPerDayRef = useRef(null);
  
  const [formData, setFormData] = useState({
    targetWeightKg: '',
    startDate: null,
    weighInDate: null,
    weighInTime: '', // Hora del pesaje (opcional)
    daysToCut: '', // Ahora se calcula automáticamente
    experienceLevel: 'amateur',
    combatSport: 'boxeo',
    trainingSessionsPerWeek: '',
    trainingSessionsPerDay: '',
    model: 'gemini-2.5-pro' // Cambiado a Pro como preferido
  });

  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showWeighInDatePicker, setShowWeighInDatePicker] = useState(false);
  
  // Estados temporales para los date pickers (iOS)
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempWeighInDate, setTempWeighInDate] = useState(null);

  // Estados para secciones colapsables
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(true);
  const [isSportInfoExpanded, setIsSportInfoExpanded] = useState(true);
  const [isTrainingExpanded, setIsTrainingExpanded] = useState(true);

  // Cargar perfil del usuario al montar el componente
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Calcular daysToCut automáticamente cuando cambien las fechas
  useEffect(() => {
    if (formData.startDate && formData.weighInDate) {
      const start = new Date(formData.startDate);
      const weighIn = new Date(formData.weighInDate);
      start.setHours(0, 0, 0, 0);
      weighIn.setHours(0, 0, 0, 0);

      const diffTime = weighIn - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setFormData(prev => ({ ...prev, daysToCut: diffDays.toString() }));
      }
    }
  }, [formData.startDate, formData.weighInDate]);

  const loadUserProfile = async () => {
    if (user && user.email) {
      try {
        const response = await fetch(PROFILE_API.getProfile(user.email));

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const profile = data.data[0];
            setUserProfile(profile);
            console.log('✅ Perfil de usuario cargado:', profile);
          }
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
        Alert.alert(
          'Error',
          'No se pudo cargar tu perfil. Asegúrate de tener tu peso, altura y edad configurados en tu perfil.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Funciones para manejar el DatePicker
  const formatDate = (date) => {
    if (!date) return 'Seleccionar fecha';
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setFormData(prev => ({ ...prev, startDate: selectedDate }));

        // Si la fecha de inicio es posterior a la de pesaje, limpiar fecha de pesaje
        if (formData.weighInDate && selectedDate >= formData.weighInDate) {
          setFormData(prev => ({ ...prev, weighInDate: null, daysToCut: '' }));
          Alert.alert(
            'Atención',
            'La fecha de inicio debe ser anterior a la fecha del pesaje. Por favor selecciona una nueva fecha de pesaje.'
          );
        }
      }
    } else {
      // iOS - guardar en estado temporal
      if (selectedDate) {
        setTempStartDate(selectedDate);
      }
    }
  };

  const handleStartDateConfirm = () => {
    setShowStartDatePicker(false);
    const dateToUse = tempStartDate || formData.startDate || new Date();
    setFormData(prev => ({ ...prev, startDate: dateToUse }));

    // Si la fecha de inicio es posterior a la de pesaje, limpiar fecha de pesaje
    if (formData.weighInDate && dateToUse >= formData.weighInDate) {
      setFormData(prev => ({ ...prev, weighInDate: null, daysToCut: '' }));
      Alert.alert(
        'Atención',
        'La fecha de inicio debe ser anterior a la fecha del pesaje. Por favor selecciona una nueva fecha de pesaje.'
      );
    }
    setTempStartDate(null);
    
    // Scroll al siguiente campo (fecha de pesaje)
    scrollToPosition(250);
  };

  const handleStartDateCancel = () => {
    setShowStartDatePicker(false);
    setTempStartDate(null);
  };

  const handleWeighInDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowWeighInDatePicker(false);
      if (selectedDate) {
        // Validar que la fecha de pesaje sea posterior a la de inicio
        if (formData.startDate && selectedDate <= formData.startDate) {
          Alert.alert(
            'Error de Fecha',
            'La fecha del pesaje debe ser posterior a la fecha de inicio del plan.'
          );
          return;
        }

        setFormData(prev => ({ ...prev, weighInDate: selectedDate }));
      }
    } else {
      // iOS - guardar en estado temporal
      if (selectedDate) {
        setTempWeighInDate(selectedDate);
      }
    }
  };

  const handleWeighInDateConfirm = () => {
    setShowWeighInDatePicker(false);
    const dateToUse = tempWeighInDate || formData.weighInDate || new Date(formData.startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Validar que la fecha de pesaje sea posterior a la de inicio
    if (formData.startDate && dateToUse <= formData.startDate) {
      Alert.alert(
        'Error de Fecha',
        'La fecha del pesaje debe ser posterior a la fecha de inicio del plan.'
      );
      setTempWeighInDate(null);
      return;
    }

    setFormData(prev => ({ ...prev, weighInDate: dateToUse }));
    setTempWeighInDate(null);
    
    // Scroll al siguiente campo (hora del pesaje)
    scrollToPosition(400);
  };

  const handleWeighInDateCancel = () => {
    setShowWeighInDatePicker(false);
    setTempWeighInDate(null);
  };

  // Función simple para clasificar tipo de corte
  const getWeightCutType = () => {
    if (!formData.targetWeightKg || !formData.daysToCut) {
      return { type: '-', color: COLORS.textSecondary };
    }

    const weightToLose = parseFloat(userProfile.weight) - parseFloat(formData.targetWeightKg);
    const days = parseInt(formData.daysToCut);
    const kgPerDay = weightToLose / days;

    // Clasificación simple basada en kg/día
    if (kgPerDay <= 0.5) {
      return { type: 'Gradual', color: '#4CAF50' }; // Verde
    } else if (kgPerDay <= 1.0) {
      return { type: 'Moderado', color: '#FF9800' }; // Naranja
    } else {
      return { type: 'Rápido', color: '#FF5722' }; // Rojo
    }
  };

  const calculateWeightDifference = () => {
    if (!userProfile || !userProfile.weight || !formData.targetWeightKg) {
      return { kg: '-', percent: '' };
    }

    const current = parseFloat(userProfile.weight);
    const target = parseFloat(formData.targetWeightKg);
    const diff = (current - target).toFixed(1);
    const percent = ((diff / current) * 100).toFixed(1);

    return { kg: diff, percent: `${percent}%` };
  };

  const validateForm = () => {
    const newErrors = {};
    const { targetWeightKg, startDate, weighInDate, weighInTime, daysToCut, trainingSessionsPerWeek, trainingSessionsPerDay } = formData;

    // Verificar que el perfil esté cargado
    if (!userProfile || !userProfile.weight) {
      newErrors.profile = 'Debes tener tu peso configurado en tu perfil';
    }

    if (!userProfile || !userProfile.height) {
      newErrors.profile = 'Debes tener tu altura configurada en tu perfil';
    }

    if (!userProfile || !userProfile.age) {
      newErrors.profile = 'Debes tener tu edad configurada en tu perfil';
    }

    // Target Weight validation
    if (!targetWeightKg) {
      newErrors.targetWeightKg = 'Debes ingresar un peso objetivo';
    } else {
      const targetWeight = parseFloat(targetWeightKg);
      
      if (isNaN(targetWeight)) {
        newErrors.targetWeightKg = 'El peso objetivo debe ser un número válido';
      } else if (targetWeight < 30) {
        newErrors.targetWeightKg = 'Peso incoherente ⚖️ (mínimo sensato: 30kg)';
      } else if (targetWeight > 500) {
        newErrors.targetWeightKg = 'Peso incoherente ⚖️ (máximo sensato: 500kg)';
      } else if (userProfile && targetWeight >= parseFloat(userProfile.weight)) {
        newErrors.targetWeightKg = 'El peso objetivo debe ser menor a tu peso actual';
      }
    }

    // Date validations (OBLIGATORIAS)
    if (!startDate) {
      newErrors.startDate = 'Debes seleccionar la fecha de inicio del plan';
    }

    if (!weighInDate) {
      newErrors.weighInDate = 'Debes seleccionar la fecha del pesaje oficial';
    }

    // Weigh-in time validation (OBLIGATORIO solo si hay fecha de pesaje)
    if (weighInDate) {
      if (!weighInTime || weighInTime.trim() === '') {
        newErrors.weighInTime = 'Debes ingresar la hora del pesaje oficial';
      } else {
        // Validar formato HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(weighInTime)) {
          newErrors.weighInTime = 'Formato inválido. Usa HH:mm (ej: 08:00, 14:30)';
        }
      }
    }

    // Days to cut validation (automático pero se valida)
    if (!daysToCut || parseInt(daysToCut) < 1) {
      newErrors.daysToCut = 'Debe haber al menos 1 día entre el inicio y el pesaje';
    }

    // Validar que la fecha de pesaje no sea en el pasado
    if (weighInDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weighInDateNormalized = new Date(weighInDate);
      weighInDateNormalized.setHours(0, 0, 0, 0);

      if (weighInDateNormalized < today) {
        newErrors.weighInDate = 'La fecha del pesaje no puede ser en el pasado';
      }
    }

    // Training sessions validation
    if (!trainingSessionsPerWeek) {
      newErrors.trainingSessionsPerWeek = 'Ingresa las sesiones de entrenamiento por semana';
    } else {
      const sessionsWeek = parseInt(trainingSessionsPerWeek);
      if (isNaN(sessionsWeek) || sessionsWeek < 1) {
        newErrors.trainingSessionsPerWeek = 'Mínimo 1 sesión por semana';
      } else if (sessionsWeek > 7) {
        newErrors.trainingSessionsPerWeek = 'Máximo 7 sesiones por semana (1 por día)';
      }
    }

    if (!trainingSessionsPerDay) {
      newErrors.trainingSessionsPerDay = 'Ingresa las sesiones de entrenamiento por día';
    } else {
      const sessionsDay = parseInt(trainingSessionsPerDay);
      if (isNaN(sessionsDay) || sessionsDay < 1) {
        newErrors.trainingSessionsPerDay = 'Mínimo 1 sesión por día';
      } else if (sessionsDay > 3) {
        newErrors.trainingSessionsPerDay = 'Máximo 3 sesiones por día';
      }
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsFormValid(valid);
    return valid;
  };

  useEffect(() => {
    validateForm();
    // Mostrar errores si hay alguno
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
    }
  }, [formData]);

  const handleInputChange = (field, value) => {
    // Validación en tiempo real para campos numéricos
    if (field === 'targetWeightKg' && value) {
      // Solo permitir números y un punto decimal
      const cleaned = value.replace(/[^0-9.]/g, '');
      // Limitar a máximo 3 dígitos enteros (máximo 500kg)
      if (cleaned.split('.')[0].length > 3) return;
      value = cleaned;
    } else if ((field === 'trainingSessionsPerWeek' || field === 'trainingSessionsPerDay') && value) {
      // Solo permitir números 1-9
      value = value.replace(/[^1-9]/g, '');
      // Solo un dígito
      if (value.length > 1) return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Mostrar errores si el usuario está escribiendo
    if (value && value.length > 0) {
      setShowErrors(true);
    }
  };

  // Formatear hora automáticamente (HH:mm)
  const handleTimeChange = (text) => {
    // Remover todo lo que no sea número
    const cleaned = text.replace(/[^0-9]/g, '');
    
    let formatted = cleaned;
    
    // Auto-formatear con dos puntos
    if (cleaned.length >= 3) {
      formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }
    
    // Limitar a 4 dígitos (HH:mm = 5 caracteres con el :)
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5);
    }
    
    setFormData(prev => ({ ...prev, weighInTime: formatted }));
    
    // Mostrar errores si el usuario está escribiendo
    if (formatted && formatted.length > 0) {
      setShowErrors(true);
    }
  };

  // Función para hacer scroll automático a una posición
  const scrollToPosition = (yOffset) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: yOffset,
        animated: true
      });
    }, 100);
  };

  const experienceOptions = [
    { label: 'Principiante', value: 'principiante' },
    { label: 'Amateur', value: 'amateur' },
    { label: 'Profesional', value: 'profesional' }
  ];

  const sportOptions = [
    { label: 'Boxeo', value: 'boxeo' },
    { label: 'MMA', value: 'mma' },
    { label: 'Muay Thai', value: 'muay-thai' },
    { label: 'Judo', value: 'judo' },
    { label: 'BJJ', value: 'bjj' },
    { label: 'Kickboxing', value: 'kickboxing' }
  ];

  const modelOptions = [
    { label: 'Gemini 2.5 Flash (Rápido)', value: 'gemini-2.5-flash-latest' },
    { label: 'Gemini 2.5 Pro (Detallado)', value: 'gemini-2.5-pro' }
  ];

  const IOSSelector = ({ options, selectedValue, onSelect, placeholder, modalVisible, setModalVisible }) => {
    const selectedOption = options.find(opt => opt.value === selectedValue);

    return (
      <>
        <TouchableOpacity
          style={styles.iosSelectorButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.iosSelectorText}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Text style={styles.iosSelectorArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar opción</Text>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      item.value === selectedValue && styles.selectedOption
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      item.value === selectedValue && styles.selectedOptionText
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  const handleAnalyze = async () => {
    setShowErrors(true);
    if (!validateForm()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);

    try {
      const requestBody = {
        currentWeightKg: parseFloat(userProfile.weight),
        targetWeightKg: parseFloat(formData.targetWeightKg),
        experienceLevel: formData.experienceLevel,
        combatSport: formData.combatSport,
        trainingSessionsPerWeek: parseInt(formData.trainingSessionsPerWeek),
        trainingSessionsPerDay: parseInt(formData.trainingSessionsPerDay),
        userHeight: parseFloat(userProfile.height),
        userAge: parseInt(userProfile.age),
        model: formData.model
      };

      // Agregar fechas como strings YYYY-MM-DD
      if (formData.startDate) {
        requestBody.startDate = formatDateForAPI(formData.startDate);
      }

      if (formData.weighInDate) {
        requestBody.weighInDate = formatDateForAPI(formData.weighInDate);
      }

      // Agregar hora del pesaje si existe
      if (formData.weighInTime) {
        requestBody.weighInTime = formData.weighInTime;
      }

      // Agregar daysToCut calculado en el frontend
      if (formData.daysToCut) {
        requestBody.daysToCut = parseInt(formData.daysToCut);
      }

      console.log('Sending request:', requestBody);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(WEIGHT_CUT_API.analyze, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Verificar el Content-Type de la respuesta
      const contentType = response.headers.get('content-type');
      console.log('Response status:', response.status);
      console.log('Response content-type:', contentType);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      // Verificar que la respuesta sea JSON
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Expected JSON but got:', textResponse.substring(0, 200));
        throw new Error('El servidor no devolvió un JSON válido. Por favor verifica el backend.');
      }

      const result = await response.json();
      console.log('API Response:', result);

      // Navigate to results screen
      navigation.navigate('WeightCutResults', {
        analysisResult: result,
        formData: {
          ...formData,
          currentWeightKg: userProfile.weight,
          userHeight: userProfile.height,
          userAge: userProfile.age
        }
      });

    } catch (error) {
      console.error('Error analyzing weight cut:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      let errorMessage = 'No se pudo analizar el plan de corte. Intenta nuevamente.';

      if (error.name === 'AbortError') {
        errorMessage = 'La petición tardó demasiado. Verifica tu conexión a internet.';
      } else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
        errorMessage = 'Error al procesar la respuesta del servidor. Por favor verifica que el backend esté funcionando correctamente y devolviendo JSON.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Datos inválidos. Verifica que el peso objetivo sea menor al actual.';
      } else if (error.message.includes('502') || error.message.includes('500')) {
        errorMessage = 'Error del servidor. Por favor intenta nuevamente en unos momentos.';
      } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet y que el servidor backend esté corriendo.';
      } else if (error.message.includes('JSON válido')) {
        errorMessage = error.message; // Usar el mensaje personalizado
      }

      Alert.alert('Error de análisis', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        useDynamicMessages={true}
        subtitle="Generando plan personalizado de corte de peso"
        messageInterval={2500}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={{ paddingTop: 18 }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {/* === PASO 1: OBJETIVO DEL CORTE (ALWAYS VISIBLE) === */}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>📊 Paso 1: Define tu Objetivo</Text>

          {/* Peso Actual (Read-only context) */}
          {userProfile && userProfile.weight && (
            <View style={styles.currentWeightBanner}>
              <Text style={styles.currentWeightLabel}>Tu Peso Actual</Text>
              <Text style={styles.currentWeightValue}>{userProfile.weight} kg</Text>
            </View>
          )}

          {/* Inputs principales */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Peso Objetivo (kg) *</Text>
            <TextInput
              ref={targetWeightRef}
              style={[styles.input, showErrors && errors.targetWeightKg && styles.inputError]}
              placeholder="Ej: 66"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.targetWeightKg}
              onChangeText={(value) => handleInputChange('targetWeightKg', value)}
              keyboardType="numeric"
            />
            {showErrors && errors.targetWeightKg && <Text style={styles.errorText}>{errors.targetWeightKg}</Text>}
          </View>

          {/* FECHA DE INICIO */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de Inicio del Plan *</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, showErrors && errors.startDate && styles.inputError]}
              onPress={() => {
                setShowStartDatePicker(true);
              }}
            >
              <Text style={[
                styles.datePickerText,
                !formData.startDate && styles.datePickerPlaceholder
              ]}>
                {formatDate(formData.startDate)}
              </Text>
              <Ionicons name="calendar" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            {showErrors && errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
          </View>

          {showStartDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal
                visible={showStartDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={handleStartDateCancel}
              >
                <View style={styles.datePickerModalOverlay}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={handleStartDateCancel}>
                        <Text style={styles.datePickerCancelButton}>Cancelar</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>Fecha de Inicio</Text>
                      <TouchableOpacity onPress={handleStartDateConfirm}>
                        <Text style={styles.datePickerDoneButton}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempStartDate || formData.startDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleStartDateChange}
                      minimumDate={new Date()}
                      textColor={COLORS.text}
                      themeVariant="dark"
                      style={styles.datePickerIOS}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={formData.startDate || new Date()}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                minimumDate={new Date()}
              />
            )
          )}

          {/* FECHA DEL PESAJE */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fecha del Pesaje Oficial *</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, showErrors && errors.weighInDate && styles.inputError]}
              onPress={() => {
                setShowWeighInDatePicker(true);
              }}
              disabled={!formData.startDate}
            >
              <Text style={[
                styles.datePickerText,
                !formData.weighInDate && styles.datePickerPlaceholder
              ]}>
                {formData.startDate ? formatDate(formData.weighInDate) : 'Primero selecciona fecha de inicio'}
              </Text>
              <Ionicons name="trophy" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
            {showErrors && errors.weighInDate && <Text style={styles.errorText}>{errors.weighInDate}</Text>}
            {!formData.startDate && (
              <Text style={styles.helperText}>
                Selecciona primero la fecha de inicio
              </Text>
            )}
          </View>

          {showWeighInDatePicker && formData.startDate && (
            Platform.OS === 'ios' ? (
              <Modal
                visible={showWeighInDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={handleWeighInDateCancel}
              >
                <View style={styles.datePickerModalOverlay}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={handleWeighInDateCancel}>
                        <Text style={styles.datePickerCancelButton}>Cancelar</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>Fecha del Pesaje</Text>
                      <TouchableOpacity onPress={handleWeighInDateConfirm}>
                        <Text style={styles.datePickerDoneButton}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempWeighInDate || formData.weighInDate || new Date(formData.startDate.getTime() + 7 * 24 * 60 * 60 * 1000)}
                      mode="date"
                      display="spinner"
                      onChange={handleWeighInDateChange}
                      minimumDate={new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000)}
                      textColor={COLORS.text}
                      themeVariant="dark"
                      style={styles.datePickerIOS}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={formData.weighInDate || new Date(formData.startDate.getTime() + 7 * 24 * 60 * 60 * 1000)}
                mode="date"
                display="default"
                onChange={handleWeighInDateChange}
                minimumDate={new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000)}
              />
            )
          )}

          {/* HORA DEL PESAJE (OBLIGATORIO) */}
          {formData.weighInDate && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Hora del Pesaje Oficial *</Text>
              <TextInput
                ref={weighInTimeRef}
                style={[styles.input, showErrors && errors.weighInTime && styles.inputError]}
                placeholder="Ej: 08:00, 14:30"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.weighInTime}
                onChangeText={handleTimeChange}
                keyboardType="number-pad"
                maxLength={5}
              />
              {showErrors && errors.weighInTime && <Text style={styles.errorText}>{errors.weighInTime}</Text>}
              <Text style={styles.helperText}>
                Solo números (ej: 0800, 1430). Los dos puntos se agregarán automáticamente.
              </Text>
            </View>
          )}

          {/* DÍAS CALCULADOS (Read-only) */}
          {formData.daysToCut && formData.daysToCut !== '' && (
            <View style={styles.calculatedDaysContainer}>
              <View style={styles.calculatedDaysIcon}>
                <Ionicons name="time" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.calculatedDaysContent}>
                <Text style={styles.calculatedDaysLabel}>Duración del Plan</Text>
                <Text style={styles.calculatedDaysValue}>{formData.daysToCut} días</Text>
              </View>
            </View>
          )}
        </View>

        {/* === PREVIEW SIMPLE (Solo aparece con datos válidos) === */}
        {formData.targetWeightKg && formData.daysToCut && !errors.targetWeightKg && !errors.daysToCut && (
          <View style={styles.smartPreviewSection}>
            <Text style={styles.smartPreviewTitle}>💡 Preview de tu Plan</Text>

            {/* Comparación visual simple */}
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonValue}>{userProfile.weight}</Text>
                <Text style={styles.comparisonLabel}>Actual</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={COLORS.secondary} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonValue}>{formData.targetWeightKg}</Text>
                <Text style={styles.comparisonLabel}>Objetivo</Text>
              </View>
              <View style={styles.comparisonDiff}>
                <Text style={styles.comparisonDiffValue}>-{calculateWeightDifference().kg}kg</Text>
                <Text style={styles.comparisonDiffPercent}>{calculateWeightDifference().percent}</Text>
              </View>
            </View>

            {/* Info simple */}
            <View style={styles.simpleInfoRow}>
              <View style={styles.simpleInfoItem}>
                <Text style={styles.simpleInfoLabel}>En {formData.daysToCut} días</Text>
                <Text style={[styles.simpleInfoValue, { color: getWeightCutType().color }]}>
                  Corte {getWeightCutType().type}
                </Text>
              </View>
            </View>

            <Text style={styles.aiNote}>
              La IA analizará la viabilidad y generará un plan detallado personalizado.
            </Text>
          </View>
        )}

        {/* === SPORT INFORMATION SECTION (Collapsible) === */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setIsSportInfoExpanded(!isSportInfoExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionHeaderTitle}>🥊 Información Deportiva</Text>
          <Ionicons
            name={isSportInfoExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={COLORS.secondary}
          />
        </TouchableOpacity>

        {isSportInfoExpanded && (
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nivel de Experiencia *</Text>
              {Platform.OS === 'ios' ? (
                <IOSSelector
                  options={experienceOptions}
                  selectedValue={formData.experienceLevel}
                  onSelect={(value) => handleInputChange('experienceLevel', value)}
                  placeholder="Seleccionar nivel"
                  modalVisible={showExperienceModal}
                  setModalVisible={setShowExperienceModal}
                />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.experienceLevel}
                    style={styles.picker}
                    onValueChange={(value) => handleInputChange('experienceLevel', value)}
                    dropdownIconColor={COLORS.secondary}
                  >
                    <Picker.Item label="Principiante" value="principiante" />
                    <Picker.Item label="Amateur" value="amateur" />
                    <Picker.Item label="Profesional" value="profesional" />
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Deporte de Combate *</Text>
              {Platform.OS === 'ios' ? (
                <IOSSelector
                  options={sportOptions}
                  selectedValue={formData.combatSport}
                  onSelect={(value) => handleInputChange('combatSport', value)}
                  placeholder="Seleccionar deporte"
                  modalVisible={showSportModal}
                  setModalVisible={setShowSportModal}
                />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.combatSport}
                    style={styles.picker}
                    onValueChange={(value) => handleInputChange('combatSport', value)}
                    dropdownIconColor={COLORS.secondary}
                  >
                    <Picker.Item label="Boxeo" value="boxeo" />
                    <Picker.Item label="MMA" value="mma" />
                    <Picker.Item label="Muay Thai" value="muay-thai" />
                    <Picker.Item label="Judo" value="judo" />
                    <Picker.Item label="BJJ" value="bjj" />
                    <Picker.Item label="Kickboxing" value="kickboxing" />
                  </Picker>
                </View>
              )}
            </View>
          </View>
        )}

        {/* === TRAINING INFORMATION SECTION (Collapsible) === */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setIsTrainingExpanded(!isTrainingExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionHeaderTitle}>💪 Entrenamiento</Text>
          <Ionicons
            name={isTrainingExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={COLORS.secondary}
          />
        </TouchableOpacity>

        {isTrainingExpanded && (
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sesiones por Semana (1-7) *</Text>
              <TextInput
                ref={sessionsPerWeekRef}
                style={[styles.input, showErrors && errors.trainingSessionsPerWeek && styles.inputError]}
                placeholder="Ej: 5"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.trainingSessionsPerWeek}
                onChangeText={(value) => handleInputChange('trainingSessionsPerWeek', value)}
                keyboardType="numeric"
              />
              {showErrors && errors.trainingSessionsPerWeek && <Text style={styles.errorText}>{errors.trainingSessionsPerWeek}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sesiones por Día (1-3) *</Text>
              <TextInput
                ref={sessionsPerDayRef}
                style={[styles.input, showErrors && errors.trainingSessionsPerDay && styles.inputError]}
                placeholder="Ej: 1"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.trainingSessionsPerDay}
                onChangeText={(value) => handleInputChange('trainingSessionsPerDay', value)}
                keyboardType="numeric"
              />
              {showErrors && errors.trainingSessionsPerDay && <Text style={styles.errorText}>{errors.trainingSessionsPerDay}</Text>}
            </View>
          </View>
        )}

        <Text style={styles.requiredNote}>* Campos obligatorios</Text>

        <TouchableOpacity
          style={[styles.analyzeButton, !isFormValid && styles.disabledButton]}
          onPress={handleAnalyze}
          disabled={!isFormValid}
        >
          <Text style={styles.analyzeButtonText}>Analizar Corte de Peso</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Este análisis no reemplaza la supervisión médica profesional.
          Consulta con profesionales de la salud antes de iniciar cualquier plan de corte de peso.
        </Text>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
    backgroundColor: COLORS.accent,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    padding: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary + '20',
    borderTopWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.primary,
    color: COLORS.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  pickerContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  picker: {
    color: COLORS.text,
    height: 50,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
  },
  requiredNote: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  analyzeButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  analyzeButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  // === STEP CARD STYLES (Input-First Pattern) ===
  stepCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    marginTop: 0,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.secondary + '40',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 16,
  },
  currentWeightBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  currentWeightLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  currentWeightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  // === SMART PREVIEW SECTION STYLES (Conditional) ===
  smartPreviewSection: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50' + '30',
  },
  smartPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  comparisonDiff: {
    backgroundColor: COLORS.secondary + '20',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  comparisonDiffValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  comparisonDiffPercent: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  simpleInfoRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  simpleInfoItem: {
    alignItems: 'center',
  },
  simpleInfoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  simpleInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  aiNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // === COLLAPSIBLE SECTION HEADER STYLES ===
  sectionHeader: {
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 16,
    marginTop: 12,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '20',
    borderBottomWidth: 0,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  // iOS-specific selector styles
  iosSelectorButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  iosSelectorText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  iosSelectorArrow: {
    color: COLORS.secondary,
    fontSize: 12,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: COLORS.primary,
  },
  selectedOption: {
    backgroundColor: COLORS.secondary,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  // Date Picker Styles
  datePickerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: COLORS.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  calculatedDaysContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  calculatedDaysIcon: {
    marginRight: 12,
  },
  calculatedDaysContent: {
    flex: 1,
  },
  calculatedDaysLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  calculatedDaysValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  // iOS Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  datePickerCancelButton: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  datePickerDoneButton: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  datePickerIOS: {
    backgroundColor: COLORS.accent,
    height: 200,
  },
});