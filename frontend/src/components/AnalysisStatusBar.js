import React from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../styles/colors';
import { useWeightCutAnalysis } from '../context/WeightCutAnalysisContext';

export default function AnalysisStatusBar() {
  const { isAnalyzing, analysisReady } = useWeightCutAnalysis();
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const [showNotification, setShowNotification] = React.useState(false);
  
  // Calcular posición justo debajo del status bar (sin header)
  // DashboardScreen tiene headerShown: false, así que solo usamos insets.top
  const topPosition = Platform.OS === 'ios' ? insets.top : 0;

  React.useEffect(() => {
    if (isAnalyzing || analysisReady) {
      setShowNotification(true);
      // Slide in desde arriba
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss después de 5 segundos si está "listo"
      if (analysisReady) {
        const timer = setTimeout(() => {
          hideNotification();
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      hideNotification();
    }
  }, [isAnalyzing, analysisReady]);

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowNotification(false);
    });
  };

  return (
    <>
      {/* Línea verde fija siempre visible - DEBAJO del header */}
      <View style={[styles.fixedGreenLine, { top: topPosition }]} />
      
      {/* Notificación toast deslizante - DEBAJO de la línea verde */}
      {showNotification && (
        <Animated.View 
          style={[
            styles.notification, 
            { 
              top: topPosition + 2, // 2px debajo de la línea verde
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {isAnalyzing && (
            <View style={styles.content}>
              <ActivityIndicator size="small" color={COLORS.text} />
              <Text style={styles.text}>Analizando plan de corte de peso...</Text>
            </View>
          )}
          {analysisReady && (
            <View style={[styles.content, styles.readyContent]}>
              <Text style={styles.readyIcon}>✅</Text>
              <Text style={styles.text}>Plan de corte listo - Ve a la tab "Plan de Corte"</Text>
            </View>
          )}
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fixedGreenLine: {
    height: 2,
    backgroundColor: COLORS.secondary,
    position: 'absolute',
    // top se establece dinámicamente en el componente
    left: 0,
    right: 0,
    zIndex: 10, // ✅ zIndex BAJO - no interfiere con headers (headers usan zIndex ~100+)
  },
  notification: {
    position: 'absolute',
    // top se establece dinámicamente en el componente (topPosition + 2)
    left: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 9, // ✅ Menor que la línea verde, debajo de headers
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  readyContent: {
    backgroundColor: 'transparent',
  },
  text: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  readyIcon: {
    fontSize: 16,
  },
});
