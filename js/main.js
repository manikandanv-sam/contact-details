import { loadCustomerData } from "./services/customer-api.js";
import { renderGuarantorCards, onGuarantorChange, setupAadhaarScreen, setupGuarantorUpdateTable } from "./ui/guarantor.js";
import { openSheet, closeSheet } from "./ui/sheet.js";
import { clearError, clearGlobalError } from "./ui/notifications.js";
import { appContext } from "./store.js";
import { MESSAGE_TYPES } from "./constants/message-types.js";

// ── Parent ↔ IFRAME postMessage contract ────────────────────────────────────────
//
//  iframe → CMP : { type: "IFRAME_READY" }             fired on mount
//  CMP → iframe : { type: "INIT", token, lan,          CMP must send this
//                   customerUrn, pan, customerId }
//  iframe → CMP : { type: "IFRAME_DOWN" }              fired on beforeunload
//  iframe → CMP : { type: "OTP_SENT" }                 event notifications
//  iframe → CMP : { type: "CONTACT_UPDATED" }
//  iframe → CMP : { type: "ERROR", message }
//
// ─────────────────────────────────────────────────────────────────────────────

let lastInitKey = null;

window.addEventListener("message", (event) => {
  const { type, token, lan, customerUrn, pan, customerId, journeyType, requestorRole } = event.data ?? {};

  if (type === MESSAGE_TYPES.INIT) {
    const initKey = `${pan ?? ""}:${customerId ?? ""}`;
    if (initKey === lastInitKey) return;
    lastInitKey = initKey;

    appContext.token = token ?? null;
    appContext.lan = lan ?? null;
    appContext.customerUrn = customerUrn ?? null;
    appContext.pan = pan ?? null;
    appContext.customerId = customerId ?? null;
    appContext.journeyType = journeyType ?? null;
    appContext.requestorRole = requestorRole ?? null;

    const customerIdEl = document.getElementById("customer-id");
    if (customerIdEl && customerId) customerIdEl.innerText = `Customer ID: ${customerId}`;

    clearGlobalError();
    loadCustomerData();
  }
});

// Signal the parent CMP that the MFE is mounted and ready to receive INIT.
// In standalone mode (opened directly, not in an iframe), skip the handshake
// and load immediately using mock/default data.
if (window.parent === window) {
  loadCustomerData();
} else {
  window.parent.postMessage({ type: MESSAGE_TYPES.IFRAME_READY }, "*");
}

// ── DOM wiring (module scripts are deferred — DOM is ready at this point) ────

setupTabs();
setupSheetButtons();
setupChangeButtons();
setupSubmitModal();
setupAadhaarScreen();
setupGuarantorUpdateTable();

// ── Tab switching ─────────────────────────────────────────────────────────────

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.getAttribute("data-tab")).classList.add("active");

      if (tab.getAttribute("data-tab") === "guarantors") {
        renderGuarantorCards();
      }
    });
  });
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────

function setupSheetButtons() {
  document.getElementById("sheetInput").addEventListener("input", clearError);
  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  document.getElementById("sheetCancelBtn").addEventListener("click", closeSheet);
  document.getElementById("sheetOverlay").addEventListener("click", closeSheet);
  // sheetSubmitBtn handler is set dynamically by openSheet / showSuccessScreen
  // in sheet.js via btn.onclick — do not add a static listener here.
}

// ── Submit request modal (Screen 2) ──────────────────────────────────────────

function setupSubmitModal() {
  const submitBtn = document.getElementById("submitRequestBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const formError = document.getElementById("form-error");

  const inputIds = ["input-contact-number", "input-contact-email", "input-contact-address"];

  function showFormError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }

  function clearFormError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function validateForm() {
    const mobile = document.getElementById("input-contact-number").value.trim();
    const email = document.getElementById("input-contact-email").value.trim();
    const address = document.getElementById("input-contact-address").value.trim();

    if (!mobile && !email && !address) {
      showFormError("Please fill in at least one contact detail to update.");
      return false;
    }

    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
      showFormError("Contact number must be a valid 10-digit Indian mobile number.");
      return false;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      showFormError("Please enter a valid email address.");
      return false;
    }

    if (address && address.length < 5) {
      showFormError("Address must be at least 5 characters.");
      return false;
    }

    clearFormError();
    return true;
  }

  inputIds.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", clearFormError);
  });

  function openModal() {
    if (!validateForm()) return;
    modalOverlay.hidden = false;
  }

  function closeModal() {
    modalOverlay.hidden = true;
    submitBtn.focus();
  }

  submitBtn.addEventListener("click", openModal);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
  });
}

// ── Change buttons (borrower only — guarantor uses the inline table) ─────────

function setupChangeButtons() {
  document.querySelectorAll(".change-btn[data-type='borrower']").forEach((btn) => {
    btn.addEventListener("click", () => openSheet(btn.dataset.field, "borrower"));
  });
}
