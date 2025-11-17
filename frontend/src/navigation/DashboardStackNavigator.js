import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../styles/colors';

import DashboardScreen from '../screens/DashboardScreen';
import NutritionTrackingScreen from '../screens/NutritionTrackingScreen';
import NutritionFeedbackScreen from '../screens/NutritionFeedbackScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import StatsScreen from '../screens/StatsScreen';
import ActivePlanDetailsScreen from '../screens/ActivePlanDetailsScreen';
import ScannerScreen from '../screens/ScannerScreen';

const Stack = createStackNavigator();

export default function DashboardStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
        headerBackTitle: 'Atrás',
        cardStyle: { backgroundColor: COLORS.primary },
      }}
    >
      <Stack.Screen 
        name="DashboardHome" 
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NutritionTracking" 
        component={NutritionTrackingScreen}
        options={{ title: 'Seguimiento Nutricional' }}
      />
      <Stack.Screen 
        name="NutritionFeedback" 
        component={NutritionFeedbackScreen}
        options={{ title: 'Análisis Nutricional' }}
      />
      <Stack.Screen 
        name="Recommendations" 
        component={RecommendationsScreen}
        options={{ title: 'Recomendaciones' }}
      />
      <Stack.Screen 
        name="Stats" 
        component={StatsScreen}
        options={{ title: 'Estadísticas' }}
      />
      <Stack.Screen 
        name="ActivePlanDetails" 
        component={ActivePlanDetailsScreen}
        options={{ title: 'Detalles del Plan' }}
      />
      <Stack.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{ title: 'Escanear Alimentos' }}
      />
    </Stack.Navigator>
  );
}
