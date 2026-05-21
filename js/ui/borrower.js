export function applyBorrowerUI(borrower) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set("borrower-name", borrower.name);
  set("avatar", borrower.avatar);
  set("existing-mobile", borrower.mobile);
  set("existing-email", borrower.email);
  set("existing-address", borrower.address);
}
