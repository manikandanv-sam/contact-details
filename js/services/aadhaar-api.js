import { BASE_URL, API_KEY, USE_MOCK } from "../config.js";
import { appContext, uiState } from "../store.js";

export async function callAadhaarMobileLink(aadhaar12, guarantorMobile) {
  if (USE_MOCK) {
    console.log("[Aadhaar] Mock mode — simulating successful verification");
    return { success: true, response: { isMobileLinked: "Yes" } };
  }

  const mobile = (guarantorMobile ?? uiState.borrowerMobile ?? "").replace(/\D/g, "");
  const res = await fetch(`${BASE_URL}/aadhaar/v1/aadhaar-mobile-link`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      Authorization: `Bearer ${appContext.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiPayload: {
        mobile,
        aadhaar: aadhaar12,
        consent: "Y",
      },
    }),
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  console.log("[Aadhaar] API response:", JSON.stringify(data, null, 2));
  console.log("[Aadhaar] mobile sent:", mobile, "| aadhaar sent:", aadhaar12);
  return data;
}
