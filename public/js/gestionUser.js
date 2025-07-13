// public/js/gestionUser.js

document.addEventListener("DOMContentLoaded", () => {
  // ─── SUPPRESSION ────────────────────────────────────────────
  document.querySelectorAll(".btn-supprimer").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const id = btn.dataset.id;
      const tr = btn.closest("tr");

      // on supprime d'éventuelles anciennes bulles
      document.querySelectorAll(".confirm-box").forEach(el => el.remove());

      // création de la bulle
      const box = document.createElement("div");
      box.className = "confirm-box";
      box.textContent = "Supprimer ?";

      const yes = document.createElement("button");
      yes.type = "button";
      yes.className = "btn-yes";
      yes.textContent = "Oui";

      const no = document.createElement("button");
      no.type = "button";
      no.className = "btn-no";
      no.textContent = "Non";

      box.appendChild(yes);
      box.appendChild(no);
      document.body.appendChild(box);

      // positionner la bulle sous le bouton
      const rect = btn.getBoundingClientRect();
      box.style.top = `${rect.bottom + window.scrollY + 5}px`;
      box.style.left = `${rect.left + window.scrollX}px`;

      // "Non" : on ferme simplement
      no.addEventListener("click", () => box.remove());

      // "Oui" : on lance la suppression
      yes.addEventListener("click", async () => {
        box.remove();
        // feedback visuel
        const oldText = btn.textContent;
        btn.textContent = "Suppression…";
        btn.disabled = true;

        try {
          const resp = await fetch(`/admin/utilisateurs/${id}`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Accept": "application/json" }
          });
          const data = await resp.json();

          if (!resp.ok || !data.success) {
            throw new Error(data.error || "Échec de la suppression");
          }

          // disparition de la ligne
          tr.style.transition = "opacity 0.3s";
          tr.style.opacity = 0;
          setTimeout(() => tr.remove(), 300);

        } catch (err) {
          console.error(err);
          alert("Erreur : " + err.message);
        } finally {
          btn.textContent = oldText;
          btn.disabled = false;
        }
      });
    });
  });

  // ─── MODIFICATION (page /edit) ─────────────────────────────
  const form = document.getElementById("edit-user-form");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const id = form.dataset.id;
      const payload = {
        prenom: form.prenom.value.trim(),
        nom: form.nom.value.trim(),
        email: form.email.value.trim(),
        isAdmin: form.isAdmin.value === "true"
      };

      const btn = form.querySelector("button[type=submit]");
      const old = btn.innerHTML;
      btn.innerHTML = "Enregistrement…";
      btn.disabled = true;

      try {
        const resp = await fetch(`/admin/utilisateurs/modifier/${id}`, {
          method: "POST",   // ou "PUT" si vous modifiez la route
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data.error || "Échec de la mise à jour");
        }
        alert("Utilisateur mis à jour !");
      } catch (err) {
        console.error(err);
        alert("Erreur : " + err.message);
      } finally {
        btn.innerHTML = old;
        btn.disabled = false;
      }
    });
  }
});
