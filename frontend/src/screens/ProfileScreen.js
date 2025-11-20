import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Dimensions, SafeAreaView } from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { PROFILE_API } from '../config/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation, route }) {
  const [profileData, setProfileData] = useState({
    name: '',
    weight: '',
    height: '',
    age: '',
    profile_picture_url: ''
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { preloadedProfile: profileData });
  };

  useEffect(() => {
    // Si hay datos precargados desde la navegación, usarlos
    const preloadedProfile = route?.params?.preloadedProfile;

    if (preloadedProfile) {
      setProfileData({
        name: preloadedProfile.name || user?.name || 'Usuario',
        weight: preloadedProfile.weight || '',
        height: preloadedProfile.height || '',
        age: preloadedProfile.age || '',
        profile_picture_url: preloadedProfile.profile_picture_url || ''
      });
      setIsLoading(false);
    } else if (user) {
      loadUserProfile();
    }
  }, [user, route?.params?.preloadedProfile]);

  const loadUserProfile = async () => {
    if (user && user.email) {
      setIsLoading(true);
      try {
        const response = await fetch(PROFILE_API.getProfile(user.email));
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const profile = data.data[0];

            // Verificar si el perfil está incompleto
            const isIncomplete = !profile.weight || !profile.height || !profile.age || !profile.name;

            if (isIncomplete) {
              // Redirigir a EditProfile con parámetro de perfil incompleto
              navigation.navigate('EditProfile', {
                isProfileIncomplete: true,
                preloadedProfile: profile
              });
              return;
            }

            setProfileData({
              name: profile.name || user.name || 'Usuario',
              weight: profile.weight || '',
              height: profile.height || '',
              age: profile.age || '',
              profile_picture_url: profile.profile_picture_url || ''
            });
          } else {
            // No hay perfil, redirigir a completar
            navigation.navigate('EditProfile', { isProfileIncomplete: true });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfileData(prev => ({
          ...prev,
          name: user.name || 'Usuario'
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  // Mostrar loader mientras carga por primera vez
  if (isLoading && !profileData.name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={{ paddingTop: 30 }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.secondary]}
            tintColor={COLORS.secondary}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {refreshing && (
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="small" color={COLORS.secondary} />
              <Text style={styles.loadingHeaderText}>Actualizando...</Text>
            </View>
          )}
          
          {/* Avatar y nombre - Layout horizontal */}
          <View style={styles.profileMainSection}>
            {/* Foto de perfil a la izquierda */}
            <View style={styles.avatarContainer}>
              {profileData.profile_picture_url ? (
                <Image
                  source={{ uri: profileData.profile_picture_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profileData.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Información del usuario a la derecha */}
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{profileData.name}</Text>
              <Text style={styles.userSubtitle}>Atleta Profesional</Text>
            </View>
          </View>

          {/* Stats cards - 3 cards visuales */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="fitness" size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{profileData.weight || '--'}</Text>
              <Text style={styles.statLabel}>Peso (kg)</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="resize" size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>
                {profileData.height ? (profileData.height / 100).toFixed(2) : '--'}
              </Text>
              <Text style={styles.statLabel}>Altura (m)</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{profileData.age || '--'}</Text>
              <Text style={styles.statLabel}>Años</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Acción rápida - Editar perfil */}
          <TouchableOpacity style={styles.editProfileCard} onPress={handleEditProfile}>
            <View style={styles.editProfileIcon}>
              <Ionicons name="person-circle" size={32} color={COLORS.secondary} />
            </View>
            <View style={styles.editProfileContent}>
              <Text style={styles.editProfileTitle}>Editar Perfil</Text>
              <Text style={styles.editProfileSubtitle}>Actualiza tu información personal</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Opciones */}
          <Text style={styles.sectionTitle}>Opciones</Text>
          
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('WeightCutHistory')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Historial de Cortes de Peso</Text>
              <Text style={styles.optionSubtitle}>Ver tus cortes anteriores</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  profileCard: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 200, 0.1)',
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingHeaderText: {
    color: COLORS.secondary,
    fontSize: 13,
    marginLeft: 8,
  },
  profileMainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: COLORS.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 200, 0.1)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  editProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 200, 0.15)',
  },
  editProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  editProfileContent: {
    flex: 1,
  },
  editProfileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  editProfileSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});