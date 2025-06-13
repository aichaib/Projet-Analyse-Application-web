// public/js/inscription.js

// Récupération des éléments du DOM

// Utilisateur
let formUser           = document.getElementById("form-inscription-user");
let inputPrenom        = document.getElementById("reg-prenom");
let inputNom           = document.getElementById("reg-nom");
let inputEmail         = document.getElementById("reg-email");
let inputPassword      = document.getElementById("reg-password");
let inputPasswordConf  = document.getElementById("reg-password-confirm");

// Administrateur
let formAdmin          = document.getElementById("form-inscription-admin");
let admPrenom          = document.getElementById("adm-reg-prenom");
let admNom             = document.getElementById("adm-reg-nom");
let admEmail           = document.getElementById("adm-reg-email");
let admPassword        = document.getElementById("adm-reg-password");
let admPasswordConf    = document.getElementById("adm-reg-password-confirm");

// ----- Inscription Utilisateur -----
if (formUser) {
  formUser.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = {
      prenom:     inputPrenom.value.trim(),
      nom:        inputNom.value.trim(),
      email:      inputEmail.value.trim(),
      motDePasse: inputPassword.value
    };

    // Vérification basique côté client
    if (!data.prenom || !data.nom || !data.email || !data.motDePasse) {
      return alert("Merci de remplir tous les champs.");
    }
    if (data.motDePasse !== inputPasswordConf.value) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    try {
      const response = await fetch("/inscription", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data)
      });

      if (response.ok) {
        // redirection vers la page de connexion utilisateur
        window.location.replace("/user/login");
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Échec de l’inscription");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau, réessayez plus tard.");
    }
  });
}

// ----- Inscription Administrateur -----
if (formAdmin) {
  formAdmin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = {
      prenom:     admPrenom.value.trim(),
      nom:        admNom.value.trim(),
      email:      admEmail.value.trim(),
      motDePasse: admPassword.value
    };

    // Vérification basique côté client
    if (!data.prenom || !data.nom || !data.email || !data.motDePasse) {
      return alert("Merci de remplir tous les champs.");
    }
    if (data.motDePasse !== admPasswordConf.value) {
      return alert("Les mots de passe ne correspondent pas.");
    }

    try {
      const response = await fetch("/admin/inscription", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data)
      });

      if (response.ok) {
        // redirection vers la page de connexion admin
        window.location.replace("/admin/login");
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Échec de la demande d’inscription");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau, réessayez plus tard.");
    }
  });
}
