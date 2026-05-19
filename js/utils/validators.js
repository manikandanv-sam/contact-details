export const labelMap = {
  mobile: "Mobile Number",
  email: "Email Address",
  address: "Address",
};

export function validateInput(field, value) {
  if (!value) return "This field is required";

  if (field === "mobile" && !/^[6-9]\d{9}$/.test(value)) {
    return "Enter valid 10-digit mobile number";
  }

  if (field === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
    return "Enter valid email address";
  }

  if (field === "address" && value.length < 5) {
    return "Address too short";
  }

  return null;
}
