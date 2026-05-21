import { uiState } from "../store.js";

export function renderGuarantorCards() {
  const list = document.getElementById("guarantorCardList");
  if (!list) return;

  document.getElementById("guarantorSelectScreen").style.display = "block";
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
    btn.addEventListener("click", () => onGuarantorChange(btn.dataset.index));
  });
}

export function onGuarantorChange(index) {
  const i = parseInt(index, 10);
  uiState.selectedGuarantorIndex = i;
  const g = uiState.guarantorData[i];

  document.getElementById("guarantorSelectScreen").style.display = "none";
  document.getElementById("guarantorCard").style.display = "block";
  document.getElementById("g-name").innerText = g.name;
  document.getElementById("g-mobile").innerText = g.mobile;
  document.getElementById("g-email").innerText = g.email;
  document.getElementById("g-address").innerText = g.address;
  document.getElementById("g-urn").innerText = `Customer ID: ${g.customerId ?? "—"}`;
  document.getElementById("g-avatar").innerText = g.avatar;
}
