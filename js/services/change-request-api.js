import { COMM_API_BASE, COMM_API_KEY, USE_MOCK } from "../config.js";
import { appContext } from "../store.js";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${appContext.token}`,
    "x-api-key": COMM_API_KEY,
  };
}

export async function submitChangeRequest(payload) {
  if (USE_MOCK) {
    return {
      success: true,
      requestId: payload.requestId,
      status: "QUEUED_FOR_REVIEW",
    };
  }
  const res = await fetch(`${COMM_API_BASE}/change-initiate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { success: false, message: `HTTP ${res.status}` };
  }
  const data = await res.json();
  if (!data.success) {
    return {
      success: false,
      message: data.response || data.message || "Failed to Submit",
    };
  }
  return {
    success: true,
    requestId: data.response.requestId,
  };
}
