// Template for environment configuration.
// Copy this file to env.js, fill in values for your environment.
// env.js is gitignored — never commit it with real values.
//
// CI/CD usage:
//   cp env.example.js env.js
//   sed -i 's|__OTP_API_KEY__|'"$OTP_API_KEY"'|g' env.js
//   ... repeat for each placeholder

window.ENV = {
  USE_MOCK: true,
  BASE_URL: "__BASE_URL__",                 // e.g. https://api.samunnati.com  (changes per env)
  CUSTOMER_API_BASE: "__CUSTOMER_API_BASE__",
  OTP_API_KEY: "__OTP_API_KEY__",
  LMS_API_KEY: "__LMS_API_KEY__",
  CLIENT_ID: "__CLIENT_ID__",
};
