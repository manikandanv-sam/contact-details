// Context received from the parent CMP via postMessage INIT
export const appContext = {
  pan: null,
  customerId: null,
  token: null,
  lan: null,
  customerUrn: null,
  journeyType: null,
  requestorRole: null,
  uidNum: null,
  existingMobile: null,
  existingEmail: null,
  existingAddress: null,
};

// Runtime UI state shared across modules
export const uiState = {
  guarantorData: [],
  selectedGuarantorIndex: null,
  pendingUpdate: null,
  isOtpStep: false,
  currentField: null,
  currentType: null,
  aadhaarVerified: false,
  borrowerMobile: null,
  uploadedAddressProofRefs: [],
};
