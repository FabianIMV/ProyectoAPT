/**
 * Lambda Function: Nutrition Recommendations with Gemini AI
 *
 * Genera recomendaciones personalizadas basadas en:
 * - Calorías consumidas vs meta
 * - Macronutrientes (proteínas, carbos, grasas)
 * - Fase del plan de corte de peso
 * - Comidas registradas
 *
 * Endpoint: POST /api/v1/nutrition/recommendations
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Genera recomendaciones personalizadas usando Gemini AI
 */
async function generateRecommendations(nutritionData) {
  const {
    caloriesConsumed,
    caloriesTarget,
    proteinConsumed,
    proteinTarget,
    carbsConsumed,
    carbsTarget,
    fatsConsumed,
    fatsTarget,
    currentPhase,
    dayNumber,
    totalDays,
    meals,
    sport,
    userAge,
    userWeight
  } = nutritionData;

  const caloriesVariance = caloriesConsumed - caloriesTarget;
  const caloriesPercentage = (caloriesConsumed / caloriesTarget) * 100;

  // Determinar el tono y tipo de recomendación
  let situation = '';
  if (caloriesPercentage < 50) {
    situation = 'muy por debajo de la meta (posible riesgo de catabolismo muscular)';
  } else if (caloriesPercentage < 80) {
    situation = 'por debajo de la meta';
  } else if (caloriesPercentage >= 80 && caloriesPercentage <= 120) {
    situation = 'dentro del rango objetivo';
  } else if (caloriesPercentage <= 150) {
    situation = 'ligeramente por encima de la meta';
  } else {
    situation = 'muy por encima de la meta (puede comprometer el corte de peso)';
  }

  const prompt = `Eres un nutricionista deportivo experto especializado en cortes de peso para deportes de combate.

**CONTEXTO DEL ATLETA:**
- Deporte: ${sport || 'Deportes de combate'}
- Edad: ${userAge} años
- Peso actual: ${userWeight} kg
- Día del plan: ${dayNumber} de ${totalDays}
- Fase actual: ${currentPhase}

**ESTADO NUTRICIONAL DE HOY:**
- Calorías: ${caloriesConsumed} / ${caloriesTarget} kcal (${caloriesVariance > 0 ? '+' : ''}${caloriesVariance} kcal, ${caloriesPercentage.toFixed(0)}%)
- Proteínas: ${proteinConsumed}g / ${proteinTarget}g
- Carbohidratos: ${carbsConsumed}g / ${carbsTarget}g
- Grasas: ${fatsConsumed}g / ${fatsTarget}g

**SITUACIÓN:** ${situation}

**COMIDAS REGISTRADAS HOY:**
${meals.map((meal, i) => `${i + 1}. ${meal.name} - ${meal.calories} kcal (P: ${meal.protein}g, C: ${meal.carbs}g, G: ${meal.fats}g)`).join('\n')}

**TU TAREA:**

Genera una recomendación amigable, motivadora y práctica en formato JSON con esta estructura exacta:

{
  "emoji": "😊 o 😟 o 🎯 etc (según la situación)",
  "title": "Título corto y amigable (máx 6 palabras)",
  "message": "Mensaje principal con tono amigable y motivador (2-3 oraciones cortas)",
  "severity": "success" o "warning" o "danger" o "info",
  "recommendations": [
    "Recomendación práctica 1 (específica y accionable)",
    "Recomendación práctica 2",
    "Recomendación práctica 3"
  ],
  "nextMealSuggestion": {
    "type": "Tipo de comida sugerida (Ej: Ensalada con proteína, Snack ligero, etc)",
    "calories": número_estimado,
    "examples": ["Ejemplo 1", "Ejemplo 2"]
  },
  "motivationalQuote": "Frase motivadora corta relacionada con su situación"
}

**IMPORTANTE:**
- Si está MUY por encima: usa tono de precaución pero motivador, severity "danger"
- Si está por encima: usa tono de ajuste amable, severity "warning"
- Si está en rango: usa tono celebratorio, severity "success"
- Si está por debajo: usa tono de apoyo y sugerencias para alcanzar meta, severity "info"
- SIEMPRE mantén un tono amigable, nunca regañes
- Las recomendaciones deben ser ESPECÍFICAS y PRÁCTICAS
- Considera la fase del plan (ej: en fase final de corte, ajustes más cuidadosos)

Responde SOLO con el JSON, sin texto adicional.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Limpiar respuesta (remover markdown si existe)
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recommendations = JSON.parse(cleanedText);

    return {
      success: true,
      data: recommendations,
      metadata: {
        caloriesVariance,
        caloriesPercentage: Math.round(caloriesPercentage),
        proteinPercentage: Math.round((proteinConsumed / proteinTarget) * 100),
        carbsPercentage: Math.round((carbsConsumed / carbsTarget) * 100),
        fatsPercentage: Math.round((fatsConsumed / fatsTarget) * 100),
      }
    };

  } catch (error) {
    console.error('❌ Error generando recomendaciones:', error);
    throw error;
  }
}

/**
 * Handler principal de Lambda
 */
exports.handler = async (event) => {
  console.log('📥 Nutrition Recommendations Request:', JSON.stringify(event, null, 2));

  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight CORS
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  try {
    // Parsear body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Validar datos requeridos
    const requiredFields = ['caloriesConsumed', 'caloriesTarget', 'proteinConsumed', 'proteinTarget'];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Campo requerido faltante: ${field}`
          })
        };
      }
    }

    // Valores por defecto
    const nutritionData = {
      caloriesConsumed: body.caloriesConsumed,
      caloriesTarget: body.caloriesTarget,
      proteinConsumed: body.proteinConsumed || 0,
      proteinTarget: body.proteinTarget || 150,
      carbsConsumed: body.carbsConsumed || 0,
      carbsTarget: body.carbsTarget || 200,
      fatsConsumed: body.fatsConsumed || 0,
      fatsTarget: body.fatsTarget || 60,
      currentPhase: body.currentPhase || 'INITIAL',
      dayNumber: body.dayNumber || 1,
      totalDays: body.totalDays || 7,
      meals: body.meals || [],
      sport: body.sport || 'Deportes de combate',
      userAge: body.userAge || 25,
      userWeight: body.userWeight || 70
    };

    console.log('🔍 Generando recomendaciones para:', nutritionData);

    // Generar recomendaciones con Gemini
    const result = await generateRecommendations(nutritionData);

    console.log('✅ Recomendaciones generadas:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Error en handler:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error generando recomendaciones',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
