import { uiState } from "../store.js";
import { labelMap, validateInput } from "../utils/validators.js";
import { handleSendOtp, handleVerifyOtp } from "../services/otp-service.js";
import { showError, clearError } from "./notifications.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";

export function openSheet(field, type = "borrower") {
  uiState.currentField = field;
  uiState.currentType = type;
  uiState.isOtpStep = false;

  clearError();

  const label = labelMap[field];
  document.getElementById("sheetTitle").innerText = "Change " + label;
  document.getElementById("currentLabel").innerText = "Current " + label;
  document.getElementById("newLabel").innerText = "New " + label;

  const currentValue =
    type === "guarantor"
      ? uiState.guarantorData[uiState.selectedGuarantorIndex][field]
      : document.getElementById(field).innerText;

  document.getElementById("currentValue").innerText = currentValue;

  const input = document.getElementById("sheetInput");
  input.value = "";
  input.placeholder = "Enter " + label.toLowerCase();
  input.style.display = "block";

  const btn = document.getElementById("sheetSubmitBtn");
  btn.innerText = "Send OTP";
  btn.onclick = submitSheet;

  document.getElementById("bottomSheet").classList.add("active");
}

export function closeSheet() {
  document.getElementById("bottomSheet").classList.remove("active");
}

export async function submitSheet() {
  const value = document.getElementById("sheetInput").value.trim();

  if (uiState.isOtpStep) {
    if (!value) {
      showError("Please enter OTP");
      return;
    }
    const result = await handleVerifyOtp(uiState.pendingUpdate.mobile, value);
    if (!result.success) {
      showError(result.message);
      return;
    }
    clearError();
    uiState.isOtpStep = false;
    showSuccessScreen();
    return;
  }

  const current = document.getElementById("currentValue").innerText.trim();
  const label = labelMap[uiState.currentField];

  clearError();

  if (!value) {
    showError(`Enter ${label}`);
    return;
  }

  if (value === current) {
    showError(`New ${label} cannot be same as current ${label}`);
    return;
  }

  const error = validateInput(uiState.currentField, value);
  if (error) {
    showError(error);
    return;
  }

  const mobile =
    uiState.currentType === "guarantor"
      ? uiState.guarantorData[uiState.selectedGuarantorIndex].mobile
      : document.getElementById("mobile").innerText;

  uiState.pendingUpdate = {
    field: uiState.currentField,
    type: uiState.currentType,
    value,
    mobile,
  };

  const result = await handleSendOtp(mobile);
  if (!result.success) {
    showError(result.message);
    return;
  }

  uiState.isOtpStep = true;
  showOtpUI(mobile);
}

export function showOtpUI(mobile) {
  document.getElementById("sheetTitle").innerText = "Verify OTP";
  document.getElementById("currentLabel").innerText = "OTP sent to";
  document.getElementById("currentValue").innerText = mobile;
  document.getElementById("newLabel").innerText = "Enter OTP";

  const input = document.getElementById("sheetInput");
  input.value = "";
  input.placeholder = "Enter 6-digit OTP";

  document.getElementById("sheetSubmitBtn").innerText = "Verify OTP";
  clearError();
}

function showSuccessScreen() {
  clearError();

  document.getElementById("sheetTitle").innerText = "Success";
  document.getElementById("currentLabel").innerText = "";
  document.getElementById("currentValue").innerText =
    "Your details have been updated successfully.";
  document.getElementById("newLabel").innerText = "";
  document.getElementById("sheetInput").style.display = "none";

  const btn = document.getElementById("sheetSubmitBtn");
  btn.innerText = "Done";
  btn.onclick = applyUpdate;
}

function applyUpdate() {
  const { field, type, value } = uiState.pendingUpdate;

  if (type === "guarantor") {
    uiState.guarantorData[uiState.selectedGuarantorIndex][field] = value;
    document.getElementById("g-" + field).innerText = value;
  } else {
    document.getElementById(field).innerText = value;
  }

  uiState.isOtpStep = false;
  uiState.pendingUpdate = null;

  closeSheet();

  window.parent.postMessage({ type: MESSAGE_TYPES.CONTACT_UPDATED }, "*");
}
