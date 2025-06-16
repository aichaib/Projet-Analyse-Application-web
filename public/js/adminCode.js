const codeForm = document.querySelector(".admin-code-form");

if (codeForm) {
  codeForm.addEventListener("submit", async e => {
    e.preventDefault();

    const code = codeForm["code"].value.trim();

    // Détecte l’URL pour choisir le bon endpoint
    const isInscription = window.location.pathname.includes("/register/code");
    const endpoint = isInscription ? "/admin/inscription/verify" : "/admin/verify-code";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      console.log("Réponse du serveur :", data);

      if (res.ok) {
        if (data.redirect) {
          window.location.href = data.redirect;
        } else if (isInscription) {
          window.location.href = "/admin/login";
        } else {
          window.location.href = "/accueil/admin";
        }
      } else {
        alert(data.error || "Code invalide ou expiré.");
      }
    } catch (err) {
      alert("Erreur de communication avec le serveur.");
    }
  });
}
