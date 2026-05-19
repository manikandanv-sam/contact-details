export const USE_MOCK          = window.ENV?.USE_MOCK          ?? true;
export const CLIENT_ID         = window.ENV?.CLIENT_ID         ?? "";
export const CUSTOMER_API_BASE = window.ENV?.CUSTOMER_API_BASE ?? "";

export const OTP_CONFIG = {
  baseUrl: window.ENV?.OTP_API_BASE ?? "",
  apiKey:  window.ENV?.OTP_API_KEY  ?? "",
};
