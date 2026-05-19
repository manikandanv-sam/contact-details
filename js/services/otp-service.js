import { USE_MOCK, OTP_CONFIG } from "../config.js";
import { appContext } from "../store.js";
import { showLoader, hideLoader } from "../ui/notifications.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";

const realOtp = {
  async sendOtp(mobile) {
    const res = await fetch(`${OTP_CONFIG.baseUrl}/auth/loginViaOTP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appContext.token}`,
        "x-api-key": OTP_CONFIG.apiKey,
      },
      body: JSON.stringify({ app_version: "3.1.273", mobile }),
    });
    return res.json();
  },

  async verifyOtp(mobile, otp) {
    const res = await fetch(`${OTP_CONFIG.baseUrl}/auth/verifyOTP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appContext.token}`,
        "x-api-key": OTP_CONFIG.apiKey,
      },
      body: JSON.stringify({ mobile, otp: Number(otp) }),
    });
    return res.json();
  },
};

const mockOtp = {
  async sendOtp(mobile) {
    console.log("MOCK OTP SENT to", mobile);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ success: true }), 500),
    );
  },

  async verifyOtp(_mobile, otp) {
    return new Promise((resolve) =>
      setTimeout(() => {
        if (otp === "123456") {
          resolve({ success: true });
        } else {
          resolve({ success: false, message: "OTP incorrect" });
        }
      }, 500),
    );
  },
};

const otpAdapter = {
  sendOtp: (mobile) =>
    USE_MOCK ? mockOtp.sendOtp(mobile) : realOtp.sendOtp(mobile),
  verifyOtp: (mobile, otp) =>
    USE_MOCK ? mockOtp.verifyOtp(mobile, otp) : realOtp.verifyOtp(mobile, otp),
};

export async function handleSendOtp(mobile) {
  try {
    showLoader();
    const res = await otpAdapter.sendOtp(mobile);
    if (!res.success) {
      return { success: false, message: res.message || "Failed to send OTP" };
    }
    window.parent.postMessage({ type: MESSAGE_TYPES.OTP_SENT }, "*");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Network error" };
  } finally {
    hideLoader();
  }
}

export async function handleVerifyOtp(mobile, otp) {
  if (!otp || !/^\d+$/.test(otp) || otp.length !== 6) {
    return { success: false, message: "OTP should have 6 digits" };
  }
  try {
    showLoader();
    const res = await otpAdapter.verifyOtp(mobile, otp);
    if (!res.success) {
      return { success: false, message: "OTP incorrect. Enter valid OTP" };
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Verification failed" };
  } finally {
    hideLoader();
  }
}
