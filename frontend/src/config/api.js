export const API_ENDPOINTS = {
  WEIGHT_CUT_BASE: 'https://c5uudu6dzvn66jblbxrzne5nx40ljner.lambda-url.us-east-1.on.aws/api/v1',
  PROFILE_BASE: 'https://3f8q0vhfcf.execute-api.us-east-1.amazonaws.com/dev',
};

export const WEIGHT_CUT_API = {
  analyze: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/analyze`,
  store: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/store`,
  getUserPlans: (userId) => `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/user/${userId}`,
  activateTimeline: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/activate-timeline`,
  getTimeline: (userId) => `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/timeline/${userId}`,
};

export const PROFILE_API = {
  getProfile: (email) => `${API_ENDPOINTS.PROFILE_BASE}/profile?email=${email}`,
  updateProfile: `${API_ENDPOINTS.PROFILE_BASE}/profile`,
};

// DEPRECATED: Old water endpoints (no longer functional)
// Use Daily Progress API instead via progressService.js
export const WATER_API = {
  addIntake: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/water/add`,
  getDailyIntake: (userId, date) => `${API_ENDPOINTS.WEIGHT_CUT_BASE}/water/daily/${userId}${date ? `?date=${date}` : ''}`,
  getWeeklyIntake: (userId) => `${API_ENDPOINTS.WEIGHT_CUT_BASE}/water/weekly/${userId}`,
};

// Daily Progress API - NEW tracking system
export const PROGRESS_API = {
  base: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress`,
  add: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/add?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
  set: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/set?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
  getDay: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/day?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
  getActive: (userId) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/active/${userId}`,
  reset: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/reset?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
  complete: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/complete?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
  skip: (userId, timelineId, dayNumber) =>
    `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/progress/skip?userId=${userId}&timelineId=${timelineId}&dayNumber=${dayNumber}`,
};

// Nutrition AI Recommendations API
export const NUTRITION_API = {
  recommendations: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/nutrition/recommendations`,
};

// Nutrition Feedback AI API (Tu propia Lambda)
export const NUTRITION_FEEDBACK_API = {
  getDailyFeedback: 'https://h55beo5bczum5yyf7d2glpkgda0lgjiq.lambda-url.us-east-1.on.aws',
};
