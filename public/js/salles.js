document.addEventListener("DOMContentLoaded", () => {
  const deleteButtons = document.querySelectorAll(".btn-supprimer-salle");

  deleteButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = button.dataset.id;
      const row = button.closest("tr");

      if (!confirm("Confirmez la suppression de cette salle ?")) {
        return;
      }

      // Show loading state
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Suppression...';
      button.disabled = true;

      try {
        const response = await fetch(`/salles/${id}`, {
          method: "DELETE",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Important for sessions
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse non-JSON reçue");
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Échec de la suppression");
        }

        // Visual feedback
        row.classList.add("table-danger");
        setTimeout(() => {
          row.style.transition = "opacity 0.5s";
          row.style.opacity = 0;
          setTimeout(() => row.remove(), 500);
        }, 100);

      } catch (err) {
        console.error("Erreur:", err);
        alert(`Erreur: ${err.message}`);
      } finally {
        button.innerHTML = originalText;
        button.disabled = false;
      }
    });
  });

  // ─── Création de salle ────────────────────────────────────────────────
  const form = document.getElementById("formSalle");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nom = document.getElementById("nom").value.trim();
      const capacite = parseInt(document.getElementById("capacite").value, 10);
      const equipementId = document.getElementById("equipement").value;
      const emplacement = document.getElementById("emplacement").value.trim();

      const submitBtn = form.querySelector("button[type='submit']");
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Création...';
      submitBtn.disabled = true;

      try {
        const response = await fetch("/salles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          credentials: "include", // ✅ Garde la session
          body: JSON.stringify({ nom, capacite, equipementId, emplacement })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // ✅ Suivre la redirection manuellement
          window.location.href = data.redirect;
        } else {
          throw new Error(data.error || "Échec de la création");
        }

      } catch (err) {
        console.error("Fetch POST /salles failed:", err);
        alert(`Erreur: ${err.message}`);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });

  }
  const form2 = document.getElementById("formEditSalle");
  if (!form2) return;

  // 1. Mémoriser
  const initial = {
    nom: form2.nom.value,
    capacite: form2.capacite.value,
    emplacement: form2.emplacement.value,
    equipementId: form2.equipement.value
  };

  form2.addEventListener("submit", async e => {
    e.preventDefault();

    // 2. Récupérer l’ID
    const id = Number(form2.closest("section.formulaire-salle").dataset.id);
    if (isNaN(id)) return alert("ID de salle manquant !");

    // 3. Construire dynamiquement le payload
    const payload = {};
    const newEquip = form2.equipement.value;
    if (form2.nom.value !== initial.nom) payload.nom = form2.nom.value;
    if (form2.capacite.value !== initial.capacite) payload.capacite = form2.capacite.value;
    if (form2.emplacement.value !== initial.emplacement) payload.emplacement = form2.emplacement.value;
    if (newEquip && newEquip !== initial.equipementId) {
      // on n'envoie que s'il y a vraiment un id et qu'il a changé
      payload.equipementId = newEquip;
    }

    console.log("💡 Payload envoyé :", payload);

    // 4. Si rien n'a changé, on sort
    if (Object.keys(payload).length === 0) {
      return alert("Aucun changement à enregistrer.");
    }

    // 5. Appel PUT
    const btn = form2.querySelector("button[type='submit']");
    const oldText = btn.innerHTML;
    btn.innerHTML = "Enregistrement…";
    btn.disabled = true;

    try {
      const resp = await fetch(`/salles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        window.location.href = data.redirect;
      } else {
        throw new Error(data.error || "Erreur de mise à jour");
      }
    } catch (err) {
      console.error("PUT /salles/:id failed:", err);
      alert(err.message);
    } finally {
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  });
});