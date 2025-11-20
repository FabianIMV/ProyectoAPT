import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileLoadingScreen from './src/screens/ProfileLoadingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import NutritionResultsScreen from './src/screens/NutritionResultsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import WeightCutCalculatorScreen from './src/screens/WeightCutCalculatorScreen';
import WeightCutResultsScreen from './src/screens/WeightCutResultsScreen';
import WeightCutHistoryScreen from './src/screens/WeightCutHistoryScreen';
import ActivateTimelineScreen from './src/screens/ActivateTimelineScreen';
import WaterHistoryScreen from './src/screens/WaterHistoryScreen';
import ManualFoodEntryScreen from './src/screens/ManualFoodEntryScreen';
import { COLORS } from './src/styles/colors';
import { AuthProvider } from './src/context/AuthContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitle: 'Atrás',
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Crear Cuenta' }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfileLoading"
          component={ProfileLoadingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ title: 'Inicio', headerShown: false }}
        />
        <Stack.Screen
          name="NutritionResults"
          component={NutritionResultsScreen}
          options={{ title: 'Resultados del Análisis' }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ title: 'Editar Perfil' }}
        />
        <Stack.Screen
          name="WeightCutCalculator"
          component={WeightCutCalculatorScreen}
          options={{ title: 'Calculadora de Corte de Peso' }}
        />
        <Stack.Screen
          name="WeightCutResults"
          component={WeightCutResultsScreen}
          options={{ title: 'Plan de Corte de Peso' }}
        />
        <Stack.Screen
          name="WeightCutHistory"
          component={WeightCutHistoryScreen}
          options={{ title: 'Historial de Cortes' }}
        />
        <Stack.Screen
          name="ActivateTimeline"
          component={ActivateTimelineScreen}
          options={{ title: 'Activar Timeline Diario' }}
        />
        <Stack.Screen
          name="WaterHistory"
          component={WaterHistoryScreen}
          options={{ title: 'Historial de Agua' }}
        />
        <Stack.Screen
          name="ManualFoodEntry"
          component={ManualFoodEntryScreen}
          options={{ title: 'Registro Manual' }}
        />
      </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
