/**
 * Sistema centralizado de validaciones APT
 * Mensajes humanizados para todos los escenarios posibles
 */

export const ValidationLimits = {
  WATER: {
    MIN: 0,
    MAX: 10000, // 10 litros
    UNIT: 'ml'
  },
  CALORIES: {
    MIN: 0,
    MAX: 10000, // Máximo sensato en un día
    UNIT: 'kcal'
  },
  WEIGHT: {
    MIN: 20,
    MAX: 500,
    UNIT: 'kg'
  },
  HEIGHT: {
    MIN: 50,
    MAX: 250,
    UNIT: 'cm'
  },
  AGE: {
    MIN: 10,
    MAX: 120,
    UNIT: 'años'
  }
};

/**
 * Valida ingesta de agua
 * @param {number} amountMl - Cantidad de agua en mililitros
 * @returns {object} { isValid, message }
 */
export const validateWaterIntake = (amountMl) => {
  // Verificar que sea número
  if (amountMl === null || amountMl === undefined || amountMl === '') {
    return {
      isValid: false,
      message: 'Por favor ingresa una cantidad de agua'
    };
  }

  const amount = parseFloat(amountMl);

  // Verificar que sea número válido
  if (isNaN(amount)) {
    return {
      isValid: false,
      message: 'Debes ingresar un número válido'
    };
  }

  // Verificar negativos
  if (amount < 0) {
    return {
      isValid: false,
      message: 'No puedes agregar una cantidad negativa de agua 🚫'
    };
  }

  // Verificar cero
  if (amount === 0) {
    return {
      isValid: false,
      message: 'Ingresa una cantidad de agua mayor a 0'
    };
  }

  // Verificar máximo (10 litros = 10000 ml)
  if (amount > ValidationLimits.WATER.MAX) {
    return {
      isValid: false,
      message: `Cifra incoherente de agua 💧 (máximo sensato: ${ValidationLimits.WATER.MAX}ml = 10L)`
    };
  }

  // Validación exitosa
  return {
    isValid: true,
    message: null,
    sanitizedValue: Math.round(amount) // Redondear a entero
  };
};

/**
 * Valida ingesta de calorías
 * @param {number} calories - Cantidad de calorías
 * @returns {object} { isValid, message }
 */
export const validateCalories = (calories) => {
  if (calories === null || calories === undefined || calories === '') {
    return {
      isValid: false,
      message: 'Por favor ingresa cantidad de calorías'
    };
  }

  const amount = parseFloat(calories);

  if (isNaN(amount)) {
    return {
      isValid: false,
      message: 'Debes ingresar un número válido'
    };
  }

  if (amount < 0) {
    return {
      isValid: false,
      message: 'No puedes agregar calorías negativas 🚫'
    };
  }

  if (amount === 0) {
    return {
      isValid: false,
      message: 'Ingresa una cantidad de calorías mayor a 0'
    };
  }

  if (amount > ValidationLimits.CALORIES.MAX) {
    return {
      isValid: false,
      message: `Cifra incoherente de calorías 🔥 (máximo sensato: ${ValidationLimits.CALORIES.MAX}kcal)`
    };
  }

  return {
    isValid: true,
    message: null,
    sanitizedValue: Math.round(amount)
  };
};

/**
 * Valida peso
 * @param {number} weight - Peso en kg
 * @returns {object} { isValid, message }
 */
export const validateWeight = (weight) => {
  if (weight === null || weight === undefined || weight === '') {
    return {
      isValid: false,
      message: 'Por favor ingresa tu peso'
    };
  }

  const amount = parseFloat(weight);

  if (isNaN(amount)) {
    return {
      isValid: false,
      message: 'Debes ingresar un número válido'
    };
  }

  if (amount < ValidationLimits.WEIGHT.MIN) {
    return {
      isValid: false,
      message: `Peso incoherente ⚖️ (mínimo sensato: ${ValidationLimits.WEIGHT.MIN}kg)`
    };
  }

  if (amount > ValidationLimits.WEIGHT.MAX) {
    return {
      isValid: false,
      message: `Peso incoherente ⚖️ (máximo sensato: ${ValidationLimits.WEIGHT.MAX}kg)`
    };
  }

  return {
    isValid: true,
    message: null,
    sanitizedValue: parseFloat(amount.toFixed(1)) // 1 decimal
  };
};

/**
 * Valida altura
 * @param {number} height - Altura en cm
 * @returns {object} { isValid, message }
 */
export const validateHeight = (height) => {
  if (height === null || height === undefined || height === '') {
    return {
      isValid: false,
      message: 'Por favor ingresa tu altura'
    };
  }

  const amount = parseFloat(height);

  if (isNaN(amount)) {
    return {
      isValid: false,
      message: 'Debes ingresar un número válido'
    };
  }

  if (amount < ValidationLimits.HEIGHT.MIN) {
    return {
      isValid: false,
      message: `Altura incoherente 📏 (mínimo sensato: ${ValidationLimits.HEIGHT.MIN}cm)`
    };
  }

  if (amount > ValidationLimits.HEIGHT.MAX) {
    return {
      isValid: false,
      message: `Altura incoherente 📏 (máximo sensato: ${ValidationLimits.HEIGHT.MAX}cm)`
    };
  }

  return {
    isValid: true,
    message: null,
    sanitizedValue: amount
  };
};

/**
 * Valida edad
 * @param {number} age - Edad en años
 * @returns {object} { isValid, message }
 */
export const validateAge = (age) => {
  if (age === null || age === undefined || age === '') {
    return {
      isValid: false,
      message: 'Por favor ingresa tu edad'
    };
  }

  const amount = parseFloat(age);

  if (isNaN(amount)) {
    return {
      isValid: false,
      message: 'Debes ingresar un número válido'
    };
  }

  if (amount < ValidationLimits.AGE.MIN) {
    return {
      isValid: false,
      message: `Edad incoherente 🎂 (mínimo: ${ValidationLimits.AGE.MIN} años)`
    };
  }

  if (amount > ValidationLimits.AGE.MAX) {
    return {
      isValid: false,
      message: `Edad incoherente 🎂 (máximo: ${ValidationLimits.AGE.MAX} años)`
    };
  }

  if (!Number.isInteger(amount)) {
    return {
      isValid: false,
      message: 'La edad debe ser un número entero'
    };
  }

  return {
    isValid: true,
    message: null,
    sanitizedValue: Math.round(amount)
  };
};
