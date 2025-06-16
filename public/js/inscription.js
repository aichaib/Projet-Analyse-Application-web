// public/js/inscription.js

// ── Inscription Utilisateur ──────────────────────────────────────
const formUser = document.querySelector(".register-form");
if (formUser) {
  formUser.addEventListener("submit", async e => {
    e.preventDefault();
    const prenom = formUser["prenom"].value.trim();
    const nom = formUser["nom"].value.trim();
    const email = formUser["email"].value.trim();
    const motDePasse = formUser["motDePasse"].value;
    const confirm = formUser["motDePasseConfirm"].value;

    if (!prenom || !nom || !email || !motDePasse) {
      return alert("Merci de remplir tous les champs.");
    }
    if (motDePasse !== confirm) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    const res = await fetch("/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom, nom, email, motDePasse })
    });

    if (res.ok) {
      window.location.href = "/user/login";
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Échec de l’inscription utilisateur");
    }
  });
}

// ── Inscription Administrateur ──────────────────────────────────
const formAdmin = document.querySelector(".admin-register-form");
if (formAdmin) {
  formAdmin.addEventListener("submit", async e => {
    e.preventDefault();
    const prenom = formAdmin.querySelector('input[name="prenom"]').value.trim();
    const nom = formAdmin.querySelector('input[name="nom"]').value.trim();
    const email = formAdmin.querySelector('input[name="email"]').value.trim();
    const motDePasse = formAdmin.querySelector('input[name="motDePasse"]').value;
    const confirm = formAdmin.querySelector('input[name="motDePasseConfirm"]').value;

    if (!prenom || !nom || !email || !motDePasse) {
      return alert("Merci de remplir tous les champs.");
    }
    if (motDePasse !== confirm) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    const res = await fetch("/admin/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom, nom, email, motDePasse })
    });
    if (res.ok) {
      window.location.href = "/admin/register/code";
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Échec de l’inscription utilisateur");
    }
  
  });
}
