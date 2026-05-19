export function applyBorrowerUI(borrower) {
  document.getElementById("borrower-name").innerText = borrower.name;
  document.getElementById("mobile").innerText = borrower.mobile;
  document.getElementById("email").innerText = borrower.email;
  document.getElementById("address").innerText = borrower.address;
  document.getElementById("avatar").innerText = borrower.avatar;
}
