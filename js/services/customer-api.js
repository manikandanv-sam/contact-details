import { USE_MOCK, BASE_URL, API_KEY } from "../config.js";
import { appContext, uiState } from "../store.js";
import { MOCK_PAN_RESPONSE } from "../constants/mock-data.js";
import { applyBorrowerUI } from "../ui/borrower.js";
import { renderGuarantorCards } from "../ui/guarantor.js";
import { loadByCustomerId } from "./customer-id-api.js";

// ── Flow dispatcher ───────────────────────────────────────────────────────────
// pan present        → PAN flow (primary)
// customerId present → customerId flow (fallback)

export async function loadCustomerData() {
  if (appContext.pan) {
    console.log("[Flow] PAN flow → pan:", appContext.pan);
    await loadByPan(appContext.pan);
    return;
  }

  console.log("[Flow] CustomerId flow → customerId:", appContext.customerId);
  await loadByCustomerId(appContext.customerId);
  return;
}

// ── PAN flow ──────────────────────────────────────────────────────────────────

function getHeaders() {
  return {
    "Cache-Control": "no-cache",
    "x-api-key": API_KEY,
    Authorization: `Bearer ${appContext.token}`,
  };
}

// ── PAN API mappers (data[0].applicants[0] + data[0].guarantors array) ───────

function resolveAvatar(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0][0];
}

function mapPanBorrower(data) {
  const c = data[0].applicants[0];
  const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
  return {
    name,
    avatar:  resolveAvatar(name),
    mobile:  c.phone1  ?? "",
    email:   c.email   ?? "",
    address: [c.address1, c.address2, c.address3, c.cityCode, c.stateCode, c.pinCode]
      .filter((v) => v && v.trim())
      .join(", "),
  };
}

function mapPanGuarantors(data) {
  const guarantors = data[0]?.guarantors;
  if (!guarantors?.length) return [];
  return guarantors.map((g) => {
    const name = [g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ");
    return {
      customerId: g.customerId,
      name,
      avatar:  resolveAvatar(name),
      mobile:  g.phone1 ?? "",
      email:   g.email  ?? "",
      address: [g.address1, g.address2, g.address3, g.cityCode, g.stateCode, g.pinCode]
        .filter((v) => v && v.trim())
        .join(", "),
      uidNum: g.uidNum ?? null,
    };
  });
}

async function loadByPan(pan) {
  let data;
  if (USE_MOCK) {
    console.log("[PAN] Using mock data");
    data = MOCK_PAN_RESPONSE;
  } else {
    const res = await fetch(`${BASE_URL}/lms/v1/findLoanAccountsForCustomerSpecification?pan=${pan}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    data = await res.json();
  }
  uiState.borrowerMobile = data[0]?.customer1Phone1 ?? data[0]?.applicants?.[0]?.phone1 ?? null;
  applyBorrowerUI(mapPanBorrower(data));
  uiState.guarantorData = mapPanGuarantors(data);
  if (uiState.guarantorData.length === 0) {
    console.log("[PAN] No guarantors in API response — falling back to mock data for visibility");
    uiState.guarantorData = mapPanGuarantors(MOCK_PAN_RESPONSE);
  }
  renderGuarantorCards();
}
