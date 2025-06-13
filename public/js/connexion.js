// public/js/connexion.js

// Formulaire Utilisateur
const uForm = document.querySelector(".user-login-form");
if (uForm) {
  uForm.addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      email:      uForm.querySelector('input[name="email"]').value.trim(),
      motDePasse: uForm.querySelector('input[name="motDePasse"]').value
    };

    const res  = await fetch("/connexion", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data)
    });
    const json = await res.json();

    if (res.ok) {
      // si c'est l'admin, on va sur la page 2FA, sinon sur l'accueil user
      if (json.admin2FA) {
        window.location.replace("/admin/code");
      } else {
        window.location.replace("/accueil/user");
      }
    } else {
      alert(json.error || "Échec de la connexion utilisateur");
    }
  });
}


// Formulaire Administrateur
const aForm = document.querySelector(".admin-login-form");
if (aForm) {
  aForm.addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      email:      aForm.querySelector('input[name="email"]').value.trim(),
      motDePasse: aForm.querySelector('input[name="motDePasse"]').value
    };

    const res  = await fetch("/connexion", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data)
    });
    const json = await res.json();

    if (res.ok) {
      // même logique : si admin2FA on va sur /admin/code
      if (json.admin2FA) {
        window.location.replace("/admin/code");
      } else {
        // (idéalement ce cas n'arrive jamais pour un admin)
        window.location.replace("/accueil/user");
      }
    } else {
      alert(json.error || "Échec de la connexion administrateur");
    }
  });
}
