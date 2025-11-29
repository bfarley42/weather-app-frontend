// src/config.ts
// API configuration - automatically uses correct URL based on environment

// const getApiUrl = () => {
//   // In production, use the deployed API URL
//   // In development, use localhost
//   if (import.meta.env.PROD) {
//     // TODO: Replace this with your actual Render API URL after deployment
//     return 'https://your-api.onrender.com';
//   }
//   return 'http://localhost:8000';
// };

// export const API_URL = getApiUrl();
// const API_URL = import.meta.env.PROD
//   ? 'https://weather-api-huq7.onrender.com'  // ✅ Your API URL
//   : 'http://localhost:8000';

// export { API_URL };

// Force production API URL
const API_URL = 'https://weather-api-huq7.onrender.com';

export { API_URL };