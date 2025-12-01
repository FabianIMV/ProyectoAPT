import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';

const { width } = Dimensions.get('window');

export default function ActivePlanDetailsScreen({ route, navigation }) {
  const { activePlan } = route.params;
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  const [isDeactivating, setIsDeactivating] = useState(false);

  const analysisResult = activePlan.analysis_response;
  const formData = activePlan.analysis_request;

  const handleDeactivatePlan = async () => {
    Alert.alert(
      'Desactivar Plan',
      '¿Estás seguro que deseas desactivar este plan de corte? Podrás verlo en el historial.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            setIsDeactivating(true);
            try {
              Alert.alert(
                'Plan Desactivado',
                'El plan ha sido movido al historial',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Dashboard')
                  }
                ]
              );
            } catch (error) {
              console.error('❌ Error desactivando plan:', error);
              Alert.alert('Error', 'No se pudo desactivar el plan');
            } finally {
              setIsDeactivating(false);
            }
          }
        }
      ]
    );
  };

  const showInfoModal = (title, content) => {
    setModalContent({ title, content });
    setModalVisible(true);
  };

  const getInfoContent = (type) => {
    switch (type) {
      case 'tdee':
        return {
          title: 'TDEE Estimado',
          content: 'El TDEE (Total Daily Energy Expenditure) es la cantidad total de calorías que tu cuerpo quema en un día, incluyendo el metabolismo basal, la actividad física y la digestión. Es fundamental para el corte de peso porque nos permite calcular el déficit calórico necesario para perder peso de manera efectiva y segura.'
        };
      case 'deficit':
        return {
          title: 'Déficit Objetivo',
          content: 'El déficit calórico es la diferencia entre las calorías que consumes y las que quemas. Para perder peso, necesitas estar en déficit calórico. Un déficit moderado (300-500 cal/día) es más sostenible, mientras que déficits agresivos (500+ cal/día) permiten pérdida de peso más rápida pero requieren mayor cuidado.'
        };
      case 'duration':
        return {
          title: 'Duración del Plan',
          content: 'La duración del plan de corte de peso está calculada en base a tus objetivos y la cantidad de peso a perder. Planes más cortos requieren déficits más agresivos y mayor disciplina, mientras que planes más largos permiten un enfoque más gradual y sostenible.'
        };
      case 'weightLoss':
        return {
          title: 'Peso a Perder',
          content: 'Esta es la cantidad total de peso que necesitas perder para alcanzar tu objetivo. Incluye tanto grasa como agua corporal. Es importante recordar que no todo el peso perdido será grasa, especialmente en las primeras etapas del corte donde se pierde mucha agua.'
        };
      default:
        return { title: '', content: '' };
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Resumen del Plan</Text>
        <View style={styles.summaryGrid}>
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => {
              const info = getInfoContent('weightLoss');
              showInfoModal(info.title, info.content);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryIcon}>⚖️</Text>
            <Text style={styles.summaryLabel}>Peso a perder</Text>
            <Text style={styles.summaryValue}>{analysisResult.actionPlan.summary.totalWeightToCutKg} kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => {
              const info = getInfoContent('tdee');
              showInfoModal(info.title, info.content);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryIcon}>🔥</Text>
            <Text style={styles.summaryLabel}>TDEE estimado</Text>
            <Text style={styles.summaryValue}>{analysisResult.actionPlan.summary.estimatedTDEE}</Text>
            <Text style={styles.summaryUnit}>calorías</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => {
              const info = getInfoContent('deficit');
              showInfoModal(info.title, info.content);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryIcon}>🎯</Text>
            <Text style={styles.summaryLabel}>Déficit objetivo</Text>
            <Text style={styles.summaryValue}>{analysisResult.actionPlan.summary.targetDeficitCalories}</Text>
            <Text style={styles.summaryUnit}>cal/día</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.summaryItem}
            onLongPress={() => {
              const info = getInfoContent('duration');
              showInfoModal(info.title, info.content);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryIcon}>📅</Text>
            <Text style={styles.summaryLabel}>Duración</Text>
            <Text style={styles.summaryValue}>{formData.daysToCut}</Text>
            <Text style={styles.summaryUnit}>días</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskBadge}>{getRiskIcon(analysisResult.riskAnalysis.riskCode)}</Text>
          <View style={styles.riskTitleContainer}>
            <Text style={styles.riskLevel}>{getRiskLabel(analysisResult.riskAnalysis.riskCode)}</Text>
            <Text style={styles.riskSubtitle}>Nivel de Riesgo</Text>
          </View>
        </View>
        <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(analysisResult.riskAnalysis.riskCode) }]} />
        <Text style={styles.riskTitle}>{analysisResult.riskAnalysis.title}</Text>
        <Text style={styles.riskDescription}>{analysisResult.riskAnalysis.description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Información del Plan</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Creado:</Text>
          <Text style={styles.infoValue}>{formatDate(activePlan.created_at)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Deporte:</Text>
          <Text style={styles.infoValue}>{formData.combatSport}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nivel:</Text>
          <Text style={styles.infoValue}>{formData.experienceLevel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modelo IA:</Text>
          <Text style={styles.infoValue}>{getModelLabel(analysisResult.modelUsed)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Confianza:</Text>
          <Text style={styles.infoValue}>{analysisResult.analysisConfidence}%</Text>
        </View>
      </View>
    </View>
  );

  const renderNutritionTab = () => (
    <View style={styles.tabContent}>
      {analysisResult.actionPlan.nutritionPlan.map((phase, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.phaseTitle}>{phase.phase}</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calorías</Text>
              <Text style={styles.nutritionValue}>{phase.calories}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Proteínas</Text>
              <Text style={styles.nutritionValue}>{phase.macronutrients.proteinGrams}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbohidratos</Text>
              <Text style={styles.nutritionValue}>{phase.macronutrients.carbGrams}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Grasas</Text>
              <Text style={styles.nutritionValue}>{phase.macronutrients.fatGrams}g</Text>
            </View>
          </View>
          <Text style={styles.phaseInstructions}>{phase.instructions}</Text>
        </View>
      ))}
    </View>
  );

  const renderHydrationTab = () => (
    <View style={styles.tabContent}>
      {analysisResult.actionPlan.hydrationPlan.map((phase, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.phaseTitle}>{phase.phase}</Text>
          <View style={styles.hydrationHeader}>
            <Text style={styles.hydrationAmount}>{phase.dailyIntakeLiters}L</Text>
            <Text style={styles.hydrationLabel}>por día</Text>
          </View>
          <Text style={styles.phaseInstructions}>{phase.instructions}</Text>
        </View>
      ))}
    </View>
  );

  const renderCardioTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plan de Cardio</Text>

        <View style={styles.cardioInfo}>
          <Text style={styles.cardioLabel}>Actividad:</Text>
          <Text style={styles.cardioValue}>{analysisResult.actionPlan.cardioPlan.session.activity}</Text>
        </View>

        <View style={styles.cardioInfo}>
          <Text style={styles.cardioLabel}>Duración:</Text>
          <Text style={styles.cardioValue}>{analysisResult.actionPlan.cardioPlan.session.durationMinutes} minutos</Text>
        </View>

        <View style={styles.cardioInfo}>
          <Text style={styles.cardioLabel}>Intensidad:</Text>
          <Text style={styles.cardioValue}>{analysisResult.actionPlan.cardioPlan.session.intensity}</Text>
        </View>

        <View style={styles.cardioInfo}>
          <Text style={styles.cardioLabel}>Traje de sauna:</Text>
          <Text style={styles.cardioValue}>{analysisResult.actionPlan.cardioPlan.saunaSuitRequired ? 'Requerido' : 'No requerido'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Horarios recomendados:</Text>
        <Text style={styles.phaseInstructions}>{analysisResult.actionPlan.cardioPlan.timing}</Text>

        <Text style={styles.sectionTitle}>Instrucciones:</Text>
        <Text style={styles.phaseInstructions}>{analysisResult.actionPlan.cardioPlan.instructions}</Text>
      </View>
    </View>
  );

  const renderRecommendationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recomendaciones Específicas del Deporte</Text>
        {analysisResult.actionPlan.sportSpecificRecommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.disclaimerTitle}>Descargo de Responsabilidad</Text>
        <Text style={styles.disclaimerText}>{analysisResult.actionPlan.disclaimer}</Text>
      </View>
    </View>
  );

  const getRiskColor = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return '#4CAF50';
      case 'MODERATE': return '#FF9800';
      case 'AGGRESSIVE': return '#FF5722';
      case 'DANGEROUS': return '#F44336';
      default: return COLORS.accent;
    }
  };

  const getRiskIcon = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return '✅';
      case 'MODERATE': return '⚠️';
      case 'AGGRESSIVE': return '🔴';
      case 'DANGEROUS': return '💀';
      default: return '❓';
    }
  };

  const getRiskLabel = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return 'Bajo Riesgo';
      case 'MODERATE': return 'Riesgo Moderado';
      case 'AGGRESSIVE': return 'Riesgo Agresivo';
      case 'DANGEROUS': return 'Riesgo Peligroso';
      default: return riskCode;
    }
  };

  const getModelLabel = (modelUsed) => {
    if (modelUsed.includes('flash')) return 'Gemini Flash';
    if (modelUsed.includes('pro')) return 'Gemini Pro';
    return modelUsed;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { key: 'overview', label: 'Resumen', icon: 'stats-chart' },
    { key: 'nutrition', label: 'Nutrición', icon: 'nutrition' },
    { key: 'hydration', label: 'Hidratación', icon: 'water' },
    { key: 'cardio', label: 'Cardio', icon: 'bicycle' },
    { key: 'recommendations', label: 'Consejos', icon: 'bulb' },
  ];

  const getCurrentTabIndex = () => {
    return tabs.findIndex(tab => tab.key === activeTab);
  };

  const handleTabChange = (direction) => {
    const currentIndex = getCurrentTabIndex();
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < tabs.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }
    
    setActiveTab(tabs[newIndex].key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Activo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBarContainer}>
        {/* Tab Navigation Counter and Hint */}
        <View style={styles.tabNavigationInfo}>
          <View style={styles.tabCounter}>
            <Text style={styles.tabCounterText}>
              {getCurrentTabIndex() + 1} de {tabs.length}
            </Text>
          </View>
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-back" size={14} color={COLORS.secondary} />
            <Text style={styles.swipeHintText}>Desliza para navegar</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.secondary} />
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {/* Left Arrow */}
          {getCurrentTabIndex() > 0 && (
            <TouchableOpacity
              style={styles.tabArrowLeft}
              onPress={() => handleTabChange('prev')}
              activeOpacity={0.7}
              accessibilityLabel="Tab anterior"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
            bounces={false}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                accessibilityLabel={`Tab ${tab.label}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.key }}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Right Arrow */}
          {getCurrentTabIndex() < tabs.length - 1 && (
            <TouchableOpacity
              style={styles.tabArrowRight}
              onPress={() => handleTabChange('next')}
              activeOpacity={0.7}
              accessibilityLabel="Siguiente tab"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'nutrition' && renderNutritionTab()}
        {activeTab === 'hydration' && renderHydrationTab()}
        {activeTab === 'cardio' && renderCardioTab()}
        {activeTab === 'recommendations' && renderRecommendationsTab()}

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.deactivateButton, isDeactivating && styles.disabledButton]}
            onPress={handleDeactivatePlan}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <Text style={styles.gloveSpinner}>🥊</Text>
            ) : (
              <Text style={styles.deactivateButtonText}>Desactivar Plan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>{modalContent.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: COLORS.accent,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 60,
  },
  tabBarContainer: {
    backgroundColor: COLORS.accent,
    paddingTop: 10,
    paddingBottom: 5,
  },
  tabNavigationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tabCounter: {
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    position: 'relative',
  },
  tabArrowLeft: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabArrowRight: {
    position: 'absolute',
    right: 0,
    zIndex: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: width,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: 'transparent',
    minWidth: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  riskCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskBadge: {
    fontSize: 32,
    marginRight: 15,
  },
  riskTitleContainer: {
    flex: 1,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  riskSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  riskIndicator: {
    height: 4,
    borderRadius: 2,
    marginBottom: 15,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 22,
  },
  riskDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '20',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  summaryUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  phaseInstructions: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  hydrationHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  hydrationAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  hydrationLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 15,
    marginBottom: 10,
  },
  cardioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  cardioLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardioValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  recommendationItem: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 10,
  },
  disclaimerText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  buttonsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  deactivateButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  deactivateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
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
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
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
