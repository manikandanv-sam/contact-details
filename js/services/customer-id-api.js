import { USE_MOCK, BASE_URL, API_KEY } from "../config.js";
import { appContext, uiState } from "../store.js";
import { CUSTOMER_ID_MOCK_RESPONSE } from "../constants/customer-id-mock.js";
import { applyBorrowerUI } from "../ui/borrower.js";
import { renderGuarantorDropdown } from "../ui/guarantor.js";

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

function mapToBorrower(data) {
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

function mapToGuarantors(data) {
  if (!data.accounts?.length) return [];
  const account = data.accounts[0];
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
  const data = await res.json();
  console.log(data);
  return data;
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function loadByCustomerId(customerId) {
  const data = USE_MOCK
    ? CUSTOMER_ID_MOCK_RESPONSE
    : await fetchCustomerById(customerId);

  applyBorrowerUI(mapToBorrower(data));
  uiState.guarantorData = mapToGuarantors(data);
  renderGuarantorDropdown();
}
