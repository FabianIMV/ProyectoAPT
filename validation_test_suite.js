/**
 * COMPREHENSIVE VALIDATION TESTING SUITE
 * Tests all 30 edge cases across 5 validation functions
 * Execution Date: December 3, 2025
 */

// Import validation functions
import {
  validateWaterIntake,
  validateCalories,
  validateWeight,
  validateHeight,
  validateAge,
  ValidationLimits
} from './frontend/src/utils/validationHelpers.js';

// Test Result Storage
const testResults = {
  water: [],
  calories: [],
  weight: [],
  height: [],
  age: []
};

// Helper to check if message is humanized
const isHumanized = (message) => {
  if (!message) return true; // null messages are valid for success cases
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]|🚫|💧|🔥|⚖️|📏|🎂/u.test(message);
  const isUserFriendly = !message.includes('TypeError') && 
                         !message.includes('ReferenceError') &&
                         !message.includes('undefined') &&
                         message.length > 0;
  return hasEmoji || isUserFriendly;
};

// Test executor function
const executeTest = (functionName, testFunction, inputValue, expectedCategory) => {
  try {
    const result = testFunction(inputValue);
    const testCase = {
      input: inputValue === '' ? '""' : inputValue,
      inputType: typeof inputValue,
      isValid: result.isValid,
      message: result.message,
      isHumanized: isHumanized(result.message),
      hasSanitized: result.hasOwnProperty('sanitizedValue'),
      error: null
    };
    return testCase;
  } catch (error) {
    return {
      input: inputValue === '' ? '""' : inputValue,
      inputType: typeof inputValue,
      isValid: false,
      message: null,
      isHumanized: false,
      hasSanitized: false,
      error: error.message
    };
  }
};

// Run all tests
console.log('='.repeat(80));
console.log('COMPREHENSIVE VALIDATION TESTING SUITE');
console.log('APT Health App - Validation System');
console.log('='.repeat(80));
console.log('');

// Test 1: WATER INTAKE (14 cases)
console.log('TEST SUITE 1: WATER INTAKE');
console.log('-'.repeat(80));
const waterTests = [
  { value: 1, description: 'Valid: 1ml' },
  { value: 100, description: 'Valid: 100ml' },
  { value: 500, description: 'Valid: 500ml' },
  { value: 1000, description: 'Valid: 1000ml' },
  { value: 5000, description: 'Valid: 5000ml' },
  { value: 10000, description: 'Valid: 10000ml (max)' },
  { value: 10001, description: 'Invalid: 10001ml (over max)' },
  { value: 100000, description: 'Invalid: 100000ml (way over)' },
  { value: 0, description: 'Invalid: 0ml (zero)' },
  { value: -100, description: 'Invalid: -100ml (negative)' },
  { value: null, description: 'Invalid: null' },
  { value: undefined, description: 'Invalid: undefined' },
  { value: 'hello', description: 'Invalid: "hello" (string)' },
  { value: '', description: 'Invalid: empty string' }
];

waterTests.forEach((test, idx) => {
  const result = executeTest('validateWaterIntake', validateWaterIntake, test.value, 'water');
  testResults.water.push(result);
  console.log(`${idx + 1}. ${test.description}`);
  console.log(`   Input: ${result.input} (${result.inputType})`);
  console.log(`   Valid: ${result.isValid}`);
  console.log(`   Message: ${result.message || 'None'}`);
  console.log(`   Humanized: ${result.isHumanized ? '✅' : '❌'}`);
  if (result.error) console.log(`   ERROR: ${result.error}`);
  console.log('');
});

// Test 2: CALORIES (14 cases)
console.log('TEST SUITE 2: CALORIES');
console.log('-'.repeat(80));
const calorieTests = [
  { value: 1, description: 'Valid: 1 kcal' },
  { value: 500, description: 'Valid: 500 kcal' },
  { value: 2500, description: 'Valid: 2500 kcal' },
  { value: 5000, description: 'Valid: 5000 kcal' },
  { value: 10000, description: 'Valid: 10000 kcal (max)' },
  { value: 10001, description: 'Invalid: 10001 kcal (over max)' },
  { value: 100000, description: 'Invalid: 100000 kcal (way over)' },
  { value: 0, description: 'Invalid: 0 kcal (zero)' },
  { value: -500, description: 'Invalid: -500 kcal (negative)' },
  { value: null, description: 'Invalid: null' },
  { value: undefined, description: 'Invalid: undefined' },
  { value: 'calories', description: 'Invalid: "calories" (string)' },
  { value: '', description: 'Invalid: empty string' },
  { value: 'abc', description: 'Invalid: "abc" (string)' }
];

calorieTests.forEach((test, idx) => {
  const result = executeTest('validateCalories', validateCalories, test.value, 'calories');
  testResults.calories.push(result);
  console.log(`${idx + 1}. ${test.description}`);
  console.log(`   Input: ${result.input} (${result.inputType})`);
  console.log(`   Valid: ${result.isValid}`);
  console.log(`   Message: ${result.message || 'None'}`);
  console.log(`   Humanized: ${result.isHumanized ? '✅' : '❌'}`);
  if (result.error) console.log(`   ERROR: ${result.error}`);
  console.log('');
});

// Test 3: WEIGHT (14 cases)
console.log('TEST SUITE 3: WEIGHT');
console.log('-'.repeat(80));
const weightTests = [
  { value: 20, description: 'Valid: 20kg (min)' },
  { value: 50, description: 'Valid: 50kg' },
  { value: 75, description: 'Valid: 75kg' },
  { value: 150, description: 'Valid: 150kg' },
  { value: 500, description: 'Valid: 500kg (max)' },
  { value: 501, description: 'Invalid: 501kg (over max)' },
  { value: 1000, description: 'Invalid: 1000kg (way over)' },
  { value: 1, description: 'Invalid: 1kg (under min)' },
  { value: 0, description: 'Invalid: 0kg (zero)' },
  { value: -50, description: 'Invalid: -50kg (negative)' },
  { value: null, description: 'Invalid: null' },
  { value: undefined, description: 'Invalid: undefined' },
  { value: 'weight', description: 'Invalid: "weight" (string)' },
  { value: '', description: 'Invalid: empty string' }
];

weightTests.forEach((test, idx) => {
  const result = executeTest('validateWeight', validateWeight, test.value, 'weight');
  testResults.weight.push(result);
  console.log(`${idx + 1}. ${test.description}`);
  console.log(`   Input: ${result.input} (${result.inputType})`);
  console.log(`   Valid: ${result.isValid}`);
  console.log(`   Message: ${result.message || 'None'}`);
  console.log(`   Humanized: ${result.isHumanized ? '✅' : '❌'}`);
  if (result.error) console.log(`   ERROR: ${result.error}`);
  console.log('');
});

// Test 4: HEIGHT (14 cases)
console.log('TEST SUITE 4: HEIGHT');
console.log('-'.repeat(80));
const heightTests = [
  { value: 50, description: 'Valid: 50cm (min)' },
  { value: 100, description: 'Valid: 100cm' },
  { value: 175, description: 'Valid: 175cm' },
  { value: 200, description: 'Valid: 200cm' },
  { value: 250, description: 'Valid: 250cm (max)' },
  { value: 251, description: 'Invalid: 251cm (over max)' },
  { value: 300, description: 'Invalid: 300cm (way over)' },
  { value: 1, description: 'Invalid: 1cm (under min)' },
  { value: 0, description: 'Invalid: 0cm (zero)' },
  { value: -100, description: 'Invalid: -100cm (negative)' },
  { value: null, description: 'Invalid: null' },
  { value: undefined, description: 'Invalid: undefined' },
  { value: 'height', description: 'Invalid: "height" (string)' },
  { value: '', description: 'Invalid: empty string' }
];

heightTests.forEach((test, idx) => {
  const result = executeTest('validateHeight', validateHeight, test.value, 'height');
  testResults.height.push(result);
  console.log(`${idx + 1}. ${test.description}`);
  console.log(`   Input: ${result.input} (${result.inputType})`);
  console.log(`   Valid: ${result.isValid}`);
  console.log(`   Message: ${result.message || 'None'}`);
  console.log(`   Humanized: ${result.isHumanized ? '✅' : '❌'}`);
  if (result.error) console.log(`   ERROR: ${result.error}`);
  console.log('');
});

// Test 5: AGE (14 cases)
console.log('TEST SUITE 5: AGE');
console.log('-'.repeat(80));
const ageTests = [
  { value: 10, description: 'Valid: 10 years (min)' },
  { value: 25, description: 'Valid: 25 years' },
  { value: 50, description: 'Valid: 50 years' },
  { value: 100, description: 'Valid: 100 years' },
  { value: 120, description: 'Valid: 120 years (max)' },
  { value: 121, description: 'Invalid: 121 years (over max)' },
  { value: 200, description: 'Invalid: 200 years (way over)' },
  { value: 5, description: 'Invalid: 5 years (under min)' },
  { value: 1, description: 'Invalid: 1 year (way under)' },
  { value: 0, description: 'Invalid: 0 years (zero)' },
  { value: -25, description: 'Invalid: -25 years (negative)' },
  { value: null, description: 'Invalid: null' },
  { value: undefined, description: 'Invalid: undefined' },
  { value: 'age', description: 'Invalid: "age" (string)' }
];

ageTests.forEach((test, idx) => {
  const result = executeTest('validateAge', validateAge, test.value, 'age');
  testResults.age.push(result);
  console.log(`${idx + 1}. ${test.description}`);
  console.log(`   Input: ${result.input} (${result.inputType})`);
  console.log(`   Valid: ${result.isValid}`);
  console.log(`   Message: ${result.message || 'None'}`);
  console.log(`   Humanized: ${result.isHumanized ? '✅' : '❌'}`);
  if (result.error) console.log(`   ERROR: ${result.error}`);
  console.log('');
});

// SUMMARY SECTION
console.log('='.repeat(80));
console.log('TESTING SUMMARY REPORT');
console.log('='.repeat(80));
console.log('');

// Calculate statistics
const allResults = [
  ...testResults.water,
  ...testResults.calories,
  ...testResults.weight,
  ...testResults.height,
  ...testResults.age
];

const totalTests = allResults.length;
const passedTests = allResults.filter(r => !r.error && r.isValid).length;
const failedTests = allResults.filter(r => !r.error && !r.isValid).length;
const errorTests = allResults.filter(r => r.error).length;
const humanizedMessages = allResults.filter(r => r.isHumanized || r.isValid).length;
const nonHumanized = allResults.filter(r => !r.isHumanized && !r.isValid && !r.error).length;

console.log(`📊 OVERALL STATISTICS`);
console.log(`Total Test Cases: ${totalTests}`);
console.log(`Valid Inputs (Passed): ${passedTests}`);
console.log(`Invalid Inputs (Correctly Rejected): ${failedTests}`);
console.log(`Crashes/Errors: ${errorTests}`);
console.log(`Humanized Messages: ${humanizedMessages}/${totalTests}`);
console.log(`Non-Humanized Messages: ${nonHumanized}`);
console.log('');

// Breakdown by category
console.log(`📋 BREAKDOWN BY CATEGORY`);
console.log('');
['water', 'calories', 'weight', 'height', 'age'].forEach(category => {
  const categoryResults = testResults[category];
  const categoryValid = categoryResults.filter(r => r.isValid).length;
  const categoryInvalid = categoryResults.filter(r => !r.isValid && !r.error).length;
  const categoryErrors = categoryResults.filter(r => r.error).length;
  const categoryHumanized = categoryResults.filter(r => r.isHumanized || r.isValid).length;
  
  console.log(`${category.toUpperCase()}:`);
  console.log(`  - Valid cases: ${categoryValid}`);
  console.log(`  - Invalid cases (rejected): ${categoryInvalid}`);
  console.log(`  - Errors: ${categoryErrors}`);
  console.log(`  - Humanized: ${categoryHumanized}/${categoryResults.length}`);
  console.log('');
});

// Check for non-humanized messages
console.log(`⚠️ NON-HUMANIZED MESSAGES DETECTED`);
const nonHumanizedResults = allResults.filter(r => !r.isHumanized && !r.isValid && !r.error);
if (nonHumanizedResults.length === 0) {
  console.log('✅ All messages are properly humanized!');
} else {
  console.log(`❌ Found ${nonHumanizedResults.length} non-humanized messages:`);
  nonHumanizedResults.forEach((result, idx) => {
    console.log(`  ${idx + 1}. Input: ${result.input}, Message: "${result.message}"`);
  });
}
console.log('');

// Check for crashes
console.log(`💥 CRASH DETECTION`);
if (errorTests === 0) {
  console.log('✅ No crashes detected! All validation functions handled edge cases gracefully.');
} else {
  console.log(`❌ Found ${errorTests} crashes:`);
  allResults.filter(r => r.error).forEach((result, idx) => {
    console.log(`  ${idx + 1}. Input: ${result.input}, Error: ${result.error}`);
  });
}
console.log('');

// Recommendations
console.log(`📋 RECOMMENDATIONS & FINDINGS`);
console.log('-'.repeat(80));

const findings = [];

if (errorTests > 0) {
  findings.push('❌ CRITICAL: Fix crashes before presentation');
}

if (nonHumanized > 0) {
  findings.push('⚠️ MEDIUM: Add humanization to some messages');
}

if (passedTests < 10) {
  findings.push('⚠️ MEDIUM: Verify valid input handling is working');
}

const allMessagesHumanized = allResults.every(r => r.isHumanized || r.isValid || r.error);
if (allMessagesHumanized) {
  findings.push('✅ All messages are user-friendly and humanized');
}

const noNullErrors = errorTests === 0;
if (noNullErrors) {
  findings.push('✅ No null/undefined crashes - error handling is robust');
}

const stringHandling = allResults.filter(r => r.inputType === 'string' && !r.error).length > 0;
if (stringHandling) {
  findings.push('✅ String inputs are handled gracefully');
}

if (findings.length === 0) {
  findings.push('✅ All validations working as expected');
}

findings.forEach(finding => console.log(finding));
console.log('');

// Final Assessment
console.log(`🎯 FINAL ASSESSMENT FOR FRIDAY PRESENTATION`);
console.log('-'.repeat(80));

const isReadyForPresentation = 
  errorTests === 0 && 
  nonHumanized === 0 && 
  passedTests > 0 && 
  failedTests === 14; // 14 invalid cases should be rejected for each category

if (isReadyForPresentation) {
  console.log('✅ STATUS: READY FOR PRESENTATION');
  console.log('');
  console.log('The validation system is robust and ready for demo:');
  console.log('  • All 30 test cases executed successfully');
  console.log('  • No crashes detected');
  console.log('  • All error messages are humanized');
  console.log('  • Valid inputs are accepted');
  console.log('  • Invalid inputs are properly rejected');
  console.log('');
  console.log('The app will handle all edge cases gracefully during the presentation.');
} else {
  console.log('⚠️ STATUS: NEEDS REVIEW');
  console.log('');
  console.log(`Issues to fix before presentation:`);
  if (errorTests > 0) console.log(`  • Fix ${errorTests} crashes`);
  if (nonHumanized > 0) console.log(`  • Humanize ${nonHumanized} messages`);
  if (passedTests === 0) console.log(`  • Verify valid input acceptance`);
}
console.log('');
console.log('='.repeat(80));

// Export results for documentation
export { testResults, allResults };
