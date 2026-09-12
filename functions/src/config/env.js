require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'infria-e1260',
  RATE_LIMIT_RPM: process.env.RATE_LIMIT_RPM || 60,
  RUNTIME_FUNCTION_TIMEOUT_SECONDS: parseInt(process.env.RUNTIME_FUNCTION_TIMEOUT_SECONDS) || 120,
  MAX_FUNCTION_CALLS_PER_REQUEST: parseInt(process.env.MAX_FUNCTION_CALLS_PER_REQUEST) || 5,
  // Max number of functions injected into LLM prompt per request.
  // If project has more active functions than this, relevance filtering applies.
  FUNCTION_INJECT_LIMIT: parseInt(process.env.FUNCTION_INJECT_LIMIT) || 8,
};

