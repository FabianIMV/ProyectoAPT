import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdByEmail } from '../services/userService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedData, setPreloadedData] = useState(null); // Caché de datos precargados

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem('@nutricombat_user');
      const tokenData = await AsyncStorage.getItem('@nutricombat_token');
      const userIdData = await AsyncStorage.getItem('@nutricombat_user_id');

      if (userData && tokenData) {
        setUser(JSON.parse(userData));
        if (userIdData) {
          setUserId(userIdData);
          console.log('✅ User ID cargado desde storage:', userIdData);
        } else {
          console.log('ℹ️ No hay user_id almacenado previamente');
        }
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, tokens) => {
    try {
      await AsyncStorage.setItem('@nutricombat_user', JSON.stringify(userData));
      await AsyncStorage.setItem('@nutricombat_token', JSON.stringify(tokens));
      setUser(userData);

      // Obtener y guardar el user_id inmediatamente después del login
      if (userData.email) {
        console.log('🔄 Obteniendo user_id para:', userData.email);
        const userId = await getUserIdByEmail(userData.email);

        if (userId) {
          await setUserIdInSession(userId);
          console.log('✅ User ID obtenido y guardado exitosamente en login:', userId);
        } else {
          console.warn('⚠️ No se pudo obtener el user_id durante el login');
        }
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
    }
  };

  const setUserIdInSession = async (id) => {
    try {
      await AsyncStorage.setItem('@nutricombat_user_id', id);
      setUserId(id);
      console.log('✅ AuthContext - User ID guardado:', id);
      console.log('📦 Estado actualizado - userId:', id);
    } catch (error) {
      console.error('❌ Error guardando user_id:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@nutricombat_user');
      await AsyncStorage.removeItem('@nutricombat_token');
      await AsyncStorage.removeItem('@nutricombat_user_id');
      setUser(null);
      setUserId(null);
      setPreloadedData(null); // Limpiar caché al cerrar sesión
    } catch (error) {
      console.error('Error eliminando usuario:', error);
    }
  };

  const updatePreloadedData = (data) => {
    setPreloadedData(data);
    console.log('📦 Datos precargados actualizados en AuthContext');
  };

  const clearPreloadedData = () => {
    setPreloadedData(null);
    console.log('🗑️ Caché de datos precargados limpiada');
  };

  const getToken = async () => {
    try {
      const tokenData = await AsyncStorage.getItem('@nutricombat_token');
      return tokenData ? JSON.parse(tokenData) : null;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  };

  const value = {
    user,
    userId,
    isLoading,
    preloadedData,
    login,
    logout,
    getToken,
    setUserIdInSession,
    updatePreloadedData,
    clearPreloadedData,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};