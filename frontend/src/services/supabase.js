import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('users')
    .upsert([
      {
        id: userId,
        ...profileData,
        updated_at: new Date(),
      },
    ]);
  return { data, error };
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

// Upload profile picture to Supabase Storage
export const uploadProfilePicture = async (userId, uri) => {
  try {
    console.log('📤 Iniciando upload de imagen:', uri);
    
    const fileExt = uri.split('.').pop().toLowerCase();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    
    console.log('📝 Nombre de archivo:', fileName);

    // Crear FormData para React Native
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: fileName,
      type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
    });

    console.log('📦 FormData creado');

    // Subir usando fetch directo (el método del cliente de Supabase no funciona bien con FormData en RN)
    const uploadUrl = `${supabaseUrl}/storage/v1/object/profile-pictures/${fileName}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Error del servidor:', errorText);
      throw new Error(errorText);
    }

    console.log('✅ Archivo subido exitosamente');

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    console.log('🌐 URL pública:', publicUrlData.publicUrl);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return { publicUrl: null, error };
  }
};

// Delete profile picture from Supabase Storage
export const deleteProfilePicture = async (fileUrl) => {
  try {
    const fileName = fileUrl.split('/').pop();
    const { error } = await supabase.storage
      .from('profile-pictures')
      .remove([fileName]);

    return { error };
  } catch (error) {
    return { error };
  }
};