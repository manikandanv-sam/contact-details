import { USE_MOCK, CLIENT_ID, CUSTOMER_API_BASE } from "../config.js";
import { appContext, uiState } from "../store.js";
import { MOCK_API_RESPONSE } from "../constants/mock-data.js";
import { applyBorrowerUI } from "../ui/borrower.js";
import { renderGuarantorDropdown } from "../ui/guarantor.js";

function getHeaders() {
  return {
    Authorization: `Bearer ${appContext.token}`,
    "x-ms-client-principal-id": CLIENT_ID,
  };
}

function applyCustomerData(data) {
  if (!data.success) {
    console.error("API returned failure");
    return;
  }
  const { borrowerDetails, guarantorDetails } = data.response;
  uiState.guarantorData = guarantorDetails;
  applyBorrowerUI(borrowerDetails);
  renderGuarantorDropdown();
}

export async function loadCustomerData() {
  if (USE_MOCK) {
    console.log("Using MOCK data | PAN:", appContext.pan, "| Customer ID:", appContext.customerId);
    applyCustomerData(MOCK_API_RESPONSE);
    return;
  }

  const res = await fetch(`${CUSTOMER_API_BASE}/api/customers/customer/details`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      pan: appContext.pan,
      customerId: appContext.customerId,
    }),
  });
  const data = await res.json();
  applyCustomerData(data);
}
