import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WeightInputModal({ visible, onClose, onSubmit, loading, currentDay }) {
  const [weight, setWeight] = useState('');

  const handleSubmit = () => {
    const weightValue = parseFloat(weight);

    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 300) {
      return;
    }

    onSubmit(weightValue);
    setWeight('');
  };

  const handleClose = () => {
    setWeight('');
    onClose();
  };

  const isValid = weight && parseFloat(weight) > 0 && parseFloat(weight) <= 300;

  // Calcular el mensaje contextual
  const getContextualMessage = () => {
    if (!currentDay) {
      return {
        title: 'Registrar Peso del Día',
        subtitle: 'Peso al despertar (en ayunas)',
        info: '📅 Este valor sobrescribirá el peso del día'
      };
    }

    if (currentDay === 1) {
      return {
        title: 'Registrar Peso Inicial',
        subtitle: 'Peso de inicio del plan',
        info: '🎯 Este será tu peso base del Día 1'
      };
    }

    return {
      title: 'Registrar Peso Matutino',
      subtitle: 'Peso al despertar (en ayunas)',
      info: `📊 Este peso refleja el resultado del Día ${currentDay - 1}`
    };
  };

  const contextualMessage = getContextualMessage();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>{contextualMessage.title}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.subtitle}>{contextualMessage.subtitle}</Text>
              <Text style={styles.info}>{contextualMessage.info}</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="74.5"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  autoFocus
                />
                <Text style={styles.unitLabel}>kg</Text>
              </View>

              {isValid && (
                <View style={styles.summaryBox}>
                  <Ionicons name="scale" size={24} color={COLORS.secondary} />
                  <Text style={styles.summaryText}>
                    Peso registrado:{' '}
                    <Text style={styles.summaryAmount}>
                      {parseFloat(weight).toFixed(1)}kg
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || loading}
              >
                {loading ? (
                  <Text style={styles.gloveSpinner}>🥊</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.submitButtonText}>Registrar Peso</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingVertical: 20,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  summaryAmount: {
    fontWeight: 'bold',
    color: COLORS.secondary,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  submitButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#888',
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
