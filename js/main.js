import { loadCustomerData } from "./services/customer-api.js";
import {
  renderGuarantorCards,
  onGuarantorChange,
  setupAadhaarScreen,
  setupGuarantorUpdateTable,
} from "./ui/guarantor.js";
import { openSheet, closeSheet } from "./ui/sheet.js";
import { clearError, clearGlobalError, showGlobalError } from "./ui/notifications.js";
import { appContext, uiState } from "./store.js";
import { MESSAGE_TYPES } from "./constants/message-types.js";
import { validateInput, setFieldError } from "./utils/validators.js";
import { uploadAddressProof } from "./services/document-hub-api.js";
import { submitChangeRequest } from "./services/change-request-api.js";

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
  const { type, token, lan, customerUrn, pan, customerId, journeyType, requestorRole } =
    event.data ?? {};

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
setupAddressProofUpload();

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

  const fields = [
    { inputId: "input-contact-number", errorId: "b-error-mobile", field: "mobile" },
    { inputId: "input-contact-email", errorId: "b-error-email", field: "email" },
  ];

  function clearAllFieldErrors() {
    fields.forEach(({ inputId, errorId }) =>
      setFieldError(document.getElementById(inputId), document.getElementById(errorId), "")
    );
    formError.hidden = true;
    formError.textContent = "";
  }

  function validateForm() {
    clearAllFieldErrors();

    const mobile = document.getElementById("input-contact-number").value.trim();
    const email = document.getElementById("input-contact-email").value.trim();

    if (!mobile && !email && !uiState.uploadedAddressProofRefs.length) {
      formError.textContent = "Please fill in at least one contact detail to update.";
      formError.hidden = false;
      return false;
    }

    let valid = true;
    fields.forEach(({ inputId, errorId, field }) => {
      const value = document.getElementById(inputId).value.trim();
      if (!value) return;
      const err = validateInput(field, value);
      if (err) {
        setFieldError(document.getElementById(inputId), document.getElementById(errorId), err);
        valid = false;
      }
    });
    return valid;
  }

  fields.forEach(({ inputId, errorId, field }) => {
    document
      .getElementById(inputId)
      ?.addEventListener("input", () =>
        setFieldError(document.getElementById(inputId), document.getElementById(errorId), "")
      );
  });

  function closeModal() {
    modalOverlay.hidden = true;
    submitBtn.focus();
  }

  async function openModal() {
    if (!validateForm()) return;

    const mobile = document.getElementById("input-contact-number").value.trim();
    const email = document.getElementById("input-contact-email").value.trim();

    const changes = {};
    if (mobile) changes.mobile = mobile;
    if (email) changes.email = email;

    const payload = {
      customerId: appContext.customerId,
      journeyType: appContext.journeyType,
      customerType: "BORROWER",
      requestorRole: appContext.requestorRole,
      changes,
      ...(uiState.uploadedAddressProofRefs.length > 0 && {
        B2BAddressProofRefId: uiState.uploadedAddressProofRefs.join(","),
      }),
    };

    const result = await submitChangeRequest(payload);

    if (result.success) {
      modalOverlay.hidden = false;
    } else {
      formError.textContent = result.message || "Submission failed. Please try again.";
      formError.hidden = false;
    }
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

function setupAddressProofUpload() {
  const btn = document.getElementById("attachAddressDoc");
  const input = document.getElementById("addressProofInput");
  const statusEl = document.getElementById("addressProofStatus");
  let localFiles = [];

  btn.addEventListener("click", () => {
    input.value = "";
    input.click();
  });

  // Chip click → preview the locally-stored File object in a new tab
  statusEl.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-file-index]");
    if (!chip) return;
    const file = localFiles[parseInt(chip.dataset.fileIndex, 10)];
    if (file) window.open(URL.createObjectURL(file));
  });

  input.addEventListener("change", async () => {
    if (!input.files.length) return;
    localFiles = Array.from(input.files);

    btn.textContent = "Uploading...";
    btn.disabled = true;
    statusEl.innerHTML = "";

    try {
      const result = await uploadAddressProof(input.files);

      if (result.success) {
        uiState.uploadedAddressProofRefs = result.uploadedFiles;
        btn.textContent = `✓ ${result.uploadedFiles.length} file(s) attached`;
        statusEl.innerHTML = result.uploadedFiles
          .map(
            (f, i) =>
              `<span data-file-index="${i}" style="display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;font-size:11px;color:#15803d;margin-top:4px;cursor:pointer" title="Click to preview">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                ${f}
              </span>`
          )
          .join("");
      } else {
        btn.textContent = "Attach COI / GSTR-3B";
        statusEl.style.color = "#dc2626";
        statusEl.textContent = result.message;
      }
    } catch (e) {
      btn.textContent = "Attach COI / GSTR-3B";
      statusEl.style.color = "#dc2626";
      statusEl.textContent = "Upload failed. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });
}
