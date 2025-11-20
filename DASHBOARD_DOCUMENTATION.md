# 📊 Dashboard - Documentación Técnica

## Descripción General
El Dashboard es la pantalla principal de la aplicación NutriCombat, diseñada para mostrar de forma centralizada el progreso diario del usuario en su plan de corte de peso. Implementa un diseño tipo F-Pattern para optimizar la jerarquía visual y la experiencia del usuario.

---

## 🎯 Componentes Principales

### 1. Hero Metrics Section (Métricas Destacadas)
**Ubicación:** Parte superior del dashboard  
**Propósito:** Mostrar las 3 métricas más importantes del día

#### Cards Interactivas:

**🟢 Peso**
- **Datos mostrados:**
  - Peso actual (día 1: peso del día / día 2+: peso del día anterior)
  - Peso meta del día
  - Barra de progreso hacia el objetivo
- **Interacción:** Toca para abrir modal de registro de peso
- **Lógica especial:** 
  - Día 1 muestra el peso registrado el mismo día
  - Día 2+ muestra el peso del día anterior (para evitar confusión)

**🟠 Calorías**
- **Datos mostrados:**
  - Calorías consumidas en el día
  - Meta de calorías del día
  - Barra de progreso de consumo
- **Interacción:** Toca para navegar a Nutrition Tracking
- **Color de barra:**
  - Verde si cumple meta (≥100%)
  - Turquesa si está en progreso (<100%)

**🔵 Hidratación**
- **Datos mostrados:**
  - Litros de agua consumidos
  - Meta de agua del día
  - Barra de progreso
- **Interacción:** Toca para abrir modal de registro de agua
- **Color de barra:**
  - Verde si cumple meta
  - Azul si está en progreso

---

### 2. Estadísticas del Plan (Stats Summary)
**Ubicación:** Después de las métricas hero  
**Propósito:** Mostrar un resumen compacto del rendimiento general

#### Versión Compacta (Dashboard):
- **Estado del plan con emoji e indicador visual:**
  - 🔻 "¡Vas adelante!" (azul) - Peso por debajo de lo esperado
  - ✅ "¡Vas perfecto!" (verde) - Dentro del margen del plan
  - ⚠️ "Puedes mejorar" (naranja) - Ligeramente por encima
  - 🚨 "Ajusta tu plan" (rojo) - Requiere acción inmediata

- **Resumen rápido:**
  - Peso perdido total
  - Porcentaje de cumplimiento general

- **Botón "Ver Completo":** Navega al tab de Stats para ver análisis detallado

#### Condiciones de Visualización:
- Solo se muestra desde el **día 2** en adelante
- Requiere al menos 1 día de datos completos
- Si es día 1: muestra mensaje "Estadísticas desde el día 2"
- Si no hay datos: muestra mensaje "Registra tu progreso"

#### Fix Técnico Implementado:
```javascript
// Prevención de overflow en iPhone
statsProgressBar: {
  width: '100%',  // Evita desbordamiento horizontal
  overflow: 'hidden'
}
statsProgressFill: {
  maxWidth: '100%'  // Limita ancho máximo de la barra
}
```

---

### 3. Advertencia del Día (Alerta Principal)
**Ubicación:** Después de estadísticas  
**Propósito:** Mostrar la alerta más crítica del día

#### Características:
- **Colapsable:** Toca header para expandir/contraer
- **Tipos de alertas:**
  - 🔴 CRITICAL - Situaciones urgentes que requieren acción inmediata
  - 🟠 WARNING - Advertencias importantes
  - 🔵 INFO - Información relevante

#### Estructura de Alerta:
- **Header:**
  - Icono de alerta
  - Título descriptivo
  - Badge con tipo de alerta
  - Botón ayuda (?) con explicación

- **Contenido (expandido):**
  - Mensaje detallado con formato
  - Identificación de palabras clave (bold)
  - Contexto y recomendaciones

- **Acción opcional:**
  - Botón de acción directa (ej: "Registrar comidas", "Ajustar hidratación")
  - Navega a la pantalla correspondiente

#### Lógica de Priorización:
El sistema selecciona automáticamente la alerta más importante basándose en:
1. Nivel de severidad (CRITICAL > WARNING > INFO)
2. Relevancia actual (progreso del día)
3. Tiempo de generación (más recientes primero)

---

### 4. Alertas Automáticas del Timeline
**Ubicación:** Después de la alerta principal  
**Propósito:** Mostrar hasta 3 alertas adicionales generadas automáticamente

#### Características:
- **Generación automática:** Sistema analiza progreso vs plan
- **Filtrado inteligente:** Solo muestra las 3 más importantes
- **Persistencia:** Se pueden cerrar y no vuelven a aparecer
- **Colores según tipo:**
  - 🔴 Críticas - Desviación >20% del plan
  - 🟠 Advertencias - Desviación 10-20%
  - 🔵 Informativas - Recordatorios

#### Tipos de Alertas Generadas:
1. **Peso desviado del plan**
2. **Calorías muy por encima/debajo**
3. **Hidratación insuficiente**
4. **Falta de registro de peso**
5. **Recordatorios de cardio/sauna**

#### Sistema de Cierre:
```javascript
// Las alertas cerradas se guardan en AsyncStorage
// No vuelven a aparecer en sesiones futuras
dismissedAlerts: ['alert-id-1', 'alert-id-2']
```

---

### 5. Plan del Día (Colapsable)
**Ubicación:** Sección inferior  
**Propósito:** Mostrar objetivos y recomendaciones del día

#### Header:
- Título: "Plan del Día X"
- Botón de ayuda (?)
- Badge de fase actual (INITIAL, DEPLETION, WATER_CUT, FINAL)

#### Contenido Expandido:

**📊 Objetivos del Día:**
- Peso meta
- Calorías intake
- Proteínas, Carbos, Grasas (macros)
- Hidratación
- Cardio (si aplica)
- Traje sauna (si aplica)

**💡 Recomendaciones IA:**
Secciones específicas generadas por Gemini:
- 🍽️ **Horarios de Comida** - Timing óptimo
- 🥊 **Entrenamiento** - Intensidad y tipo
- 💧 **Hidratación** - Estrategia de consumo
- 🥗 **Nutrición** - Foco alimenticio
- 😴 **Descanso** - Calidad de sueño

**⚠️ Advertencias Importantes:**
Lista de precauciones específicas del día (ej: "Último cardio del plan")

---

## 🔄 Estados y Flujos

### Carga Inicial
1. **Uso de datos precargados:** AuthContext proporciona datos en caché
2. **Carga instantánea:** Muestra datos mientras hace fetch del servidor
3. **Actualización en background:** Refresca datos sin bloquear UI

### Pull-to-Refresh
- Usuario desliza hacia abajo
- Recarga todos los datos desde servidor
- Actualiza métricas, alertas y estadísticas

### Navegación desde otras pantallas
- Al volver al Dashboard, recarga datos automáticamente
- Listener: `navigation.addListener('focus')`

---

## 📱 Modales

### Water Intake Modal
**Activación:** Toca card de Hidratación

**Opciones rápidas:**
- 250ml, 500ml, 750ml, 1L
- Input personalizado

**Funcionalidad:**
- Suma progresiva al total del día
- Actualiza inmediatamente la UI
- Persiste en Daily Progress API

### Weight Input Modal
**Activación:** Toca card de Peso

**Funcionalidad:**
- Registra peso del día (sobrescribe valor anterior)
- Valida rango razonable (40-200kg)
- Actualiza cálculo de varianza vs meta
- Persiste en Daily Progress API

---

## 🎨 Diseño y UX

### Patrón de Diseño: F-Pattern
El dashboard sigue el patrón de lectura en F:
1. **Línea superior horizontal:** Hero Metrics (peso, calorías, agua)
2. **Movimiento vertical:** Stats summary y alertas
3. **Segunda línea horizontal:** Plan del día y detalles

### Jerarquía Visual
- **Nivel 1 (Más importante):** Métricas Hero
- **Nivel 2:** Estado general y alertas críticas
- **Nivel 3:** Detalles del plan y recomendaciones

### Paleta de Colores
```javascript
COLORS = {
  primary: '#0f0f23',      // Background oscuro
  secondary: '#00ffc8',     // Accent turquesa
  accent: '#1a1a2e',        // Cards
  text: '#ffffff',          // Texto principal
  textSecondary: '#b0b0b0', // Texto secundario
}

// Colores de estado
SUCCESS: '#4CAF50'  // Verde
WARNING: '#FF9800'  // Naranja
ERROR: '#F44336'    // Rojo
INFO: '#2196F3'     // Azul
```

### Responsividad
- **Adaptable a tamaños de pantalla**
- **Grid flexible** para cards
- **Overflow controlado** en barras de progreso
- **Touch targets** mínimo 44x44px

---

## 🔌 Integraciones API

### Weight Cut API
```javascript
WEIGHT_CUT_API = {
  getUserPlans: (userId) => `${BASE}/weight-cut/user/${userId}`,
  getTimeline: (userId) => `${BASE}/weight-cut/timeline/${userId}`,
}
```

### Daily Progress API
```javascript
PROGRESS_API = {
  getDay: (userId, timelineId, dayNumber) => 
    `${BASE}/weight-cut/progress/day?...`,
  add: (userId, timelineId, dayNumber) => 
    `${BASE}/weight-cut/progress/add?...`,
  set: (userId, timelineId, dayNumber) => 
    `${BASE}/weight-cut/progress/set?...`,
}
```

### Profile API
```javascript
PROFILE_API = {
  getProfile: (email) => `${BASE}/profile?email=${email}`,
}
```

---

## 📊 Servicios Utilizados

### dashboardService.js
Funciones auxiliares para cálculos:
- `calculateTimeRemaining()` - Días restantes
- `calculateWeightProgress()` - Progreso de peso
- `determineCurrentPhase()` - Fase actual del plan
- `getCurrentAlert()` - Alerta prioritaria

### statsService.js
Cálculo de estadísticas reales:
- `calculateRealStats()` - Análisis completo del progreso
- `getComplianceLevel()` - Nivel de cumplimiento

### alertsService.js
Sistema de alertas automáticas:
- `generateTimelineAlerts()` - Genera alertas basadas en progreso
- `filterTopAlerts()` - Filtra las 3 más importantes

### progressService.js
Gestión de progreso diario:
- `addWaterIntake()` - Registrar agua
- `setDailyWeight()` - Registrar peso
- `getDayProgress()` - Obtener datos del día

---

## 🐛 Consideraciones Técnicas

### Performance
- **Precarga de datos:** AuthContext carga datos antes del render
- **Memoización:** Cálculos pesados en useEffect con dependencias
- **Refresh inteligente:** Solo recarga cuando es necesario

### Manejo de Errores
- Try-catch en todas las llamadas API
- Fallbacks para datos no disponibles
- Mensajes de error contextuales

### Persistencia
- AsyncStorage para alertas cerradas
- Caché de datos en AuthContext
- Sincronización con servidor en background

### iOS Specific Fixes
```javascript
// Fix overflow en barras de progreso
statsProgressBar: {
  width: '100%',
  overflow: 'hidden'
}

// Fix ScrollView en iOS
<ScrollView
  showsVerticalScrollIndicator={false}
  bounces={true}
  contentContainerStyle={{ paddingBottom: 100 }}
/>
```

---

## 🚀 Mejoras Futuras Sugeridas
- [ ] Animaciones de transición entre estados
- [ ] Gráficas de progreso semanal
- [ ] Notificaciones push para alertas críticas
- [ ] Widget de iOS/Android para métricas rápidas
- [ ] Modo offline con sincronización posterior
- [ ] Comparación con otros usuarios (anónimo)

---

## 📝 Notas de Desarrollo

### Última actualización: 20 Nov 2025
**Cambios recientes:**
- Implementación de estadísticas reales desde BD
- Vista compacta de stats en Dashboard
- Fix de overflow en barras de progreso (iPhone)
- Optimización de carga con datos precargados
- Sistema de alertas automáticas mejorado

### Stack Tecnológico
- React Native + Expo
- AsyncStorage para persistencia local
- Fetch API para comunicación con backend
- Context API para gestión de estado global
- Ionicons para iconografía

---

**Mantenido por:** Equipo NutriCombat  
**Versión:** 2.0  
**Última revisión:** 20/11/2025
