import { uiState } from "../store.js";

export function renderGuarantorDropdown() {
  const list = document.getElementById("dropdownList");
  if (!list) return;
  list.innerHTML = uiState.guarantorData
    .map(
      (g, i) => `<div class="dropdown-item" data-index="${i}">${g.name}</div>`,
    )
    .join("");
}

export function onGuarantorChange(index) {
  const i = parseInt(index, 10);
  uiState.selectedGuarantorIndex = i;
  const g = uiState.guarantorData[i];

  document.getElementById("guarantorCard").style.display = "block";
  document.getElementById("g-name").innerText = g.name;
  document.getElementById("g-mobile").innerText = g.mobile;
  document.getElementById("g-email").innerText = g.email;
  document.getElementById("g-address").innerText = g.address;
  document.getElementById("g-urn").innerText = `URN: ${g.customerUrn}`;
  document.getElementById("g-avatar").innerText = g.name
    .split(" ")
    .map((n) => n[0])
    .join("");
}
