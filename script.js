const AUTH_CONFIG = {
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjM1MiwicGFydG5lckNvZGUiOiIwMDAwMDAwMDAwMDgwNjMzIiwidXNlcm5hbWUiOiJhc2NlbmRAc2FtdW5uYXRpLmNvbSIsInBhcnRuZXJJZCI6MTc1LCJpYXQiOjE3NzczNTI2NTQsImV4cCI6MTc3NzQzOTA1NH0.3imrQIMND3NdbxQVx15q4S_1w60aiNuONtrGmRY4qws", // full token
  clientId: "9a8babb6-f13c-4fe8-8ef8-c2652f6cef38",
};
const OTP_CONFIG = {
  baseUrl: "https://nonprodapi.samunnati.com/unnati-onlending/v1",
  apiKey: "2970a613ca4a46e4b622c5bebc9c8a89",
};
const USE_MOCK = true;
let pendingUpdate = null;
let isOtpStep = false;

const MOCK_API_RESPONSE = {
  success: true,
  response: {
    borrowerDetails: {
      name: "Ankit Sharma",
      mobile: "9123456780",
      email: "ankit.sharma@gmail.com",
      customerUrn: "0000000002001",
      address: "Delhi, India",
    },
    guarantorDetails: [
      {
        name: "Vikas Gupta",
        mobile: "9234567810",
        email: "vikas.gupta@gmail.com",
        customerUrn: "0000000003001",
        address: "Noida, Uttar Pradesh",
      },
      {
        name: "Amit Verma",
        mobile: "9345678120",
        email: "amit.verma@gmail.com",
        customerUrn: "0000000003002",
        address: "Ghaziabad, Uttar Pradesh",
      },
      {
        name: "Rajeev Singh",
        mobile: "9456781230",
        email: "rajeev.singh@gmail.com",
        customerUrn: "0000000003003",
        address: "Gurgaon, Haryana",
      },
    ],
  },
  message: "Customer communication details fetched successfully",
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

function applyCustomerData(data) {
  if (!data.success) {
    console.error("API returned failure");
    return;
  }

  const borrower = data.response.borrowerDetails;
  guarantorData = data.response.guarantorDetails;

  // Borrower UI
  document.getElementById("borrower-name").innerText = borrower.name;
  document.getElementById("mobile").innerText = borrower.mobile;
  document.getElementById("email").innerText = borrower.email;
  document.getElementById("address").innerText = borrower.address;

  document.getElementById("avatar").innerText = borrower.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  // Dropdown
  renderGuarantorDropdown();
}

async function loadCustomerData() {
  if (USE_MOCK) {
    console.log(" Using MOCK data");
    applyCustomerData(MOCK_API_RESPONSE);
    return;
  }
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
  isOtpStep = false;

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

  const input = document.getElementById("sheetInput");
  input.value = "";
  input.placeholder = "Enter " + label.toLowerCase();
  input.style.display = "block"; // restore if hidden

  const btn = document.getElementById("sheetSubmitBtn");
  btn.innerText = "Send OTP";
  btn.onclick = submitSheet; // reset handler

  document.getElementById("bottomSheet").classList.add("active");
}

function closeSheet() {
  document.getElementById("bottomSheet").classList.remove("active");
}

async function submitSheet() {
  const value = document.getElementById("sheetInput").value.trim();

  //VERIFY OTP
  if (isOtpStep) {
    await handleVerifyOtp(value);
    return;
  }

  //VALIDATE INPUT
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

  // STEP 3 → STORE PENDING UPDATE
  const mobile =
    currentType === "guarantor"
      ? guarantorData[selectedGuarantorIndex].mobile
      : document.getElementById("mobile").innerText;

  pendingUpdate = {
    field: currentField,
    type: currentType,
    value,
    mobile,
  };

  // STEP 4 → SEND OTP
  await handleSendOtp(mobile);
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

const realOtp = {
  async sendOtp(mobile) {
    const res = await fetch(`${OTP_CONFIG.baseUrl}/auth/loginViaOTP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_CONFIG.token}`,
        "x-api-key": OTP_CONFIG.apiKey,
      },
      body: JSON.stringify({
        app_version: "3.1.273",
        mobile: mobile,
      }),
    });
    return res.json();
  },

  async verifyOtp(mobile, otp) {
    const res = await fetch(`${OTP_CONFIG.baseUrl}/auth/verifyOTP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_CONFIG.token}`,
        "x-api-key": OTP_CONFIG.apiKey,
      },
      body: JSON.stringify({
        mobile: mobile,
        otp: Number(otp),
      }),
    });

    return res.json();
  },
};

async function handleSendOtp(mobile) {
  try {
    showLoader();
    const res = await otpAdapter.sendOtp(mobile);
    hideLoader();

    if (!res.success) {
      showError(res.message || "Failed to send OTP");
      return;
    }

    console.log("✅ OTP SENT");
    isOtpStep = true;
    showOtpUI(mobile);
  } catch (e) {
    hideLoader();
    console.error("FULL ERROR:", e);
    showError("Network error");
  }
}
function showOtpUI(mobile) {
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

async function handleVerifyOtp(otp) {
  const mobile = pendingUpdate.mobile;

  try {
    showLoader();

    if (!/^\d{4,6}$/.test(otp)) {
      showError("Enter valid OTP");
      return;
    }

    const res = await otpAdapter.verifyOtp(mobile, otp);

    if (!res.success) {
      showError("Invalid OTP");
      return;
    }

    // SUCCESS
    clearError();
    isOtpStep = false;
    showSuccessScreen();
    return;
  } catch (e) {
    console.error(e);
    showError("Verification failed");
  } finally {
    hideLoader();
  }
}
function applyUpdate() {
  const { field, type, value } = pendingUpdate;

  if (type === "guarantor") {
    const g = guarantorData[selectedGuarantorIndex];
    g[field] = value;
    document.getElementById("g-" + field).innerText = value;
  } else {
    document.getElementById(field).innerText = value;
  }

  console.log("🎉 Updated after OTP");

  isOtpStep = false;
  pendingUpdate = null;

  closeSheet();
}

const mockOtp = {
  async sendOtp(mobile) {
    console.log("📦 MOCK OTP SENT to", mobile);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  },

  async verifyOtp(mobile, otp) {
    console.log("📦 MOCK VERIFY", otp);

    return new Promise((resolve) => {
      setTimeout(() => {
        if (otp === "123456") {
          resolve({ success: true });
        } else {
          resolve({ success: false });
        }
      }, 500);
    });
  },
};

const otpAdapter = {
  async sendOtp(mobile) {
    if (USE_MOCK) {
      return mockOtp.sendOtp(mobile);
    } else {
      return realOtp.sendOtp(mobile);
    }
  },

  async verifyOtp(mobile, otp) {
    if (USE_MOCK) {
      return mockOtp.verifyOtp(mobile, otp);
    } else {
      return realOtp.verifyOtp(mobile, otp);
    }
  },
};

function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

function showSuccessScreen() {
  clearError();

  const title = document.getElementById("sheetTitle");
  const currentLabel = document.getElementById("currentLabel");
  const currentValue = document.getElementById("currentValue");
  const newLabel = document.getElementById("newLabel");
  const input = document.getElementById("sheetInput");
  const btn = document.getElementById("sheetSubmitBtn");

  if (!title) console.error("❌ sheetTitle missing");
  if (!currentLabel) console.error("❌ currentLabel missing");
  if (!currentValue) console.error("❌ currentValue missing");
  if (!newLabel) console.error("❌ newLabel missing");
  if (!input) console.error("❌ sheetInput missing");
  if (!btn) console.error("❌ sheetSubmitBtn missing");

  if (!title || !currentLabel || !currentValue || !newLabel || !input || !btn) {
    return;
  }

  title.innerText = "Success";
  currentLabel.innerText = "";
  currentValue.innerText = "Your details have been updated successfully.";
  newLabel.innerText = "";

  input.style.display = "none";

  btn.innerText = "Done";

  btn.onclick = () => {
    applyUpdate();
    input.style.display = "block";
    btn.innerText = "Continue";
    btn.onclick = submitSheet;
  };
}
