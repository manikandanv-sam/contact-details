import { USE_MOCK, BASE_URL, API_KEY } from "../config.js";
import { appContext, uiState } from "../store.js";
import { CUSTOMER_ID_MOCK_RESPONSE } from "../constants/customer-id-mock.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";
import { applyBorrowerUI } from "../ui/borrower.js";
import { renderGuarantorCards } from "../ui/guarantor.js";
import { showGlobalError } from "../ui/notifications.js";

// ── Response mappers ──────────────────────────────────────────────────────────

function resolveAvatar(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0][0];
}

function resolveName(customerName) {
  if (customerName.displayName) return customerName.displayName;
  return [customerName.firstName, customerName.middleName, customerName.lastName]
    .filter(Boolean)
    .join(" ");
}

function resolveAddress(address) {
  return [
    address.address1,
    address.address2,
    address.address3,
    address.cityCode,
    address.stateCode,
    address.pinCode,
  ]
    .filter((v) => v && v.trim())
    .join(", ");
}

function mapCustomerIdBorrower(data) {
  const { customerName, contact } = data.customer;
  const name = resolveName(customerName);
  return {
    name,
    avatar:  resolveAvatar(name),
    mobile:  contact.phone1 ?? "",
    email:   contact.email  ?? "",
    address: resolveAddress(contact.address),
  };
}

function mapCustomerIdGuarantors(data) {
  if (!data.accounts?.length) return [];
  const account = data.accounts[0];

  // Use the guarantors array when available — it carries uidNum
  if (account.guarantors?.length) {
    return account.guarantors.map((g) => {
      const name = resolveName(g.customerName);
      return {
        customerId: g.customerId,
        name,
        avatar:  resolveAvatar(name),
        mobile:  g.contact?.phone1 ?? "",
        email:   g.contact?.email  ?? "",
        address: g.contact ? resolveAddress(g.contact) : "",
        uidNum:  g.uidNum ?? null,
      };
    });
  }

  // Fallback to flat fields (no uidNum available)
  const guarantors = [];
  for (let i = 1; i <= 6; i++) {
    const id      = account[`guarantorCustomerId${i}`];
    const nameObj = account[`guarantor${i}Name`];
    const contact = account[`guarantor${i}Contact`];
    if (!id || !nameObj) continue;
    const name = nameObj.fullName ?? nameObj.displayName
      ?? [nameObj.firstName, nameObj.middleName, nameObj.lastName].filter(Boolean).join(" ");
    guarantors.push({
      customerId: id,
      name,
      avatar:  resolveAvatar(name),
      mobile:  contact?.phone1 ?? "",
      email:   contact?.email  ?? "",
      address: contact?.address ? resolveAddress(contact.address) : "",
      uidNum:  null,
    });
  }
  return guarantors;
}

// ── API fetch ─────────────────────────────────────────────────────────────────

async function fetchCustomerById(customerId) {
  const res = await fetch(
    `${BASE_URL}/lms/v1/findCustomerLoanAccounts?customerId=${customerId}`,
    {
      headers: {
        "Cache-Control": "no-cache",
        "x-api-key": API_KEY,
        Authorization: `Bearer ${appContext.token}`,
      },
    },
  );
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function loadByCustomerId(customerId) {
  try {
    console.log(USE_MOCK ? "[CustomerId] Using mock data" : `[CustomerId] Fetching real API → customerId: ${customerId}`);
    const data = USE_MOCK
      ? CUSTOMER_ID_MOCK_RESPONSE
      : await fetchCustomerById(customerId);

    applyBorrowerUI(mapCustomerIdBorrower(data));
    uiState.guarantorData = mapCustomerIdGuarantors(data);
    renderGuarantorCards();
  } catch (err) {
    const code = err.status === 401 ? "UNAUTHORIZED" : "API_ERROR";

    showGlobalError("Unable to load contact details. Please refresh the page.");
    window.parent.postMessage({ type: MESSAGE_TYPES.ERROR, code }, "*");
  }
}
