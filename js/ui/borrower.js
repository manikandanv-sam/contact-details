export function applyBorrowerUI(borrower) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    const hasValue = val && val.trim();
    el.innerText = hasValue ? val : "NA";
    const sourceTag = el.nextElementSibling;
    if (sourceTag?.classList.contains("source-tag")) {
      sourceTag.style.display = hasValue ? "" : "none";
    }
  };
  const setPlain = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setPlain("borrower-name", borrower.name);
  setPlain("avatar", borrower.avatar);
  set("existing-mobile", borrower.mobile);
  set("existing-email", borrower.email);
  set("existing-address", borrower.address);
}
