import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, Platform, Image, ScrollView, KeyboardAvoidingView, BackHandler } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { uploadProfilePicture, deleteProfilePicture } from '../services/supabase';
import { validateWeight, validateHeight, validateAge } from '../utils/validationHelpers';

export default function ProfileScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [oldProfilePictureUrl, setOldProfilePictureUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Estados para validación en tiempo real
  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  
  const { user } = useAuth();

  // Verificar si el perfil está incompleto (usuario forzado a completar perfil)
  const isProfileIncomplete = route?.params?.isProfileIncomplete || false;
  const preloadedProfile = route?.params?.preloadedProfile || null;

  useEffect(() => {
    // Si hay datos precargados, usarlos directamente
    if (preloadedProfile) {
      setName(preloadedProfile.name || '');
      setWeight(preloadedProfile.weight ? preloadedProfile.weight.toString() : '');
      setHeight(preloadedProfile.height ? preloadedProfile.height.toString() : '');
      setAge(preloadedProfile.age ? preloadedProfile.age.toString() : '');
      setProfilePictureUrl(preloadedProfile.profile_picture_url || '');
      setOldProfilePictureUrl(preloadedProfile.profile_picture_url || '');
    } else if (user) {
      // Si no hay datos precargados, cargarlos
      loadUserProfile();
    }
  }, [user, preloadedProfile]);

  // Bloquear el botón de retroceso si el perfil está incompleto
  useEffect(() => {
    if (isProfileIncomplete) {
      // Bloquear el botón de retroceso en Android
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          'Completa tu perfil',
          'Debes completar tu perfil antes de continuar',
          [{ text: 'Entendido' }]
        );
        return true; // Prevenir el comportamiento por defecto
      });

      // Bloquear el gesto de deslizar hacia atrás y el botón de navegación en iOS
      if (navigation) {
        navigation.setOptions({
          headerLeft: () => null, // Eliminar el botón de retroceso
          gestureEnabled: false, // Desactivar el gesto de deslizar hacia atrás
        });
      }

      return () => {
        backHandler.remove();
        // Restaurar opciones de navegación si el componente se desmonta
        if (navigation) {
          navigation.setOptions({
            headerLeft: undefined,
            gestureEnabled: true,
          });
        }
      };
    }
  }, [isProfileIncomplete, navigation]);

  const loadUserProfile = async () => {
    if (user && user.email) {
      try {
        const response = await fetch('https://3f8q0vhfcf.execute-api.us-east-1.amazonaws.com/dev/profile?email=' + user.email);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const profile = data.data[0];
            setName(profile.name || '');
            setWeight(profile.weight ? profile.weight.toString() : '');
            setHeight(profile.height ? profile.height.toString() : '');
            setAge(profile.age ? profile.age.toString() : '');
            setProfilePictureUrl(profile.profile_picture_url || '');
            setOldProfilePictureUrl(profile.profile_picture_url || '');
          } else {
            setName(user.name || '');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setName(user.name || '');
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Necesitas permitir acceso a la galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploadingImage(true);
      try {
        // Si habia una foto antigua, eliminarla
        if (oldProfilePictureUrl) {
          await deleteProfilePicture(oldProfilePictureUrl);
        }

        // Subir la nueva foto
        const { publicUrl, error } = await uploadProfilePicture(user.email, result.assets[0].uri);

        if (error) {
          console.error('Error detallado al subir:', error);
          Alert.alert('Error', `No se pudo subir la imagen: ${error.message || JSON.stringify(error)}`);
        } else {
          setProfilePictureUrl(publicUrl);
          Alert.alert('Exito', 'Foto de perfil actualizada');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', `Ocurrio un error: ${error.message || error.toString()}`);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const removeProfilePicture = async () => {
    Alert.alert(
      'Eliminar foto',
      '¿Estas seguro de eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            try {
              if (profilePictureUrl) {
                await deleteProfilePicture(profilePictureUrl);
              }
              setProfilePictureUrl('');
              setOldProfilePictureUrl('');
              Alert.alert('Exito', 'Foto de perfil eliminada');
            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'No se pudo eliminar la imagen');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  const sanitizeWeightInput = (value) => {
    // Permitir solo números y un punto decimal
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos decimales
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return sanitized;
  };

  const sanitizeHeightInput = (value) => {
    // Permitir solo números enteros
    return value.replace(/[^0-9]/g, '');
  };

  const sanitizeAgeInput = (value) => {
    // Permitir solo números enteros
    return value.replace(/[^0-9]/g, '');
  };

  const handleWeightChange = (value) => {
    const sanitized = sanitizeWeightInput(value);
    setWeight(sanitized);
    validateField('weight', sanitized);
  };

  const handleHeightChange = (value) => {
    const sanitized = sanitizeHeightInput(value);
    setHeight(sanitized);
    validateField('height', sanitized);
  };

  const handleAgeChange = (value) => {
    const sanitized = sanitizeAgeInput(value);
    setAge(sanitized);
    validateField('age', sanitized);
  };

  // Validar campos individuales en tiempo real
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    if (field === 'weight' && value) {
      const validation = validateWeight(value);
      if (!validation.isValid) {
        newErrors.weight = validation.message;
        setShowErrors(true);
      } else {
        delete newErrors.weight;
      }
    } else if (field === 'height' && value) {
      const validation = validateHeight(value);
      if (!validation.isValid) {
        newErrors.height = validation.message;
        setShowErrors(true);
      } else {
        delete newErrors.height;
      }
    } else if (field === 'age' && value) {
      const validation = validateAge(value);
      if (!validation.isValid) {
        newErrors.age = validation.message;
        setShowErrors(true);
      } else {
        delete newErrors.age;
      }
    } else {
      // Borrar error si el campo está vacío
      delete newErrors[field];
    }
    
    setErrors(newErrors);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario logueado');
      return;
    }

    if (!name || !weight || !height || !age) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    // Validar todos los campos
    const newErrors = {};
    
    const weightValidation = validateWeight(weight);
    if (!weightValidation.isValid) {
      newErrors.weight = weightValidation.message;
    }

    const heightValidation = validateHeight(height);
    if (!heightValidation.isValid) {
      newErrors.height = heightValidation.message;
    }

    const ageValidation = validateAge(age);
    if (!ageValidation.isValid) {
      newErrors.age = ageValidation.message;
    }

    setErrors(newErrors);
    
    // Si hay errores, mostrarlos y no continuar
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        email: user.email,
        name,
        weight: weightValidation.sanitizedValue,
        height: heightValidation.sanitizedValue,
        age: ageValidation.sanitizedValue,
        profile_picture_url: profilePictureUrl
      };

      const response = await fetch('https://3f8q0vhfcf.execute-api.us-east-1.amazonaws.com/dev/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        Alert.alert('Exito', 'Perfil guardado exitosamente');
        setOldProfilePictureUrl(profilePictureUrl);

        // Si el perfil estaba incompleto, navegar al Main
        if (isProfileIncomplete && navigation) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else if (navigation) {
          // Notificar que el perfil fue actualizado y navegar a Avances
          navigation.navigate('Main', { 
            screen: 'Dashboard',
            params: { profileUpdated: true }
          });
        }
      } else {
        console.error('Error saving profile:', response.status);
        Alert.alert('Error', 'Error al guardar el perfil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Ocurrio un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {isProfileIncomplete && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ Debes completar todos los campos para continuar
                </Text>
              </View>
            )}

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        {profilePictureUrl ? (
          <Image
            source={{ uri: profilePictureUrl }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}

        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity
            style={[styles.imageButton, uploadingImage && styles.disabledButton]}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <Text style={styles.gloveSpinner}>🥊</Text>
            ) : (
              <Text style={styles.imageButtonText}>
                {profilePictureUrl ? 'Cambiar foto' : 'Subir foto'}
              </Text>
            )}
          </TouchableOpacity>

          {profilePictureUrl && (
            <TouchableOpacity
              style={[styles.removeButton, uploadingImage && styles.disabledButton]}
              onPress={removeProfilePicture}
              disabled={uploadingImage}
            >
              <Text style={styles.removeButtonText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa tu nombre completo"
          placeholderTextColor={COLORS.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Peso Actual (kg)</Text>
        <TextInput
          style={[styles.input, showErrors && errors.weight && styles.inputError]}
          placeholder="Ej: 70.5"
          placeholderTextColor={COLORS.textSecondary}
          value={weight}
          onChangeText={handleWeightChange}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        {showErrors && errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
        {!errors.weight && <Text style={styles.helperText}>Rango válido: 20 - 500 kg</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Altura (cm)</Text>
        <TextInput
          style={[styles.input, showErrors && errors.height && styles.inputError]}
          placeholder="Ej: 175"
          placeholderTextColor={COLORS.textSecondary}
          value={height}
          onChangeText={handleHeightChange}
          keyboardType="number-pad"
          maxLength={3}
        />
        {showErrors && errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
        {!errors.height && <Text style={styles.helperText}>Rango válido: 50 - 250 cm</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Edad (años)</Text>
        <TextInput
          style={[styles.input, showErrors && errors.age && styles.inputError]}
          placeholder="Ej: 25"
          placeholderTextColor={COLORS.textSecondary}
          value={age}
          onChangeText={handleAgeChange}
          keyboardType="number-pad"
          maxLength={3}
        />
        {showErrors && errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
        {!errors.age && <Text style={styles.helperText}>Rango válido: 10 - 120 años</Text>}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.disabledButton]}
        onPress={handleSaveProfile}
        disabled={loading}
      >
        {loading ? (
          <Text style={styles.gloveSpinner}>🥊</Text>
        ) : (
          <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        )}
      </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  innerContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: COLORS.accent,
    color: COLORS.text,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: -12,
    marginBottom: 10,
    paddingLeft: 5,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -10,
    marginBottom: 10,
    paddingLeft: 5,
  },
  warningBanner: {
    backgroundColor: '#FFA50080',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  warningText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.secondary,
    marginBottom: 15,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  imageButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  imageButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: COLORS.error || '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
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
