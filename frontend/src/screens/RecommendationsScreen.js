import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Animated, Platform } from 'react-native';
import { COLORS } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RecommendationsScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  const [recommendations] = useState([
    {
      id: 1,
      category: 'Hidratación',
      priority: 'low',
      icon: 'water',
      iconColor: '#2196F3',
      title: 'Registra tu hidratación',
      description: 'Recuerda mantenerte hidratado durante el dia. Registra tu consumo de agua',
      action: 'Registrar agua',
    },
    {
      id: 2,
      category: 'Proteinas',
      priority: 'medium',
      icon: 'nutrition',
      iconColor: '#4CAF50',
      title: 'Consume más proteínas',
      description: 'Las proteinas son esenciales para la recuperacion muscular',
      action: 'Ver recetas',
    },
    {
      id: 3,
      category: 'Sodio',
      priority: 'high',
      icon: 'warning',
      iconColor: '#FF6B6B',
      title: 'Reduce el sodio',
      description: 'Has consumido 380mg de 400mg permitidos. Evita alimentos procesados',
      action: 'Ver alternativas',
    },
    {
      id: 4,
      category: 'Ejercicio',
      priority: 'low',
      icon: 'barbell',
      iconColor: '#FF9800',
      title: 'Sesión de entrenamiento',
      description: 'Entrena en 2 horas. Recuerda consumir pre-workout',
      action: 'Ver rutina',
    },
    {
      id: 5,
      category: 'Descanso',
      priority: 'medium',
      icon: 'moon',
      iconColor: '#9C27B0',
      title: 'Hora de dormir',
      description: 'Para recuperacion optima, duerme entre 22:00 y 06:00',
      action: 'Configurar alarma',
    },
  ]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return COLORS.secondary;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  const scrollToIndex = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ animated: true, index });
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < recommendations.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderRecommendationCard = ({ item, index }) => (
    <View style={styles.carouselItemContainer}>
      <View style={styles.recommendationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: item.iconColor }]}>
              <Ionicons name={item.icon} size={28} color="white" />
            </View>
          </View>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.categoryLabel}>{item.category}</Text>
              <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.priorityText}>{getPriorityLabel(item.priority)}</Text>
              </View>
            </View>
            <Text style={styles.recTitle}>{item.title}</Text>
          </View>
        </View>

        <Text style={styles.recDescription}>{item.description}</Text>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{item.action}</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recomendaciones</Text>
      </View>

      {/* Priority Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de Prioridades</Text>
        <View style={styles.priorityGrid}>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityBadge, { backgroundColor: '#FF6B6B' }]}>
              <Text style={styles.priorityCount}>1</Text>
            </View>
            <Text style={styles.priorityLabel}>Alta</Text>
          </View>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.priorityCount}>2</Text>
            </View>
            <Text style={styles.priorityLabel}>Media</Text>
          </View>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.priorityCount}>2</Text>
            </View>
            <Text style={styles.priorityLabel}>Baja</Text>
          </View>
        </View>
      </View>

      {/* Recommendations Carousel */}
      <View style={styles.recommendationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tus Recomendaciones</Text>
          <View style={styles.navigationHint}>
            <Ionicons name="chevron-back" size={16} color={COLORS.secondary} />
            <Text style={styles.hintText}>Desliza</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
          </View>
        </View>

        {/* Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} de {recommendations.length}
          </Text>
        </View>

        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={recommendations}
          renderItem={renderRecommendationCard}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          snapToAlignment="center"
          decelerationRate="fast"
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH - 40,
            offset: (SCREEN_WIDTH - 40) * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={1}
        />

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.arrowButton, styles.leftArrow]}
            onPress={handlePrevious}
            activeOpacity={0.7}
            accessibilityLabel="Recomendación anterior"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        )}
        {currentIndex < recommendations.length - 1 && (
          <TouchableOpacity
            style={[styles.arrowButton, styles.rightArrow]}
            onPress={handleNext}
            activeOpacity={0.7}
            accessibilityLabel="Siguiente recomendación"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={28} color="white" />
          </TouchableOpacity>
        )}

        {/* Dot Indicators */}
        <View style={styles.dotContainer}>
          {recommendations.map((_, index) => {
            const inputRange = [
              (index - 1) * (SCREEN_WIDTH - 40),
              index * (SCREEN_WIDTH - 40),
              (index + 1) * (SCREEN_WIDTH - 40),
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor: index === currentIndex ? COLORS.secondary : COLORS.textSecondary,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>Consejos del Dia</Text>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color={COLORS.secondary} style={styles.tipIcon} />
          <View style={styles.tipContent}>
            <Text style={styles.tipText}>
              Consume alimentos ricos en potasio para contrarrestar la retencion de liquidos causada por el sodio
            </Text>
          </View>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color={COLORS.secondary} style={styles.tipIcon} />
          <View style={styles.tipContent}>
            <Text style={styles.tipText}>
              Distribuye tu consumo de proteínas a lo largo del día para maximizar la síntesis muscular
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
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
  summaryCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  priorityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priorityItem: {
    alignItems: 'center',
  },
  priorityBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  priorityLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  navigationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  counterContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 15,
  },
  carouselItemContainer: {
    width: SCREEN_WIDTH - 40,
    paddingHorizontal: 20,
  },
  recommendationCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.secondary,
  },
  arrowButton: {
    position: 'absolute',
    top: '45%',
    backgroundColor: COLORS.secondary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  leftArrow: {
    left: 10,
  },
  rightArrow: {
    right: 10,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  iconContainer: {
    marginRight: 15,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priorityTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    color: 'white',
    fontWeight: 'bold',
  },
  recTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  tipCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  tipIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});
