import { uiState } from "../store.js";
import { callAadhaarMobileLink } from "../services/aadhaar-api.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskAadhaar(uidNum) {
  if (!uidNum) return null;
  const digits = uidNum.replace(/\D/g, "");
  if (digits.length >= 4) return `XXXX XXXX ${digits.slice(-4)}`;
  return null;
}

// ── Screen 5: Guarantor selection list ───────────────────────────────────────

export function renderGuarantorCards() {
  const list = document.getElementById("guarantorCardList");
  if (!list) return;

  document.getElementById("guarantorSelectScreen").style.display = "block";
  document.getElementById("aadhaarScreen").style.display = "none";
  document.getElementById("guarantorCard").style.display = "none";
  uiState.selectedGuarantorIndex = null;

  list.innerHTML = uiState.guarantorData
    .map(
      (g, i) => `
        <div class="guarantor-select-card" data-testid="guarantor-card-${i}">
          <div class="guarantor-select-left">
            <div class="guarantor-select-avatar">G${i + 1}</div>
            <div class="guarantor-select-info">
              <div class="guarantor-select-name">Guarantor ${i + 1} – ${g.name}</div>
              <div class="guarantor-select-id">Customer ID: ${g.customerId ?? "—"}</div>
            </div>
          </div>
          <button class="guarantor-select-btn" data-index="${i}" data-testid="select-guarantor-${i}">Select</button>
        </div>`,
    )
    .join("");

  list.querySelectorAll(".guarantor-select-btn").forEach((btn) => {
    btn.addEventListener("click", () => showAadhaarScreen(btn.dataset.index));
  });
}

// ── Screen 6: Aadhaar verification ───────────────────────────────────────────

function showAadhaarScreen(index) {
  const i = parseInt(index, 10);
  uiState.selectedGuarantorIndex = i;
  uiState.aadhaarVerified = false;

  const g = uiState.guarantorData[i];

  document.getElementById("aadhaar-screen-title").textContent =
    `Guarantor ${i + 1} — Aadhaar verification`;

  const masked = maskAadhaar(g.uidNum);
  document.getElementById("aadhaar-masked-display").textContent = masked
    ? `Masked Aadhaar on file: ${masked}`
    : "No Aadhaar on file";

  document.getElementById("aadhaarInput").value = "";
  document.getElementById("aadhaarSuccess").style.display = "none";
  document.getElementById("aadhaarError").style.display = "none";
  document.getElementById("verifyAadhaarBtn").disabled = false;

  document.getElementById("guarantorSelectScreen").style.display = "none";
  document.getElementById("aadhaarScreen").style.display = "block";
  document.getElementById("guarantorCard").style.display = "none";
}

async function verifyAadhaar() {
  const entered = document.getElementById("aadhaarInput").value.replace(/\D/g, "");
  const g = uiState.guarantorData[uiState.selectedGuarantorIndex];
  const storedLast4 = (g.uidNum ?? "").replace(/\D/g, "").slice(-4);
  const btn = document.getElementById("verifyAadhaarBtn");

  if (entered.length !== 12) {
    showAadhaarError("Please enter a valid 12-digit Aadhaar number.");
    return;
  }

  // Local check — last 4 digits must match stored uidNum
  if (storedLast4 && entered.slice(-4) !== storedLast4) {
    showAadhaarError("Entered Aadhaar number does not match our records.");
    return;
  }

  // API verification
  btn.disabled = true;
  btn.textContent = "Verifying…";
  clearAadhaarError();

  try {
    const result = await callAadhaarMobileLink(entered);
    if (result?.response?.isMobileLinked === "Yes") {
      uiState.aadhaarVerified = true;
      document.getElementById("aadhaarSuccess").style.display = "flex";
      setTimeout(proceedToGuarantorCard, 1000);
    } else {
      btn.disabled = false;
      btn.textContent = "Verify Aadhaar";
      showAadhaarError("Aadhaar could not be verified. Please check and try again.");
    }
  } catch {
    btn.disabled = false;
    btn.textContent = "Verify Aadhaar";
    showAadhaarError("Verification service unavailable. Please try again.");
  }
}

function showAadhaarError(msg) {
  const el = document.getElementById("aadhaarError");
  el.textContent = msg;
  el.style.display = "block";
}

function clearAadhaarError() {
  const el = document.getElementById("aadhaarError");
  el.textContent = "";
  el.style.display = "none";
}

// ── Screen 7: Guarantor detail card ──────────────────────────────────────────

function proceedToGuarantorCard() {
  const i = uiState.selectedGuarantorIndex;
  const g = uiState.guarantorData[i];

  document.getElementById("aadhaarScreen").style.display = "none";
  document.getElementById("guarantorCard").style.display = "block";
  document.getElementById("g-name").innerText = g.name;
  document.getElementById("g-mobile").innerText = g.mobile;
  document.getElementById("g-email").innerText = g.email;
  document.getElementById("g-address").innerText = g.address;
  document.getElementById("g-urn").innerText = `Customer ID: ${g.customerId ?? "—"}`;
  document.getElementById("g-avatar").innerText = g.avatar;
}

export function onGuarantorChange(index) {
  uiState.selectedGuarantorIndex = parseInt(index, 10);
  proceedToGuarantorCard();
}

// ── Event wiring for Screen 6 (called once from main.js) ─────────────────────

export function setupAadhaarScreen() {
  const input = document.getElementById("aadhaarInput");

  input.addEventListener("input", () => {
    let val = input.value.replace(/\D/g, "").slice(0, 12);
    if (val.length > 8) {
      val = `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`;
    } else if (val.length > 4) {
      val = `${val.slice(0, 4)} ${val.slice(4)}`;
    }
    input.value = val;
    clearAadhaarError();
  });

  document.getElementById("verifyAadhaarBtn").addEventListener("click", verifyAadhaar);

  document.getElementById("aadhaarCloseBtn").addEventListener("click", renderGuarantorCards);
}
