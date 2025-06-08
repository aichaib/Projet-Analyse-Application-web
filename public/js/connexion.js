// public/js/connexion.js
import { isEmailValid, isPasswordValid } from "./validation.js";

// Utilisateur
const uForm = document.querySelector(".user-login-form");
if (uForm) {
  uForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      email:      uForm.userEmail.value,
      motDePasse: uForm.userPassword.value
    };
    const res = await fetch("/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.redirected) {
      window.location.replace(res.url);
    } else if (res.ok) {
      window.location.replace("/dashboard");
    } else {
      const err = await res.json();
      alert(err.error);
    }
  });
}

// Administrateur
const aForm = document.querySelector(".admin-login-form");
if (aForm) {
  aForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      email:      aForm.adminEmail.value,
      motDePasse: aForm.adminPassword.value
    };
    const res = await fetch("/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.redirected) {
      window.location.replace(res.url);
    } else if (res.ok) {
      window.location.replace("/admin/code");
    } else {
      const err = await res.json();
      alert(err.error);
    }
  });
}
