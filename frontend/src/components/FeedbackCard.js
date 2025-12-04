import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const FeedbackCard = ({ feedback, userName }) => {
  if (!feedback) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return '#4CAF50';
      case 'info': return '#2196F3';
      case 'warning': return '#FF9800';
      case 'danger': return '#F44336';
      default: return COLORS.secondary;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success': return 'checkmark-circle';
      case 'info': return 'information-circle';
      case 'warning': return 'warning';
      case 'danger': return 'close-circle';
      default: return 'bulb';
    }
  };

  const getHumanizedPhaseName = (phase) => {
    if (!phase) return '';
    
    const phaseNames = {
      'SEVERE_DEPLETION': 'Depleción Severa',
      'MODERATE_DEPLETION': 'Depleción Moderada',
      'MILD_DEPLETION': 'Depleción Ligera',
      'WATER_CUT': 'Corte de Agua',
      'CARB_LOADING': 'Carga de Carbohidratos',
      'MAINTENANCE': 'Mantenimiento',
      'RECOVERY': 'Recuperación'
    };
    
    return phaseNames[phase] || phase;
  };

  const severityColor = getSeverityColor(feedback.severity);
  const displayName = userName || 'Atleta';

  return (
    <View style={styles.container}>
      {/* Header con Status */}
      <View style={[styles.header, { borderLeftColor: severityColor }]}>
        <View style={styles.statusContainer}>
          <Ionicons name={getSeverityIcon(feedback.severity)} size={32} color={severityColor} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.greeting}>Hola {displayName},</Text>
            <Text style={[styles.status, { color: severityColor }]}>
              {feedback.status || feedback.title}
            </Text>
          </View>
        </View>
      </View>

      {/* Mensaje Principal */}
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{feedback.message}</Text>
      </View>

      {/* Score de Compliance */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>Cumplimiento del día</Text>
          <Text style={[styles.scoreValue, { color: severityColor }]}>
            {feedback.complianceScore}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${feedback.complianceScore}%`,
                backgroundColor: severityColor
              }
            ]}
          />
        </View>
      </View>

      {/* Acciones (antes eran recommendations + nextSteps) */}
      {feedback.actions && feedback.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Qué hacer ahora</Text>
          {feedback.actions.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <View style={[styles.actionBullet, { backgroundColor: severityColor }]} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Próxima Comida */}
      {feedback.nextMeal && (
        <View style={styles.nextMealContainer}>
          <View style={styles.nextMealHeader}>
            <Ionicons name="restaurant" size={20} color={COLORS.secondary} />
            <Text style={styles.nextMealTitle}>Próxima comida</Text>
          </View>
          <Text style={styles.nextMealText}>{feedback.nextMeal}</Text>
        </View>
      )}

      {/* Motivación */}
      {feedback.motivation && (
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>{feedback.motivation}</Text>
        </View>
      )}

      {/* Metadata */}
      {feedback.metadata && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            Día {feedback.metadata.dayNumber} de {feedback.metadata.totalDays}
            {feedback.metadata.phase && ` • ${getHumanizedPhaseName(feedback.metadata.phase)}`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  status: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  scoreContainer: {
    marginBottom: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  actionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 12,
  },
  actionText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    flex: 1,
  },
  nextMealContainer: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  nextMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextMealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 8,
  },
  nextMealText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  motivationContainer: {
    backgroundColor: COLORS.primary + '80',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.secondary,
  },
  motivationText: {
    fontSize: 15,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  metadataContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    paddingTop: 12,
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default FeedbackCard;
