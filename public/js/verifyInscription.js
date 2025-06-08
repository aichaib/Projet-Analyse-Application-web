// public/js/verifyInscription.js
const form2 = document.querySelector(".inscription-code-form");
if (form2) {
  form2.addEventListener("submit", async e => {
    e.preventDefault();
    const code = form2.inscriptionCode.value.trim();
    if (!/^\d{6}$/.test(code)) return alert("6 chiffres requis");
    const res = await fetch("/api/inscription/verify", {
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
