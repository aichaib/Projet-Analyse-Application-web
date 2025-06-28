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
        const response = await fetch(`/api/salles/${id}`, {
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
});