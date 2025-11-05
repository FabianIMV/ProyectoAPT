/**
 * Lambda Function: Nutrition Feedback AI
 *
 * Analiza el progreso diario del usuario en su plan de corte de peso
 * y genera feedback automático inteligente con recomendaciones personalizadas.
 *
 * Funcionalidades:
 * - Analiza calorías consumidas vs objetivo
 * - Evalúa macronutrientes (proteínas, carbos, grasas)
 * - Monitorea hidratación
 * - Considera la fase actual del plan
 * - Genera alertas y recomendaciones con IA
 *
 * Endpoint: POST /api/v1/nutrition/feedback
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Inicializar clientes
let genAI;
let supabase;

/**
 * Inicializa los clientes de Gemini y Supabase
 */
function initializeClients() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');
  }

  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase initialized');
  }
}

/**
 * Obtiene el progreso del día actual del usuario desde Supabase
 */
async function getDailyProgress(userId, timelineId, dayNumber) {
  try {
    const { data, error } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('daily_timeline_id', timelineId)
      .eq('day_number', dayNumber)
      .single();

    if (error) {
      console.error('❌ Error fetching daily progress:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Exception getting daily progress:', error);
    return null;
  }
}

/**
 * Obtiene el timeline activo del usuario
 */
async function getActiveTimeline(userId) {
  try {
    const { data, error } = await supabase
      .from('daily_timelines')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error fetching active timeline:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Exception getting active timeline:', error);
    return null;
  }
}

/**
 * Calcula el porcentaje de cumplimiento de una métrica
 */
function calculateCompliancePercentage(actual, target) {
  if (!target || target === 0) return 0;
  return Math.round((actual / target) * 100);
}

/**
 * Determina el nivel de severidad basado en el cumplimiento
 */
function determineSeverity(caloriesPercentage, proteinPercentage, waterPercentage) {
  // Muy por debajo (riesgo de catabolismo)
  if (caloriesPercentage < 50 || proteinPercentage < 50) {
    return 'danger';
  }

  // Muy por encima (riesgo de no cumplir objetivo)
  if (caloriesPercentage > 150) {
    return 'danger';
  }

  // Por debajo o ligeramente por encima
  if (caloriesPercentage < 80 || caloriesPercentage > 120) {
    return 'warning';
  }

  // Hidratación muy baja
  if (waterPercentage < 60) {
    return 'warning';
  }

  // En rango óptimo
  if (caloriesPercentage >= 80 && caloriesPercentage <= 120 &&
      proteinPercentage >= 80 && waterPercentage >= 80) {
    return 'success';
  }

  return 'info';
}

/**
 * Genera contexto adicional sobre la situación del usuario
 */
function generateSituationContext(caloriesPercentage, proteinPercentage, carbsPercentage,
                                    fatsPercentage, waterPercentage, phase) {
  let context = '';

  // Análisis de calorías
  if (caloriesPercentage < 50) {
    context += 'Consumo CRÍTICO de calorías (riesgo de pérdida muscular). ';
  } else if (caloriesPercentage < 80) {
    context += 'Consumo bajo de calorías. ';
  } else if (caloriesPercentage >= 80 && caloriesPercentage <= 120) {
    context += 'Consumo calórico óptimo. ';
  } else if (caloriesPercentage > 150) {
    context += 'Consumo EXCESIVO de calorías (compromete el corte). ';
  } else {
    context += 'Consumo calórico ligeramente elevado. ';
  }

  // Análisis de proteínas
  if (proteinPercentage < 70) {
    context += 'Proteína MUY baja (riesgo de catabolismo). ';
  } else if (proteinPercentage < 90) {
    context += 'Proteína por debajo del objetivo. ';
  } else {
    context += 'Proteína en buen rango. ';
  }

  // Análisis de hidratación
  if (waterPercentage < 50) {
    context += 'Hidratación CRÍTICA. ';
  } else if (waterPercentage < 80) {
    context += 'Hidratación insuficiente. ';
  }

  // Contexto según fase
  if (phase === 'WATER_CUT' || phase === 'FINAL') {
    context += 'FASE CRÍTICA DEL PLAN: Máxima precisión requerida. ';
  } else if (phase === 'DEPLETION') {
    context += 'Fase de depleción: Control estricto necesario. ';
  }

  return context.trim();
}

/**
 * Genera feedback inteligente con Gemini AI
 */
async function generateAIFeedback(progressData, timelineData, dayInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Calcular porcentajes de cumplimiento
    const caloriesPercentage = calculateCompliancePercentage(
      progressData.actual_calories || 0,
      dayInfo.targets.caloriesIntake
    );

    const proteinPercentage = calculateCompliancePercentage(
      progressData.actual_protein_grams || 0,
      dayInfo.targets.macros.proteinGrams
    );

    const carbsPercentage = calculateCompliancePercentage(
      progressData.actual_carbs_grams || 0,
      dayInfo.targets.macros.carbGrams
    );

    const fatsPercentage = calculateCompliancePercentage(
      progressData.actual_fats_grams || 0,
      dayInfo.targets.macros.fatGrams
    );

    const waterPercentage = calculateCompliancePercentage(
      progressData.actual_water_liters || 0,
      dayInfo.targets.waterIntakeLiters
    );

    const cardioPercentage = calculateCompliancePercentage(
      progressData.actual_cardio_minutes || 0,
      dayInfo.targets.cardioMinutes
    );

    // Determinar severidad
    const severity = determineSeverity(caloriesPercentage, proteinPercentage, waterPercentage);

    // Generar contexto de situación
    const situationContext = generateSituationContext(
      caloriesPercentage, proteinPercentage, carbsPercentage,
      fatsPercentage, waterPercentage, dayInfo.phase
    );

    const prompt = `Eres un coach nutricional directo y motivador especializado en cortes de peso.

**DATOS DEL ATLETA:**
- Día ${progressData.day_number} de ${timelineData.total_days} | Fase: ${dayInfo.phase}

**PROGRESO HOY:**
- Calorías: ${progressData.actual_calories || 0}/${dayInfo.targets.caloriesIntake} kcal (${caloriesPercentage}%)
- Proteínas: ${progressData.actual_protein_grams || 0}/${dayInfo.targets.macros.proteinGrams}g (${proteinPercentage}%)
- Carbos: ${progressData.actual_carbs_grams || 0}/${dayInfo.targets.macros.carbGrams}g (${carbsPercentage}%)
- Grasas: ${progressData.actual_fats_grams || 0}/${dayInfo.targets.macros.fatGrams}g (${fatsPercentage}%)
- Agua: ${progressData.actual_water_liters || 0}/${dayInfo.targets.waterIntakeLiters}L (${waterPercentage}%)

**GENERA UN FEEDBACK DIRECTO Y PERSONALIZADO:**

{
  "status": "En el camino" o "Sigue así" o "Ajusta el plan" o "Atención urgente",
  "message": "Mensaje personal y directo en 2-3 oraciones. SIN emojis. Habla directo al atleta.",
  "severity": "${severity}",
  "complianceScore": número_0_a_100,
  "actions": [
    "Acción específica 1 (sin emojis, directo)",
    "Acción específica 2",
    "Acción específica 3 si necesaria"
  ],
  "nextMeal": "Sugerencia concreta de próxima comida o ajuste (1-2 oraciones)",
  "motivation": "Mensaje motivador corto y personal (1 oración)"
}

**REGLAS:**
- SIN emojis en ningún campo
- Sé directo, no redundante
- Si va bien: motiva y refuerza
- Si va mal: acciones concretas de corrección
- NO repitas información entre "actions" y "nextMeal"
- Personaliza el tono según el compliance score

Responde SOLO con el JSON.`;

    console.log('🤖 Generando feedback con Gemini AI...');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Limpiar respuesta
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const feedback = JSON.parse(cleanedText);

    // Agregar metadata
    feedback.metadata = {
      dayNumber: progressData.day_number,
      totalDays: timelineData.total_days,
      phase: dayInfo.phase,
      compliance: {
        calories: caloriesPercentage,
        protein: proteinPercentage,
        carbs: carbsPercentage,
        fats: fatsPercentage,
        water: waterPercentage,
        cardio: cardioPercentage
      },
      generatedAt: new Date().toISOString()
    };

    return feedback;

  } catch (error) {
    console.error('❌ Error generating AI feedback:', error);
    throw new Error(`Failed to generate AI feedback: ${error.message}`);
  }
}

/**
 * Genera feedback básico sin IA (fallback)
 */
function generateBasicFeedback(progressData, dayInfo) {
  const caloriesPercentage = calculateCompliancePercentage(
    progressData.actual_calories || 0,
    dayInfo.targets.caloriesIntake
  );

  const severity = determineSeverity(
    caloriesPercentage,
    calculateCompliancePercentage(progressData.actual_protein_grams || 0, dayInfo.targets.macros.proteinGrams),
    calculateCompliancePercentage(progressData.actual_water_liters || 0, dayInfo.targets.waterIntakeLiters)
  );

  let emoji, title, message;

  if (severity === 'success') {
    emoji = '🎯';
    title = '¡Excelente progreso!';
    message = 'Vas muy bien con tu plan. Sigue así para alcanzar tu objetivo.';
  } else if (severity === 'warning') {
    emoji = '⚠️';
    title = 'Ajusta tu consumo';
    message = 'Estás un poco fuera del rango óptimo. Revisa tus siguientes comidas.';
  } else if (severity === 'danger') {
    emoji = '🚨';
    title = 'Atención necesaria';
    message = 'Tu consumo está muy desviado del objetivo. Necesitas hacer ajustes importantes.';
  } else {
    emoji = 'ℹ️';
    title = 'Sigue adelante';
    message = 'Continúa con tu plan y monitorea tu progreso.';
  }

  return {
    emoji,
    title,
    message,
    severity,
    complianceScore: Math.round((caloriesPercentage / 100) * 100),
    recommendations: [
      'Revisa tus comidas pendientes del día',
      'Mantén tu hidratación constante',
      'Sigue las recomendaciones de tu fase actual'
    ],
    metadata: {
      dayNumber: progressData.day_number,
      phase: dayInfo.phase,
      fallback: true
    }
  };
}

/**
 * Handler principal de Lambda
 */
exports.handler = async (event) => {
  console.log('📥 Nutrition Feedback Request:', JSON.stringify(event, null, 2));

  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight CORS
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  try {
    // Inicializar clientes
    initializeClients();

    if (!supabase) {
      throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    // Parsear body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Validar datos requeridos
    if (!body.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'userId es requerido'
        })
      };
    }

    // Convertir userId a número si viene como string
    const userId = typeof body.userId === 'string' ? parseInt(body.userId) : body.userId;
    const timelineId = body.timelineId;
    const dayNumber = body.dayNumber;

    // Si no se proporciona timelineId o dayNumber, obtener el activo
    let timeline = timelineId ? null : await getActiveTimeline(userId);
    let currentDay = dayNumber;
    let currentTimelineId = timelineId;

    if (!timelineId && timeline) {
      currentTimelineId = timeline.id;
      currentDay = currentDay || timeline.current_day || 1;
    }

    if (!currentTimelineId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No se encontró un timeline activo para este usuario'
        })
      };
    }

    // Obtener datos del timeline si no los tenemos
    if (!timeline) {
      const { data, error } = await supabase
        .from('daily_timelines')
        .select('*')
        .eq('id', currentTimelineId)
        .single();

      if (error || !data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Timeline no encontrado'
          })
        };
      }

      timeline = data;
    }

    // Obtener progreso del día
    const progress = await getDailyProgress(userId, currentTimelineId, currentDay);

    if (!progress) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: `No se encontró progreso para el día ${currentDay}`
        })
      };
    }

    // Obtener información del día desde el timeline
    const dayInfo = timeline.timeline_data.days.find(d => d.day === currentDay);

    if (!dayInfo) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: `No se encontró información para el día ${currentDay} en el timeline`
        })
      };
    }

    console.log(`📊 Analizando día ${currentDay} de ${timeline.total_days} - Fase: ${dayInfo.phase}`);

    // Generar feedback con IA o fallback
    let feedback;

    if (genAI) {
      try {
        feedback = await generateAIFeedback(progress, timeline, dayInfo);
        console.log('✅ Feedback generado con IA');
      } catch (aiError) {
        console.warn('⚠️ AI feedback failed, using fallback:', aiError.message);
        feedback = generateBasicFeedback(progress, dayInfo);
      }
    } else {
      feedback = generateBasicFeedback(progress, dayInfo);
      console.log('ℹ️ Using basic feedback (Gemini not configured)');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: feedback
      })
    };

  } catch (error) {
    console.error('❌ Error in handler:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error generando feedback',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
