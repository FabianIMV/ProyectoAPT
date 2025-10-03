/**
 * Servicio para operaciones relacionadas con usuarios
 */

// URL del endpoint de AWS Lambda para obtener user_id
const AWS_LAMBDA_ENDPOINT = 'https://c5uudu6dzvn66jblbxrzne5nx40ljner.lambda-url.us-east-1.on.aws/api/v1/user_id/user-id';

/**
 * Obtiene el user_id basado en el email del usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<string|null>} - user_id o null si hay error
 */
export const getUserIdByEmail = async (email) => {
  if (!email) {
    console.error('❌ Email es requerido');
    return null;
  }

  try {
    console.log('🔍 Buscando user_id para email:', email);

    const response = await fetch(
      `${AWS_LAMBDA_ENDPOINT}?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.userId) {
      console.log('✅ User ID obtenido desde AWS Lambda:', data.userId);
      return data.userId;
    } else {
      console.error('❌ Error obteniendo user_id:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en getUserIdByEmail:', error);
    return null;
  }
};

