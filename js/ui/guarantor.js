import { uiState } from "../store.js";
import { callAadhaarMobileLink, callAadhaarOcr } from "../services/aadhaar-api.js";
import { handleSendOtp, handleVerifyOtp, handleResendOtp, sendEmailVerificationLink } from "../services/otp-service.js";
import { validateInput } from "../utils/validators.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskAadhaar(uidNum) {
  if (!uidNum) return null;
  const digits = uidNum.replace(/\D/g, "");
  if (digits.length >= 4) return `XXXX XXXX ${digits.slice(-4)}`;
  return null;
}

// ── Screen 5: Guarantor selection list ───────────────────────────────────────

export function renderGuarantorCards() {
  // Preserve Screen 7 if Aadhaar was already verified — tab switch must not reset state
  if (uiState.aadhaarVerified && uiState.selectedGuarantorIndex !== null) {
    document.getElementById("guarantorSelectScreen").style.display = "none";
    document.getElementById("aadhaarScreen").style.display = "none";
    document.getElementById("guarantorCard").style.display = "block";
    return;
  }

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
  btn.textContent = "Verify Aadhaar";
  clearAadhaarError();

  try {
    const result = await callAadhaarMobileLink(entered, g.mobile);
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

// ── Screen 7: Guarantor update contact details table ─────────────────────────

// Module-level state for the inline table (reset on each entry into Screen 7)
const tableState = {
  mobile:  "idle",   // idle | otp-sent | verified
  email:   "idle",   // idle | link-sent
  address: "idle",   // idle | uploaded
};

// Stores new value + otpReferenceId per field
const pendingValues = {
  mobile:  { value: null, otpReferenceId: null },
  email:   { value: null },
  address: null,
};

// OTP spec: 60s first resend cooldown, 600s (10 min) subsequent, max 3 resends
const RESEND_COOLDOWNS = [60, 600];
const MAX_RESENDS = 3;

const resendState = {
  mobile: { count: 0, timerId: null },
};

// otpType per field (email uses verification link, not OTP)
const OTP_TYPE = { mobile: "VERIFY_MOBILE" };

function proceedToGuarantorCard() {
  const i = uiState.selectedGuarantorIndex;
  const g = uiState.guarantorData[i];

  document.getElementById("g-update-title").textContent =
    `Guarantor ${i + 1} — update contact details`;

  document.getElementById("g-existing-mobile").textContent  = g.mobile;
  document.getElementById("g-existing-email").textContent   = g.email;
  document.getElementById("g-existing-address").textContent = g.address;

  resetOtpField("mobile");
  resetEmailField();
  resetAddressField();

  document.getElementById("g-success-banner").style.display = "none";

  document.getElementById("aadhaarScreen").style.display = "none";
  document.getElementById("guarantorCard").style.display = "block";
}

function resetOtpField(field) {
  tableState[field]    = "idle";
  pendingValues[field] = { value: null, otpReferenceId: null };

  if (resendState[field].timerId) clearInterval(resendState[field].timerId);
  resendState[field] = { count: 0, timerId: null };

  document.getElementById(`g-new-idle-${field}`).style.display     = "block";
  document.getElementById(`g-new-otp-${field}`).style.display      = "none";
  document.getElementById(`g-new-verified-${field}`).style.display = "none";
  document.getElementById(`g-input-${field}`).value                = "";
  document.getElementById(`g-resends-left-${field}`).textContent = ""

  setFieldError(field, "");

  const btn = document.getElementById(`g-btn-${field}`);
  btn.textContent = "Send OTP";
  btn.className   = "g-action-btn g-otp-btn";
  btn.disabled    = false;
}

function resetEmailField() {
  tableState.email    = "idle";
  pendingValues.email = { value: null };

  document.getElementById("g-new-idle-email").style.display     = "block";
  document.getElementById("g-new-verified-email").style.display = "none";
  document.getElementById("g-input-email").value                = "";
  document.getElementById("g-input-email").disabled             = false;

  setFieldError("email", "");

  const btn = document.getElementById("g-btn-email");
  btn.textContent = "Send Link";
  btn.className   = "g-action-btn g-otp-btn";
  btn.disabled    = false;
}

function resetAddressField() {
  tableState.address   = "idle";
  pendingValues.address = null;

  document.getElementById("g-address-auto-text").style.display      = "inline";
  document.getElementById("g-new-verified-address").style.display   = "none";

  const btn = document.getElementById("g-btn-address");
  btn.innerHTML = uploadIcon() + " Upload Aadhaar";
  btn.disabled  = false;
}

function uploadIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>`;
}

function setFieldError(field, msg) {
  const el    = document.getElementById(`g-error-${field}`);
  const input = document.getElementById(`g-input-${field}`);

  el.textContent   = msg;
  el.style.display = msg ? "block" : "none";

  if (input) {
    if (msg) input.classList.add("input-error");
    else     input.classList.remove("input-error");
  }
}

// Dispatches to send or verify based on current field state
function handleOtpFieldBtn(field) {
  if (tableState[field] === "idle")     sendOtpForField(field);
  else if (tableState[field] === "otp-sent") verifyOtpForField(field);
}

async function sendOtpForField(field) {
  const newValue = document.getElementById(`g-input-${field}`).value.trim();
  const g        = uiState.guarantorData[uiState.selectedGuarantorIndex];

  setFieldError(field, "");

  if (!newValue) {
    setFieldError(field, field === "mobile" ? "Enter new number" : "Enter new email");
    return;
  }
  if (newValue === g[field]) {
    setFieldError(field, `New ${field} must differ from existing`);
    return;
  }
  const validationError = validateInput(field, newValue);
  if (validationError) {
    setFieldError(field, validationError);
    return;
  }

  const btn    = document.getElementById(`g-btn-${field}`);
  btn.disabled = true;
  btn.textContent = "Sending…";

  const result = await handleSendOtp(newValue, {
    otpType:     OTP_TYPE[field],
    journeyType: "GUARANTOR",
  });

  if (!result.success) {
    btn.disabled    = false;
    btn.textContent = "Send OTP";
    setFieldError(field, result.message);
    return;
  }

  pendingValues[field] = { value: newValue, otpReferenceId: result.otpReferenceId };
  tableState[field]    = "otp-sent";

  document.getElementById(`g-locked-${field}`).textContent         = newValue;
  document.getElementById(`g-new-idle-${field}`).style.display     = "none";
  document.getElementById(`g-new-otp-${field}`).style.display      = "block";
  document.getElementById(`g-otp-${field}`).value                  = "";

  btn.textContent = "Verify OTP";
  btn.disabled    = false;

  startResendCooldown(field);
}

async function verifyOtpForField(field) {
  const otp = document.getElementById(`g-otp-${field}`).value.trim();
  const g   = uiState.guarantorData[uiState.selectedGuarantorIndex];

  setFieldError(field, "");

  if (!otp) {
    setFieldError(field, "Please enter OTP");
    return;
  }

  const btn    = document.getElementById(`g-btn-${field}`);
  btn.disabled = true;
  btn.textContent = "Verifying…";

  const { otpReferenceId } = pendingValues[field];
  const result = await handleVerifyOtp(otpReferenceId, otp);
  if (!result.success) {
    btn.disabled    = false;
    btn.textContent = "Verify OTP";
    setFieldError(field, result.message);
    return;
  }

  // Stop resend countdown — no longer needed after verification
  if (resendState[field].timerId) clearInterval(resendState[field].timerId);

  tableState[field] = "verified";
  uiState.guarantorData[uiState.selectedGuarantorIndex][field] = pendingValues[field].value;

  document.getElementById(`g-new-otp-${field}`).style.display      = "none";
  document.getElementById(`g-confirmed-${field}`).textContent      = pendingValues[field].value;
  document.getElementById(`g-new-verified-${field}`).style.display = "flex";

  btn.textContent = "✓ Verified";
  btn.className   = "g-action-btn g-otp-btn g-verified";
  btn.disabled    = true;
}

// ── Email verification link ───────────────────────────────────────────────────

async function handleEmailVerificationBtn() {
  if (tableState.email !== "idle") return;

  const newEmail = document.getElementById("g-input-email").value.trim();
  const g        = uiState.guarantorData[uiState.selectedGuarantorIndex];

  setFieldError("email", "");

  if (!newEmail) {
    setFieldError("email", "Enter new email");
    return;
  }
  if (newEmail === g.email) {
    setFieldError("email", "New email must differ from existing");
    return;
  }
  const validationError = validateInput("email", newEmail);
  if (validationError) {
    setFieldError("email", validationError);
    return;
  }

  const btn    = document.getElementById("g-btn-email");
  btn.disabled = true;
  btn.textContent = "Sending…";

  const result = await sendEmailVerificationLink(newEmail);

  if (!result.success) {
    btn.disabled    = false;
    btn.textContent = "Send Link";
    setFieldError("email", result.message);
    return;
  }

  pendingValues.email  = { value: newEmail };
  tableState.email     = "link-sent";

  document.getElementById("g-input-email").disabled = true;

  btn.textContent = "✓ Link Sent";
  btn.className   = "g-action-btn g-otp-btn g-verified";
  btn.disabled    = true;
}

// ── Resend OTP — cooldown timer ───────────────────────────────────────────────
function updateResendsLeft(field){
  const resendLeft = document.getElementById(`g-resends-left-${field}`);
  const remaining = MAX_RESENDS - resendState[field].count;
  if(remaining > 0){
    resendLeft.textContent = `${remaining} ${remaining === 1 ? "Attempt" : "Attempts"} Remaining`;
  }
  else{
    resendLeft.textContent = "";
  }
}


function startResendCooldown(field) {
  const rs  = resendState[field];
  updateResendsLeft(field);
  const btn = document.getElementById(`g-resend-${field}`);
  const cd  = document.getElementById(`g-countdown-${field}`);

  if (!btn || !cd) return;

  btn.disabled = true;
  const seconds = RESEND_COOLDOWNS[Math.min(rs.count, RESEND_COOLDOWNS.length - 1)];
  let remaining = seconds;

  const tick = () => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(rs.timerId);
      rs.timerId = null;
      cd.textContent = "";
      if (rs.count < MAX_RESENDS) btn.disabled = false;
      else cd.textContent = "Max resends reached";
    } else {
      cd.textContent = remaining > 60
        ? `Resend in ${Math.ceil(remaining / 60)}m`
        : `Resend in ${remaining}s`;
    }
  };

  cd.textContent = `Resend in ${remaining}s`;
  if (rs.timerId) clearInterval(rs.timerId);
  rs.timerId = setInterval(tick, 1000);
}

async function handleResendForField(field) {
  const rs = resendState[field];
  if (rs.count >= MAX_RESENDS) return;

  const btn = document.getElementById(`g-resend-${field}`);
  btn.disabled = true;

  const result = await handleResendOtp(pendingValues[field].otpReferenceId);
  if (!result.success) {
    setFieldError(field, result.message);
    btn.disabled = false;
    return;
  }

  pendingValues[field].otpReferenceId = result.otpReferenceId;
  rs.count++;
  startResendCooldown(field);
}

function handleAddressUpload() {
  document.getElementById("g-address-file").click();
}

async function onAddressFileSelected(e) {
  if (!e.target.files?.length) return;
  const file = e.target.files[0];

  //convert file to base64
  const fileB64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const btn     = document.getElementById("g-btn-address");
  btn.disabled    = true;
  btn.textContent = "Processing…";

  const data = await callAadhaarOcr(fileB64);
  if(!data.success){
    setFieldError("address", data.message || "Failed to process Aadhaar.");
    btn.disabled = false;
    btn.innerHTML = uploadIcon() + " Upload Aadhaar";
    return;
  }

  const back = data.response.find(item =>item.type === "Aadhaar Back");
  const address = back?.details?.address?.value;
  if(!address){
    setFieldError("address", "Address not Found. Please upload back side of Aadhaar.");
    btn.disabled = false;
    btn.innerHTML = uploadIcon() + " Upload Aadhaar";
    return;
  }
  tableState.address    = "uploaded";
  pendingValues.address = address;
  document.getElementById("g-address-auto-text").style.display    = "none";
  document.getElementById("g-confirmed-address").textContent      = address;
  document.getElementById("g-new-verified-address").style.display = "flex";
  btn.innerHTML = uploadIcon() + " Re-upload";
  btn.disabled  = false;

  e.target.value = "";
}

async function submitGuarantorUpdates() {
  const hasChange =
    tableState.mobile  === "verified" ||
    tableState.email   === "link-sent" ||
    tableState.address === "uploaded";

  if (!hasChange) {
    setFieldError("mobile", "Please verify at least one field before submitting.");
    return;
  }

  const btn = document.getElementById("g-submit-btn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  window.parent.postMessage({ type: MESSAGE_TYPES.CONTACT_UPDATED }, "*");

  document.getElementById("g-success-banner").style.display = "flex";
  btn.textContent = "Submitted";
}

export function onGuarantorChange(index) {
  uiState.selectedGuarantorIndex = parseInt(index, 10);
  proceedToGuarantorCard();
}

// ── Event wiring (called once from main.js) ───────────────────────────────────

export function setupGuarantorUpdateTable() {
  document.getElementById("g-btn-mobile").addEventListener("click",    () => handleOtpFieldBtn("mobile"));
  document.getElementById("g-btn-email").addEventListener("click",     handleEmailVerificationBtn);
  document.getElementById("g-resend-mobile").addEventListener("click", () => handleResendForField("mobile"));
  document.getElementById("g-btn-address").addEventListener("click",   handleAddressUpload);
  document.getElementById("g-address-file").addEventListener("change", onAddressFileSelected);
  document.getElementById("g-submit-btn").addEventListener("click",    submitGuarantorUpdates);
}

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
  document.getElementById("aadhaarCloseBtn").addEventListener("click",  renderGuarantorCards);
}
