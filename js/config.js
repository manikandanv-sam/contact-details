const BASE_URL = window.ENV?.BASE_URL ?? "";

export const USE_MOCK          = window.ENV?.USE_MOCK          ?? true;
export const CLIENT_ID         = window.ENV?.CLIENT_ID         ?? "";
export const CUSTOMER_API_BASE = window.ENV?.CUSTOMER_API_BASE ?? "";
export const LMS_API_KEY       = window.ENV?.LMS_API_KEY       ?? "";

export const OTP_CONFIG = {
  baseUrl: `${BASE_URL}/unnati-onlending/v1`,
  apiKey:  window.ENV?.OTP_API_KEY ?? "",
};

export const LMS_CONFIG = {
  baseUrl: `${BASE_URL}/lms/v1`,
};
