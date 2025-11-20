import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { COLORS } from '../styles/colors';

export default function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>🥊</Text>
      <Text style={styles.appName}>NutriCombat</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  logo: {
    fontSize: 20,
    marginRight: 8,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
});
