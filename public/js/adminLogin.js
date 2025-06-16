// public/js/adminLogin.js

const aForm = document.querySelector(".admin-login-form");
if (aForm) {
  aForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = aForm["email"].value.trim();
    const motDePasse = aForm["motDePasse"].value;

    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, motDePasse })
    });
    const data = await res.json();

    if (res.ok && data.admin2FA) {
      window.location.href = "/admin/code";
    } else {
      alert(data.error || "Erreur de connexion admin");
    }
  });
}
