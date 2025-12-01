import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { WEIGHT_CUT_API } from '../config/api';

export default function WeightCutHistoryScreen({ navigation }) {
  const { userId } = useAuth();
  const [weightCuts, setWeightCuts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadWeightCuts();
    }
  }, [userId]);

  const loadWeightCuts = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(WEIGHT_CUT_API.getUserPlans(userId));

      if (response.ok) {
        const data = await response.json();
        // Filtrar solo los inactivos
        const inactiveWeightCuts = data.data?.filter(wc => !wc.is_active) || [];
        setWeightCuts(inactiveWeightCuts);
        console.log('✅ Weight cuts inactivos cargados:', inactiveWeightCuts.length);
      }
    } catch (error) {
      console.error('❌ Error cargando weight cuts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWeightCuts();
    setRefreshing(false);
  };

  const getRiskColor = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return '#4CAF50';
      case 'MODERATE': return '#FF9800';
      case 'AGGRESSIVE': return '#FF5722';
      case 'DANGEROUS': return '#F44336';
      default: return COLORS.accent;
    }
  };

  const getRiskLabel = (riskCode) => {
    switch (riskCode) {
      case 'LOW': return 'Bajo';
      case 'MODERATE': return 'Moderado';
      case 'AGGRESSIVE': return 'Agresivo';
      case 'DANGEROUS': return 'Peligroso';
      default: return riskCode;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.gloveSpinnerLarge}>🥊</Text>
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.secondary]}
          tintColor={COLORS.secondary}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Historial de Cortes de Peso</Text>
        <Text style={styles.subtitle}>Planes de corte anteriores</Text>

        {weightCuts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No tienes cortes de peso anteriores</Text>
            <Text style={styles.emptySubtext}>
              Los planes que hayas completado aparecerán aquí
            </Text>
          </View>
        ) : (
          weightCuts.map((weightCut, index) => (
            <View key={weightCut.id || index} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.cardDate}>{formatDate(weightCut.created_at)}</Text>
                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: getRiskColor(weightCut.analysis_response?.riskAnalysis?.riskCode) }
                    ]}
                  >
                    <Text style={styles.riskBadgeText}>
                      {getRiskLabel(weightCut.analysis_response?.riskAnalysis?.riskCode)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Peso Inicial</Text>
                  <Text style={styles.statValue}>
                    {weightCut.analysis_request?.currentWeightKg} kg
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Peso Objetivo</Text>
                  <Text style={styles.statValue}>
                    {weightCut.analysis_request?.targetWeightKg} kg
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Duración</Text>
                  <Text style={styles.statValue}>
                    {weightCut.analysis_request?.daysToCut} días
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Deporte</Text>
                  <Text style={styles.statValue}>
                    {weightCut.analysis_request?.combatSport || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Déficit Objetivo</Text>
                <Text style={styles.summaryValue}>
                  {weightCut.analysis_response?.actionPlan?.summary?.targetDeficitCalories} cal/día
                </Text>
              </View>
            </View>
          ))
        )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  headerLeft: {
    flex: 1,
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    width: '48%',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summarySection: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
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
