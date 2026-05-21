import { USE_MOCK, BASE_URL, API_KEY } from "../config.js";
import { appContext, uiState } from "../store.js";
import { MOCK_PAN_RESPONSE } from "../constants/mock-data.js";
import { applyBorrowerUI } from "../ui/borrower.js";
import { renderGuarantorDropdown } from "../ui/guarantor.js";
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

// ── PAN API mappers (response[0].customer + accounts[0] flat fields) ─────────

function resolveAvatar(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0][0];
}

function mapPanBorrower(data) {
  const c = data.response[0].customer;
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
  const accounts = data.response[0]?.accounts;
  if (!accounts?.length) return [];
  const account = accounts[0];
  const guarantors = [];
  let i = 1;
  while (account[`guarantorCustomerId${i}`] != null) {
    const id        = account[`guarantorCustomerId${i}`];
    const firstName = account[`guarantor${i}FirstName`];
    if (firstName) {
      const name = [firstName, account[`guarantor${i}MiddleName`], account[`guarantor${i}LastName`]]
        .filter(Boolean).join(" ");
      guarantors.push({
        customerId: id,
        name,
        avatar:  resolveAvatar(name),
        mobile:  account[`guarantor${i}Phone1`] ?? "",
        email:   account[`guarantor${i}Email`]  ?? "",
        address: [
          account[`guarantor${i}Address1`],
          account[`guarantor${i}Address2`],
          account[`guarantor${i}Address3`],
          account[`guarantor${i}CityCode`],
          account[`guarantor${i}StateCode`],
          account[`guarantor${i}PinCode`],
        ].filter((v) => v && v.trim()).join(", "),
      });
    }
    i++;
  }
  return guarantors;
}

async function loadByPan(pan) {
  let data;
  if (USE_MOCK) {
    console.log("[PAN] Using mock data");
    data = MOCK_PAN_RESPONSE;
  } else {
    const res = await fetch(`${BASE_URL}/lms/v1/findCustomerLoanInfo?pan=${pan}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    data = await res.json();
  }
  applyBorrowerUI(mapPanBorrower(data));
  uiState.guarantorData = mapPanGuarantors(data);
  if (uiState.guarantorData.length === 0) {
    console.log("[PAN] No guarantors in API response — falling back to mock data for visibility");
    uiState.guarantorData = mapPanGuarantors(MOCK_PAN_RESPONSE);
  }
  renderGuarantorDropdown();
}
