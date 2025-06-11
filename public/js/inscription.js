// public/js/inscription.js
import { isEmailValid, isPasswordValid } from "./validation.js";

// Utilisateur
const uReg = document.querySelector(".register-form");
if (uReg) {
  uReg.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      prenom:     uReg.regPrenom.value,
      nom:        uReg.regNom.value,
      email:      uReg.regEmail.value,
      motDePasse: uReg.regPassword.value
    };
    const res = await fetch("/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      window.location.replace("/user/login");
    } else {
      const err = await res.json();
      alert(err.error);
    }
  });
}

// Administrateur
const aReg = document.querySelector(".admin-register-form");
if (aReg) {
  aReg.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      prenom: aReg.admRegPrenom.value,
      nom:    aReg.admRegNom.value,
      email:  aReg.admRegEmail.value
    };
    const res = await fetch("/admin/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      window.location.replace("/admin/login");
    } else {
      const err = await res.json();
      alert(err.error);
    }
  });
}
