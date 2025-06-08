// public/js/adminCode.js
const form = document.querySelector(".admin-code-form");
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const code = form.adminCode.value.trim();
    if (!/^\d{6}$/.test(code)) return alert("6 chiffres requis");
    const res = await fetch("/api/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const json = await res.json();
    if (res.ok) {
      window.location.replace(json.redirect);
    } else {
      alert(json.message);
    }
  });
}
