import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { validateWaterIntake } from '../utils/validationHelpers';

const { width } = Dimensions.get('window');

export default function WaterIntakeModal({ visible, onClose, onSubmit, loading }) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  const presetAmounts = [
    { label: '100ml', value: 100, icon: '💧' },
    { label: '250ml', value: 250, icon: '🥤' },
    { label: '500ml', value: 500, icon: '🧃' },
    { label: '750ml', value: 750, icon: '🍶' },
    { label: '1L', value: 1000, icon: '💦' },
    { label: '1.5L', value: 1500, icon: '🚰' },
  ];

  const handlePresetSelect = (amount) => {
    setSelectedPreset(amount);
    setCustomAmount('');
  };

  const handleSubmit = () => {
    const amount = selectedPreset || parseInt(customAmount);

    // Validate water intake using validation helper
    const validation = validateWaterIntake(amount);

    if (!validation.isValid) {
      Alert.alert('Validación de Agua', validation.message);
      return;
    }

    onSubmit(validation.sanitizedValue);
    setCustomAmount('');
    setSelectedPreset(null);
  };

  const handleClose = () => {
    setCustomAmount('');
    setSelectedPreset(null);
    onClose();
  };

  const isValid = selectedPreset > 0 || (customAmount && parseInt(customAmount) > 0);

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
      >
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Registrar Consumo de Agua</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Cantidades Rápidas</Text>
            <View style={styles.presetsGrid}>
              {presetAmounts.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.presetButton,
                    selectedPreset === preset.value && styles.presetButtonSelected
                  ]}
                  onPress={() => handlePresetSelect(preset.value)}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text
                    style={[
                      styles.presetLabel,
                      selectedPreset === preset.value && styles.presetLabelSelected
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>O ingresa una cantidad personalizada</Text>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder="Ej: 350"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedPreset(null);
                }}
              />
              <Text style={styles.unitLabel}>ml</Text>
            </View>

            {isValid && (
              <View style={styles.summaryBox}>
                <Ionicons name="water" size={24} color={COLORS.secondary} />
                <Text style={styles.summaryText}>
                  Se registrarán{' '}
                  <Text style={styles.summaryAmount}>
                    {selectedPreset || parseInt(customAmount)}ml
                  </Text>
                  {' '}de agua
                </Text>
              </View>
            )}
          </ScrollView>

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
                  <Text style={styles.submitButtonText}>Registrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  modalContainer: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '80%',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  presetButton: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetButtonSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  presetIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  presetLabelSelected: {
    color: 'white',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingVertical: 20,
  },
  unitLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
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
