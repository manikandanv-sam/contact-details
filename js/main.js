import { loadCustomerData } from "./services/customer-api.js";
import { renderGuarantorDropdown, onGuarantorChange } from "./ui/guarantor.js";
import { openSheet, closeSheet } from "./ui/sheet.js";
import { clearError } from "./ui/notifications.js";
import { appContext, uiState } from "./store.js";

// ── Parent ↔ MFE postMessage contract ────────────────────────────────────────
//
//  MFE → CMP : { type: "MFE_READY" }                  fired on load
//  CMP → MFE : { type: "INIT", token, lan,             CMP must send this
//                customerUrn, pan, customerId }
//  MFE → CMP : { type: "OTP_SENT" }                   event notifications
//  MFE → CMP : { type: "CONTACT_UPDATED" }
//  MFE → CMP : { type: "ERROR", message }
//
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("message", (event) => {
  const { type, token, lan, customerUrn, pan, customerId } = event.data ?? {};

  if (type === "INIT") {
    appContext.token = token ?? null;
    appContext.lan = lan ?? null;
    appContext.customerUrn = customerUrn ?? null;
    appContext.pan = pan ?? null;
    appContext.customerId = customerId ?? null;

    const lanEl = document.getElementById("lan");
    if (lanEl && lan) lanEl.innerText = `LAN: ${lan}`;

    loadCustomerData();
  }
});

// Signal the parent CMP that the MFE is mounted and ready to receive INIT.
// In standalone mode (opened directly, not in an iframe), skip the handshake
// and load immediately using mock/default data.
if (window.parent === window) {
  loadCustomerData();
} else {
  window.parent.postMessage({ type: "MFE_READY" }, "*");
}

// ── DOM wiring (module scripts are deferred — DOM is ready at this point) ────

setupTabs();
setupGuarantorDropdown();
setupSheetButtons();
setupChangeButtons();

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
        renderGuarantorDropdown();
        document.getElementById("dropdownSelected").innerText = "Select Guarantor";
        document.getElementById("guarantorCard").style.display = "none";
        uiState.selectedGuarantorIndex = null;
      }
    });
  });
}

// ── Guarantor dropdown ────────────────────────────────────────────────────────

function setupGuarantorDropdown() {
  document.getElementById("dropdownSelected")?.addEventListener("click", () => {
    const list = document.getElementById("dropdownList");
    list.style.display = list.style.display === "block" ? "none" : "block";
  });

  document.getElementById("dropdownList")?.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;
    const index = item.getAttribute("data-index");
    document.getElementById("dropdownSelected").innerText =
      uiState.guarantorData[parseInt(index, 10)].name;
    document.getElementById("dropdownList").style.display = "none";
    onGuarantorChange(index);
  });

  document.addEventListener("click", (e) => {
    const wrapper = document.getElementById("guarantorDropdownWrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById("dropdownList").style.display = "none";
    }
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

// ── Change buttons (data-field + data-type drive which sheet opens) ───────────

function setupChangeButtons() {
  document.querySelectorAll(".change-btn[data-type='borrower']").forEach((btn) => {
    btn.addEventListener("click", () => openSheet(btn.dataset.field, "borrower"));
  });

  document.querySelectorAll(".change-btn[data-type='guarantor']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (uiState.selectedGuarantorIndex === null) {
        alert("Select guarantor first");
        return;
      }
      openSheet(btn.dataset.field, "guarantor");
    });
  });
}
