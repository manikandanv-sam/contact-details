import { USE_MOCK, COMM_API_BASE, COMM_API_KEY } from "../config.js";
import { appContext } from "../store.js";
import { showLoader, hideLoader } from "../ui/notifications.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";

// ── OTP spec ────────────────────────────────────────────────────────────────
// Type: 6-digit TOTP  |  TTL: 300s  |  Max attempts: 3
// Resend cooldown: 60s (first), 10 min (subsequent)  |  Max resends: 3
// ─────────────────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${appContext.token}`,
    "x-api-key": COMM_API_KEY,
  };
}

// ── Real API adapters ─────────────────────────────────────────────────────────

const realOtp = {
  async generateOtp({ mobileNumber, otpType, journeyType, communicationChannel }) {
    const res = await fetch(`${COMM_API_BASE}/generate-otp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        communicationChannel: communicationChannel ?? "mobile",
        otpType,
        mobileNumber: Number(mobileNumber),
        journeyType,
      }),
    });
    return res.json();
  },

  async verifyOtp({ otpReferenceId, otp }) {
    const res = await fetch(`${COMM_API_BASE}/verify-otp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ otpReferenceId, otp: Number(otp) }),
    });
    return res.json();
  },

  async resendOtp({ otpReferenceId }) {
    const res = await fetch(`${COMM_API_BASE}/resend-otp`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ otpReferenceId }),
    });
    return res.json();
  },
};

// ── Mock adapters (USE_MOCK=true) ─────────────────────────────────────────────

const mockOtp = {
  async generateOtp({ mobileNumber }) {
    console.log("[MOCK] generate-otp for", mobileNumber);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ otpReferenceId: "mock-ref-001", status: "SUCCESS" }), 500),
    );
  },

  async verifyOtp({ otp }) {
    return new Promise((resolve) =>
      setTimeout(() => {
        if (String(otp) === "123456") {
          resolve({ status: "SUCCESS" });
        } else {
          resolve({ status: "FAILURE", message: "OTP incorrect" });
        }
      }, 500),
    );
  },

  async resendOtp() {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ otpReferenceId: "mock-ref-002", status: "SUCCESS" }), 500),
    );
  },
};

const adapter = USE_MOCK ? mockOtp : realOtp;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSuccess(res) {
  return res.status === "SUCCESS" || res.success === true;
}

// ── Exported service functions ────────────────────────────────────────────────

/**
 * Generate a new OTP.
 * @param {string|number} mobileNumber  Guarantor/borrower mobile number
 * @param {{ otpType?: string, journeyType?: string }} options
 * @returns {{ success: boolean, otpReferenceId?: string, message?: string }}
 */
export async function handleSendOtp(mobileNumber, options = {}) {
  const { otpType = "VERIFY_MOBILE", journeyType = "GUARANTOR" } = options;
  try {
    showLoader();
    const res = await adapter.generateOtp({
      mobileNumber,
      otpType,
      journeyType,
      communicationChannel: "mobile",
    });

    const otpReferenceId = res.response?.otpReferenceId ?? res.otpReferenceId;
    if (!otpReferenceId) {
      return { success: false, message: res.message || "Failed to send OTP. Please try again." };
    }

    window.parent.postMessage({ type: MESSAGE_TYPES.OTP_SENT }, "*");
    return { success: true, otpReferenceId };
  } catch (e) {
    console.error("[OTP] generate error", e);
    return { success: false, message: "Network error. Please try again." };
  } finally {
    hideLoader();
  }
}

/**
 * Verify the OTP entered by the user.
 * @param {string} otpReferenceId  Returned by handleSendOtp / handleResendOtp
 * @param {string} otp             6-digit string entered by user
 */
export async function handleVerifyOtp(otpReferenceId, otp) {
  if (!otp || !/^\d{6}$/.test(otp)) {
    return { success: false, message: "Please enter a valid 6-digit OTP." };
  }
  try {
    showLoader();
    const res = await adapter.verifyOtp({ otpReferenceId, otp });

    if (!isSuccess(res)) {
      return { success: false, message: res.response || "Failed to Verify OTP. Please try again." };
    }
    return { success: true };
  } catch (e) {
    console.error("[OTP] verify error", e);
    return { success: false, message: "Verification failed. Please try again." };
  } finally {
    hideLoader();
  }
}

/**
 * Send an email verification link to the given address.
 * The backend updates the email once the user clicks the link.
 * @param {string} email
 * @returns {{ success: boolean, message?: string }}
 */
export async function sendEmailVerificationLink(email) {
  try {
    showLoader();
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true };
    }
    const res = await fetch(`${COMM_API_BASE}/email-verification-link`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || data.status === "FAILURE") {
      return { success: false, message: data.message || "Failed to send verification link." };
    }
    return { success: true };
  } catch (e) {
    console.error("[EMAIL] verification link error", e);
    return { success: false, message: "Network error. Please try again." };
  } finally {
    hideLoader();
  }
}

/**
 * Resend OTP using the existing reference ID.
 * @param {string} otpReferenceId
 * @returns {{ success: boolean, otpReferenceId?: string, message?: string }}
 */
export async function handleResendOtp(otpReferenceId) {
  try {
    showLoader();
    const res = await adapter.resendOtp({ otpReferenceId });

    const newRef = res.response?.otpReferenceId ?? res.otpReferenceId;
    if (!isSuccess(res) && !newRef) {
      return { success: false, message: res.response ? res.response : "Failed to resend OTP. Please try again." };
    }

    window.parent.postMessage({ type: MESSAGE_TYPES.OTP_SENT }, "*");
    return { success: true, otpReferenceId: newRef ?? otpReferenceId };
  } catch (e) {
    console.error("[OTP] resend error", e);
    return { success: false, message: "Network error. Please try again." };
  } finally {
    hideLoader();
  }
}
