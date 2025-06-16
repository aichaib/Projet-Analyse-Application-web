// public/js/connexion.js

const uForm = document.querySelector(".user-login-form");
if (uForm) {
  uForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email      = uForm["email"].value.trim();
    const motDePasse = uForm["motDePasse"].value;

    const res  = await fetch("/connexion", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, motDePasse })
    });
    if (res.ok) {
      window.location.href = "/accueil/user";
    } else {
      const json = await res.json().catch(()=>({}));
      alert(json.error || "Échec de la connexion utilisateur");
    }
  });
}
