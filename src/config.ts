// src/config.ts
// API configuration - automatically uses correct URL based on environment

const getApiUrl = () => {
  // In production, use the deployed API URL
  // In development, use localhost
  if (import.meta.env.PROD) {
    // TODO: Replace this with your actual Render API URL after deployment
    return 'https://your-api.onrender.com';
  }
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();