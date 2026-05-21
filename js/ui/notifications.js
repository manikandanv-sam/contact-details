export function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
}

export function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

export function showError(message) {
  const err = document.getElementById("inputError");
  err.innerText = message;
  err.style.display = "block";
}

export function clearError() {
  const err = document.getElementById("inputError");
  err.innerText = "";
  err.style.display = "none";
}

export function showGlobalError(message) {
  const banner = document.getElementById("globalError");
  if (!banner) return;
  banner.innerText = message;
  banner.style.display = "block";
}

export function clearGlobalError() {
  const banner = document.getElementById("globalError");
  if (!banner) return;
  banner.innerText = "";
  banner.style.display = "none";
}
