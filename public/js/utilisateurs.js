document.addEventListener("DOMContentLoaded", () => {
  const deleteButtons = document.querySelectorAll(".btn-supprimer");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const confirmation = confirm("Voulez-vous vraiment supprimer cet utilisateur ?");

      if (!confirmation) return;

      try {
        const response = await fetch(`/admin/utilisateurs/${id}/delete`, {
          method: "DELETE"
        });

        if (response.status === 204) {
          // Supprimer la ligne de tableau
          const row = button.closest("tr");
          if (row) row.remove();
        } else {
          const data = await response.json();
          alert("Erreur : " + (data.error || "Suppression échouée"));
        }
      } catch (err) {
        console.error("Erreur réseau :", err);
        alert("Erreur lors de la suppression");
      }
    });
  });
});
