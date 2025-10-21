/**
 * Utilidades para manejo consistente de fechas en toda la aplicación
 * Resuelve problemas de timezone y cálculos de días
 */

/**
 * Calcula el índice del día actual basado en la fecha de inicio del timeline
 * @param {string} startDate - Fecha de inicio del timeline (formato ISO o compatible)
 * @param {number} totalDays - Total de días en el timeline
 * @returns {number|null|'completed'} - Índice del día (0-based), null si no ha iniciado, 'completed' si terminó
 */
export const calculateCurrentDayIndex = (startDate, totalDays) => {
  // Parsear fecha de inicio en hora local (no UTC)
  // Si viene como "2025-10-16", crear explícitamente en local
  const startParts = startDate.split(/[-T]/);
  const start = new Date(
    parseInt(startParts[0]),      // year
    parseInt(startParts[1]) - 1,  // month (0-indexed)
    parseInt(startParts[2])       // day
  );

  const today = new Date();

  // Normalizar ambas fechas a medianoche en hora local
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Calcular diferencia en días
  const dayIndex = Math.floor((today - start) / (1000 * 60 * 60 * 24));

  // Validar estado del timeline
  if (dayIndex < 0) return null; // No ha iniciado
  if (dayIndex >= totalDays) return 'completed'; // Ya terminó

  return dayIndex; // 0-indexed (día 0 = primer día)
};

/**
 * Calcula el número de día actual (1-indexed) para mostrar al usuario
 * @param {string} startDate - Fecha de inicio del timeline
 * @param {number} totalDays - Total de días en el timeline
 * @returns {number|null|'completed'} - Número de día (1-based), null si no ha iniciado, 'completed' si terminó
 */
export const calculateCurrentDayNumber = (startDate, totalDays) => {
  const dayIndex = calculateCurrentDayIndex(startDate, totalDays);

  if (dayIndex === null || dayIndex === 'completed') {
    return dayIndex;
  }

  return dayIndex + 1; // 1-indexed para mostrar al usuario (día 1, 2, 3...)
};

/**
 * Formatea una fecha ISO a hora local legible
 * @param {string} timestamp - Timestamp en formato ISO (se convierte automáticamente a hora local)
 * @returns {string} - Hora formateada (HH:MM) en hora local del dispositivo
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return '';

  // new Date() con ISO string automáticamente convierte a hora local
  const date = new Date(timestamp);

  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago' // Forzar timezone de Chile
  });
};

/**
 * Formatea una fecha ISO a fecha legible
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} - Fecha formateada (DD/MM/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Obtiene la fecha de hoy en formato ISO (solo fecha, sin hora)
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
export const getTodayDateString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
};

/**
 * Verifica si dos fechas son el mismo día (ignorando hora)
 * @param {string|Date} date1
 * @param {string|Date} date2
 * @returns {boolean}
 */
export const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Obtiene el timezone del usuario desde el dispositivo
 * @returns {string} - IANA timezone string (ej: "America/Santiago")
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('No se pudo detectar timezone, usando UTC por defecto');
    return 'UTC';
  }
};
