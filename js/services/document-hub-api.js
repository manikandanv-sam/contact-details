import { API_KEY, BASE_URL, DOCUMENT_HUB_FOLDER_ID, USE_MOCK } from "../config.js";
import { appContext } from "../store.js";

export async function uploadAddressProof(files) {
  if (USE_MOCK) {
    return {
      success: true,
      response: {
        successfulResults: ["dpnwaiverletter.pdf"],
        failedResults: [],
      },
      message: "1 file(s) added to the folder successfully",
    };
  }
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch(
    `${BASE_URL}/document-hub/v1/ops/miscellaneous/${DOCUMENT_HUB_FOLDER_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appContext.token}`,
        "x-api-key": API_KEY,
      },
      body: formData,
    }
  );
  if (!res.ok) {
    return { success: false, message: `HTTP ${res.status}` };
  }
  const data = await res.json();
  if (!data.success) {
    return { success: false, message: data.message || "Upload failed" };
  }
  return {
    success: true,
    uploadedFiles: data.response.successfulResults,
  };
}
