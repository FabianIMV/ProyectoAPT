import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { addMealProgress } from '../services/progressService';
import { WEIGHT_CUT_API } from '../config/api';

export default function NutritionResultsScreen({ route, navigation }) {
  const { analysisResult, selectedImage } = route.params;
  const { userId } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleNewAnalysis = () => {
    navigation.goBack();
  };

  const calculateCurrentDay = (startDate, totalDays) => {
    const start = new Date(startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const dayIndex = Math.floor((today - start) / (1000 * 60 * 60 * 24));

    if (dayIndex < 0) return null;
    if (dayIndex >= totalDays) return 'completed';

    return dayIndex + 1; // 1-indexed
  };

  const handleSaveToProgress = async () => {
    if (!userId) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    setSaving(true);

    try {
      // Obtener timeline activo
      const timelineResponse = await fetch(WEIGHT_CUT_API.getTimeline(userId));

      if (!timelineResponse.ok) {
        Alert.alert(
          'Timeline Requerido',
          'Necesitas activar un timeline para registrar tu progreso nutricional'
        );
        return;
      }

      const timelineData = await timelineResponse.json();
      const timeline = timelineData.data;

      if (!timeline) {
        Alert.alert('Error', 'No se encontró un timeline activo');
        return;
      }

      const currentDay = calculateCurrentDay(timeline.start_date, timeline.total_days);

      if (currentDay === 'completed' || currentDay === null) {
        Alert.alert('Plan Completado', 'Tu plan de corte ha finalizado');
        return;
      }

      // Extraer datos nutricionales del análisis
      const mealData = {
        calories: analysisResult.calorias || 0,
        proteinGrams: analysisResult.macronutrientes?.proteinas || 0,
        carbsGrams: analysisResult.macronutrientes?.carbohidratos || 0,
        fatsGrams: analysisResult.macronutrientes?.grasas || 0,
        mealName: analysisResult.nombre || 'Comida',
      };

      const result = await addMealProgress(
        userId,
        timeline.id,
        currentDay,
        mealData
      );

      if (result.success) {
        Alert.alert(
          'Guardado',
          `${mealData.mealName} registrado en tu progreso del día ${currentDay}`,
          [
            {
              text: 'Ver Dashboard',
              onPress: () => navigation.navigate('Dashboard'),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar el progreso');
      }
    } catch (error) {
      console.error('Error guardando progreso nutricional:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el progreso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Resultado del Análisis</Text>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          </View>
        )}

        <View style={styles.resultCard}>
          <Text style={styles.foodName}>{analysisResult.nombre}</Text>
          <Text style={styles.confidence}>
            Confianza: {analysisResult.confianza_analisis}%
          </Text>
        </View>

        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Calorías</Text>
            <Text style={styles.nutritionValue}>{analysisResult.calorias}</Text>
          </View>

          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Peso (g)</Text>
            <Text style={styles.nutritionValue}>{analysisResult.peso_estimado_gramos}</Text>
          </View>
        </View>

        <View style={styles.macrosContainer}>
          <Text style={styles.macrosTitle}>Macronutrientes</Text>

          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>Carbohidratos:</Text>
            <Text style={styles.macroValue}>{analysisResult.macronutrientes.carbohidratos}g</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>Proteínas:</Text>
            <Text style={styles.macroValue}>{analysisResult.macronutrientes.proteinas}g</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>Grasas:</Text>
            <Text style={styles.macroValue}>{analysisResult.macronutrientes.grasas}g</Text>
          </View>
        </View>

        {analysisResult.ingredientes && analysisResult.ingredientes.length > 0 && (
          <View style={styles.ingredientsContainer}>
            <Text style={styles.ingredientsTitle}>Ingredientes detectados</Text>
            {analysisResult.ingredientes.map((ingredient, index) => (
              <Text key={index} style={styles.ingredient}>- {ingredient}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveToProgress}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar en Progreso Diario</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.newAnalysisButton} onPress={handleNewAnalysis}>
          <Text style={styles.newAnalysisButtonText}>Analizar otra imagen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: 250,
    height: 250,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: COLORS.secondary,
  },
  resultCard: {
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  foodName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confidence: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  nutritionItem: {
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 120,
  },
  nutritionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  macrosContainer: {
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  macrosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  macroItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  macroLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ingredientsContainer: {
    backgroundColor: COLORS.accent,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  ingredient: {
    fontSize: 16,
    color: COLORS.textSecondary,
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  saveButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  newAnalysisButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  newAnalysisButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});