export const API_ENDPOINTS = {
  WEIGHT_CUT_BASE: 'https://c5uudu6dzvn66jblbxrzne5nx40ljner.lambda-url.us-east-1.on.aws/api/v1',
  PROFILE_BASE: 'https://3f8q0vhfcf.execute-api.us-east-1.amazonaws.com/dev',
};

export const WEIGHT_CUT_API = {
  analyze: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/analyze`,
  store: `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/store`,
  getUserPlans: (userId) => `${API_ENDPOINTS.WEIGHT_CUT_BASE}/weight-cut/user/${userId}`,
};

export const PROFILE_API = {
  getProfile: (email) => `${API_ENDPOINTS.PROFILE_BASE}/profile?email=${email}`,
  updateProfile: `${API_ENDPOINTS.PROFILE_BASE}/profile`,
};
