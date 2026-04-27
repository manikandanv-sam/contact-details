const AUTH_CONFIG = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // full token
  clientId: "9a8babb6-f13c-4fe8-8ef8-c2652f6cef38",
};

function getHeaders() {
  return {
    Authorization: `Bearer ${AUTH_CONFIG.token}`,
    "x-ms-client-principal-id": AUTH_CONFIG.clientId,
  };
}
const labelMap = {
  mobile: "Mobile Number",
  email: "Email Address",
  address: "Address",
};

let guarantorData = [];
let selectedGuarantorIndex = null;
let currentField = null;
let currentType = null;

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active from all
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      // Add active to clicked tab
      tab.classList.add("active");

      // Show corresponding content
      const target = tab.getAttribute("data-tab");
      document.getElementById(target).classList.add("active");
      if (target === "guarantors") {
        renderGuarantorDropdown();
        document.getElementById("dropdownSelected").innerText =
          "Select Guarantor";
        document.getElementById("guarantorCard").style.display = "none";
        selectedGuarantorIndex = null;
      }
    });
  });
  loadCustomerData();

  // Toggle dropdown
  document
    .getElementById("dropdownSelected")
    ?.addEventListener("click", function () {
      const list = document.getElementById("dropdownList");
      list.style.display = list.style.display === "block" ? "none" : "block";
    });

  // Handle item click
  document
    .getElementById("dropdownList")
    ?.addEventListener("click", function (e) {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;

      const index = item.getAttribute("data-index");

      // Update selected text
      document.getElementById("dropdownSelected").innerText =
        guarantorData[index].name;

      // Hide dropdown
      document.getElementById("dropdownList").style.display = "none";

      // Call existing function
      onGuarantorChange(index);
    });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    const wrapper = document.getElementById("guarantorDropdownWrapper");
    if (!wrapper) return;
    if (!wrapper.contains(e.target)) {
      document.getElementById("dropdownList").style.display = "none";
    }
  });
  document.getElementById("sheetInput").addEventListener("input", clearError);
});

function onGuarantorChange(index) {
  if (index === "") return;

  selectedGuarantorIndex = index;
  const g = guarantorData[index];

  console.log("Selected Guarantor ", g);

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

function renderGuarantorDropdown() {
  const list = document.getElementById("dropdownList");
  if (!list) return;

  list.innerHTML = guarantorData
    .map(
      (g, i) => `
      <div class="dropdown-item" data-index="${i}">
        ${g.name}
      </div>
    `,
    )
    .join("");
}

async function loadCustomerData() {
  const res = await fetch(
    "http://localhost:1111/api/customers/customer/details",
    {
      method: "POST",
      headers: getHeaders(),
    },
  );

  const data = await res.json();
  console.log("FULL API RESPONSE ", data);
  const borrower = data.response.borrowerDetails;
  guarantorData = data.response.guarantorDetails;

  console.log("Borrower ", borrower);
  console.log("Guarantors Count ", guarantorData.length);
  console.log("Guarantors Data ", guarantorData);

  document.getElementById("borrower-name").innerText = borrower.name;
  document.getElementById("mobile").innerText = borrower.mobile;
  document.getElementById("email").innerText = borrower.email;
  document.getElementById("address").innerText = borrower.address;

  document.getElementById("avatar").innerText = borrower.name
    .split(" ")
    .map((n) => n[0])
    .join("");
  renderGuarantorDropdown();
}

function changeMobile(type = "borrower") {
  if (type === "guarantor") {
    if (selectedGuarantorIndex === null) {
      alert("Select guarantor first");
      return;
    }

    const g = guarantorData[selectedGuarantorIndex];
    console.log("Guarantor Mobile Update for:", g.customerUrn);
  } else {
    console.log("Borrower Mobile Update");
  }
}

function changeEmail(type = "borrower") {
  if (type === "guarantor") {
    if (selectedGuarantorIndex === null) {
      alert("Select guarantor first");
      return;
    }
    const g = guarantorData[selectedGuarantorIndex];
    console.log("Guarantor Email Update for:", g.customerUrn);
  } else {
    console.log("Borrower Email Update");
  }
}

function changeAddress(type = "borrower") {
  if (type === "guarantor") {
    if (selectedGuarantorIndex === null) {
      alert("Select guarantor first");
      return;
    }
    const g = guarantorData[selectedGuarantorIndex];
    console.log("Guarantor Address Update for:", g.customerUrn);
  } else {
    console.log("Borrower Address Update");
  }
}

function openSheet(field, type = "borrower") {
  currentField = field;
  currentType = type;

  clearError();
  const label = labelMap[field];

  document.getElementById("sheetTitle").innerText = "Change " + label;
  document.getElementById("currentLabel").innerText = "Current " + label;
  document.getElementById("newLabel").innerText = "New " + label;

  let currentValue = "";

  if (type === "guarantor") {
    const g = guarantorData[selectedGuarantorIndex];
    currentValue = g[field];
  } else {
    currentValue = document.getElementById(field).innerText;
  }

  document.getElementById("currentValue").innerText = currentValue;

  document.getElementById("sheetInput").value = "";
  document.getElementById("sheetInput").placeholder =
    "Enter " + label.toLowerCase();

  document.getElementById("bottomSheet").classList.add("active");
}

function closeSheet() {
  document.getElementById("bottomSheet").classList.remove("active");
}

function submitSheet() {
  const value = document.getElementById("sheetInput").value.trim();
  const current = document.getElementById("currentValue").innerText.trim();

  const label = labelMap[currentField];

  clearError();
  if (!value) {
    showError(`Enter ${label}`);
    return;
  }

  if (value === current) {
    showError(`New ${label} cannot be same as current ${label}`);
    return;
  }

  const error = validateInput(currentField, value);
  if (error) {
    showError(error);
    return;
  }

  if (currentType === "guarantor") {
    const g = guarantorData[selectedGuarantorIndex];
    g[currentField] = value;
    document.getElementById("g-" + currentField).innerText = value;
  } else {
    document.getElementById(currentField).innerText = value;
  }

  console.log("Updated Field ", currentField, "Value ", value);
  closeSheet();
}

function validateInput(field, value) {
  if (!value) return "This field is required";

  if (field === "mobile") {
    if (!/^[6-9]\d{9}$/.test(value)) {
      return "Enter valid 10-digit mobile number";
    }
  }

  if (field === "email") {
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      return "Enter valid email address";
    }
  }

  if (field === "address") {
    if (value.length < 5) {
      return "Address too short";
    }
  }

  return null;
}

function showError(message) {
  const err = document.getElementById("inputError");
  err.innerText = message;
  err.style.display = "block";
}

function clearError() {
  const err = document.getElementById("inputError");
  err.innerText = "";
  err.style.display = "none";
}
