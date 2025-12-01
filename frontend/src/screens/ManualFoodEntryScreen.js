import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ManualFoodEntryScreen({ navigation }) {
  const [foodName, setFoodName] = useState('');
  const [foodType, setFoodType] = useState('comida');
  const [portionType, setPortionType] = useState('mediana');
  const [portionGrams, setPortionGrams] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const foodTypes = [
    { value: 'comida', label: 'Comida', icon: 'restaurant' },
    { value: 'bebida', label: 'Bebida', icon: 'water' },
    { value: 'snack', label: 'Snack', icon: 'fast-food' },
    { value: 'postre', label: 'Postre', icon: 'ice-cream' }
  ];

  const portionTypes = [
    { value: 'pequeña', label: 'Pequeña', description: '~150g' },
    { value: 'mediana', label: 'Mediana', description: '~250g' },
    { value: 'grande', label: 'Grande', description: '~400g' },
    { value: 'gramos', label: 'Gramos', description: 'Especificar' }
  ];

  const handleAnalyze = async () => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del alimento');
      return;
    }

    if (portionType === 'gramos' && (!portionGrams || parseFloat(portionGrams) <= 0)) {
      Alert.alert('Error', 'Por favor ingresa los gramos');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        foodName: foodName.trim(),
        foodType,
        portionType,
        model: 'gemini-2.5-flash'
      };

      if (portionType === 'gramos') {
        payload.portionGrams = parseFloat(portionGrams);
      }

      const response = await fetch(
        'https://vgx997rty0.execute-api.us-east-1.amazonaws.com/prod/api/nutrition/analyze-manual',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if (response.status === 500) {
          Alert.alert(
            'Servicio Temporalmente Saturado',
            'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
            [{ text: 'Entendido' }]
          );
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Navegar a resultados con los mismos parámetros que el análisis por imagen
      navigation.navigate('NutritionResults', {
        analysisResult: result,
        selectedImage: null // No hay imagen en registro manual
      });
    } catch (error) {
      console.error('Error analyzing manual nutrition:', error);
      
      if (error.message && error.message.includes('500')) {
        Alert.alert(
          'Servicio Temporalmente Saturado',
          'El modelo de IA está procesando muchas solicitudes en este momento. Por favor, intenta nuevamente en unos minutos.',
          [{ text: 'Entendido' }]
        );
      } else {
        Alert.alert(
          'Error de análisis',
          'No se pudo analizar el alimento. Intenta nuevamente.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro Manual</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Ingresa los detalles del alimento y la IA estimará su información nutricional
        </Text>

        {/* Nombre del alimento */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre del alimento *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Pechuga de pollo a la plancha"
            placeholderTextColor={COLORS.textSecondary}
            value={foodName}
            onChangeText={setFoodName}
            autoCapitalize="words"
          />
        </View>

        {/* Tipo de alimento */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de alimento</Text>
          <View style={styles.optionsGrid}>
            {foodTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionCard,
                  foodType === type.value && styles.optionCardActive
                ]}
                onPress={() => setFoodType(type.value)}
              >
                <Ionicons
                  name={type.icon}
                  size={32}
                  color={foodType === type.value ? COLORS.secondary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    foodType === type.value && styles.optionLabelActive
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tamaño de porción */}
        <View style={styles.section}>
          <Text style={styles.label}>Tamaño de porción</Text>
          {portionTypes.map((portion) => (
            <TouchableOpacity
              key={portion.value}
              style={[
                styles.portionOption,
                portionType === portion.value && styles.portionOptionActive
              ]}
              onPress={() => setPortionType(portion.value)}
            >
              <View style={styles.portionOptionContent}>
                <Text
                  style={[
                    styles.portionLabel,
                    portionType === portion.value && styles.portionLabelActive
                  ]}
                >
                  {portion.label}
                </Text>
                <Text style={styles.portionDescription}>{portion.description}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  portionType === portion.value && styles.radioActive
                ]}
              >
                {portionType === portion.value && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}

          {/* Input de gramos si eligió "gramos" */}
          {portionType === 'gramos' && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Ingresa los gramos"
              placeholderTextColor={COLORS.textSecondary}
              value={portionGrams}
              onChangeText={setPortionGrams}
              keyboardType="numeric"
            />
          )}
        </View>

        {/* Botón de analizar */}
        <TouchableOpacity
          style={[styles.analyzeButton, isLoading && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.gloveSpinner}>🥊</Text>
          ) : (
            <>
              <Ionicons name="analytics" size={24} color={COLORS.primary} />
              <Text style={styles.analyzeButtonText}>Analizar Alimento</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          💡 La IA estimará los valores nutricionales basándose en bases de datos estándar
        </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 25,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  optionLabelActive: {
    color: COLORS.secondary,
  },
  portionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  portionOptionActive: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.primary,
  },
  portionOptionContent: {
    flex: 1,
  },
  portionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  portionLabelActive: {
    color: COLORS.secondary,
  },
  portionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: COLORS.secondary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  analyzeButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
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
});
