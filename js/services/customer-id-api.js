import { USE_MOCK, LMS_CONFIG, LMS_API_KEY } from "../config.js";
import { appContext } from "../store.js";
import { CUSTOMER_ID_MOCK_RESPONSE } from "../constants/customer-id-mock.js";
import { applyBorrowerUI } from "../ui/borrower.js";

// ── Response mappers ──────────────────────────────────────────────────────────

function resolveAvatar(firstName) {
  const words = (firstName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0][0];
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
  return {
    name:    resolveName(customerName),
    avatar:  resolveAvatar(customerName.firstName),
    mobile:  contact.phone1  ?? "",
    email:   contact.email   ?? "",
    address: resolveAddress(contact.address),
  };
}

// ── API fetch ─────────────────────────────────────────────────────────────────

async function fetchCustomerById(customerId) {
  const res = await fetch(
    `${LMS_CONFIG.baseUrl}/findCustomerLoanAccounts?customerId=${customerId}`,
    {
      headers: {
        "Cache-Control": "no-cache",
        "x-api-key": LMS_API_KEY,
        Authorization: `Bearer ${appContext.token}`,
      },
    },
  );
  return res.json();
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function loadByCustomerId(customerId) {
  const data = USE_MOCK
    ? CUSTOMER_ID_MOCK_RESPONSE
    : await fetchCustomerById(customerId);

  applyBorrowerUI(mapToBorrower(data));
}
