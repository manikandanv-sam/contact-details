// Context received from the parent CMP via postMessage INIT
export const appContext = {
  pan: null,
  customerId: null,
  token: null,
  lan: null,
  customerUrn: null,
};

// Runtime UI state shared across modules
export const uiState = {
  guarantorData: [],
  selectedGuarantorIndex: null,
  pendingUpdate: null,
  isOtpStep: false,
  currentField: null,
  currentType: null,
};
