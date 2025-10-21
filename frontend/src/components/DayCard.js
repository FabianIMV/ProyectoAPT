import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

export default function DayCard({ day }) {
  const isPartialDay = day.isPartialDay || false;

  return (
    <View style={[styles.card, isPartialDay && styles.partialDayCard]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dayNumber}>Día {day.day}</Text>
          <Text style={styles.date}>{day.date}</Text>
        </View>

        {isPartialDay && (
          <View style={styles.partialBadge}>
            <Text style={styles.badgeText}>⚖️ DÍA DE PESAJE</Text>
          </View>
        )}
      </View>

      {isPartialDay && day.duration && (
        <View style={styles.durationContainer}>
          <Text style={styles.duration}>{day.duration}</Text>
        </View>
      )}

      {/* Fase */}
      <View style={styles.phaseContainer}>
        <Text style={[styles.phase, styles[`phase${day.phase}`]]}>
          {day.phase}
        </Text>
        <Text style={styles.phaseReference}>{day.phaseReference}</Text>
      </View>

      {/* Targets */}
      <View style={styles.targetsContainer}>
        <Text style={styles.sectionTitle}>Objetivos del día</Text>
        <View style={styles.targetsGrid}>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Peso</Text>
            <Text style={styles.targetValue}>{day.targets.weightKg}kg</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Calorías</Text>
            <Text style={styles.targetValue}>{day.targets.caloriesIntake}</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Agua</Text>
            <Text style={styles.targetValue}>{day.targets.waterIntakeLiters}L</Text>
          </View>
        </View>

        {day.targets.cardioMinutes > 0 && (
          <View style={styles.cardioInfo}>
            <Text style={styles.cardioText}>
              🏃 Cardio: {day.targets.cardioMinutes} min
              {day.targets.saunaSuitRequired && ' (con traje sauna)'}
            </Text>
          </View>
        )}
      </View>

      {/* Macros */}
      <View style={styles.macrosContainer}>
        <Text style={styles.sectionTitle}>Macronutrientes</Text>
        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{day.targets.macros.proteinGrams}g</Text>
            <Text style={styles.macroLabel}>Proteínas</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{day.targets.macros.carbGrams}g</Text>
            <Text style={styles.macroLabel}>Carbohidratos</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{day.targets.macros.fatGrams}g</Text>
            <Text style={styles.macroLabel}>Grasas</Text>
          </View>
        </View>
      </View>

      {/* Instrucciones especiales si es día parcial */}
      {isPartialDay && day.recommendations.wakeUpTime && (
        <View style={styles.weighInInstructions}>
          <Text style={styles.instructionsTitle}>
            ⚖️ Instrucciones del Día de Pesaje
          </Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>
              • Despertar: <Text style={styles.instructionValue}>{day.recommendations.wakeUpTime}</Text>
            </Text>
            <Text style={styles.instructionItem}>
              • Última agua: <Text style={styles.instructionValue}>{day.recommendations.wakeUpTime}</Text>
            </Text>
            {day.recommendations.finalWeightCheck && (
              <Text style={styles.instructionItem}>
                • Chequeo en casa: <Text style={styles.instructionValue}>{day.recommendations.finalWeightCheck}</Text>
              </Text>
            )}
            {day.recommendations.bathroomTiming && (
              <Text style={styles.instructionItem}>
                • Ir al baño: <Text style={styles.instructionValue}>{day.recommendations.bathroomTiming}</Text>
              </Text>
            )}
            {day.weighInTime && (
              <Text style={styles.instructionItem}>
                • Pesaje oficial: <Text style={styles.instructionValue}>{day.weighInTime}</Text>
              </Text>
            )}
          </View>
          {day.recommendations.clothingNote && (
            <Text style={styles.clothingNote}>
              👕 {day.recommendations.clothingNote}
            </Text>
          )}
        </View>
      )}

      {/* Warnings */}
      {day.warnings && day.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsTitle}>⚠️ Alertas Importantes</Text>
          {day.warnings.map((warning, idx) => (
            <Text key={idx} style={styles.warningItem}>{warning}</Text>
          ))}
        </View>
      )}

      {/* Recomendaciones normales */}
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>Recomendaciones</Text>

        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationLabel}>🍽️ Nutrición:</Text>
          <Text style={styles.recommendationText}>{day.recommendations.nutritionFocus}</Text>
        </View>

        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationLabel}>💧 Hidratación:</Text>
          <Text style={styles.recommendationText}>{day.recommendations.hydrationNote}</Text>
        </View>

        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationLabel}>🏃 Entrenamiento:</Text>
          <Text style={styles.recommendationText}>{day.recommendations.trainingNote}</Text>
        </View>

        {day.recommendations.mealTiming && (
          <View style={styles.recommendationItem}>
            <Text style={styles.recommendationLabel}>⏰ Timing:</Text>
            <Text style={styles.recommendationText}>{day.recommendations.mealTiming}</Text>
          </View>
        )}

        {day.recommendations.sleepRecommendation && (
          <View style={styles.recommendationItem}>
            <Text style={styles.recommendationLabel}>😴 Descanso:</Text>
            <Text style={styles.recommendationText}>{day.recommendations.sleepRecommendation}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  partialDayCard: {
    borderWidth: 3,
    borderColor: COLORS.secondary,
    backgroundColor: '#FFFAF0', // Tono especial para día parcial
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  partialBadge: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  durationContainer: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  duration: {
    color: '#856404',
    fontWeight: '600',
    fontSize: 14,
  },
  phaseContainer: {
    marginBottom: 15,
  },
  phase: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  phaseINITIAL: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  phaseDEPLETION: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  phaseWATER_CUT: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  phaseFINAL: {
    backgroundColor: '#F3E5F5',
    color: '#7B1FA2',
  },
  phaseReference: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  targetsContainer: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  targetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  cardioInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  cardioText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  macrosContainer: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  weighInInstructions: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
    color: '#856404',
  },
  instructionsList: {
    marginBottom: 10,
  },
  instructionItem: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 6,
    lineHeight: 20,
  },
  instructionValue: {
    fontWeight: 'bold',
  },
  clothingNote: {
    fontSize: 13,
    color: '#856404',
    fontStyle: 'italic',
    marginTop: 8,
  },
  warningsContainer: {
    backgroundColor: '#F8D7DA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  warningsTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 10,
    color: '#721C24',
  },
  warningItem: {
    color: '#721C24',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  recommendationsContainer: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
  },
  recommendationItem: {
    marginBottom: 12,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
