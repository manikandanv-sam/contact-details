// Template for environment configuration.
// Copy this file to env.js, fill in values for your environment.
// env.js is gitignored — never commit it with real values.
//
// CI/CD usage:
//   cp env.example.js env.js
//   sed -i 's|__OTP_API_KEY__|'"$OTP_API_KEY"'|g' env.js
//   sed -i 's|__API_KEY__|'"$API_KEY"'|g' env.js
//   ... repeat for each placeholder

window.ENV = {
  USE_MOCK: false,
  BASE_URL: "__BASE_URL__",                 // e.g. https://api.samunnati.com  (changes per env)
  CUSTOMER_API_BASE: "__CUSTOMER_API_BASE__",
  OTP_API_KEY: "__OTP_API_KEY__",
  API_KEY: "__API_KEY__",
  COMM_API_KEY: "__COMM_API_KEY__",         // x-api-key for communication-details OTP endpoints
  CLIENT_ID: "__CLIENT_ID__",
};
