// Vérifie si on est bien sur la page de recherche
const formRecherche = document.getElementById("formRecherche");
if (formRecherche) {
  const capaciteSelect = document.getElementById("capacite");
  const equipementSelect = document.getElementById("equipement");
  const dateInput = document.getElementById("dateReservation");
  const heureInput = document.getElementById("heureReservation");
  const resultatsContainer = document.getElementById("resultatsSalles");

  let selectedSalleId = null;

  // ✅ Ajoute une carte salle dans le DOM
  const addSalleToClient = (salle) => {
    const div = document.createElement("div");
    div.className = "col";

    div.innerHTML = `
      <div class="card border-primary shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${salle.nom}</h5>
          <p class="card-text"><strong>Capacité :</strong> ${salle.capacite}</p>
          <p class="card-text">
            <strong>Équipements :</strong>
            ${salle.equipements.map(e => `<span class="badge bg-secondary me-1">${e.equipement.nom}</span>`).join(' ')}
          </p>
          ${dateInput.value && heureInput.value ? `
            <p class="card-text"><strong>Date :</strong> ${dateInput.value}</p>
            <p class="card-text"><strong>Heure :</strong> ${heureInput.value}</p>
          ` : ""}
        </div>
        <div class="card-footer text-center">
          <a href="/reservations/new/${salle.id}" class="btn btn-primary">Réserver</a>
        </div>
      </div>
    `;
    resultatsContainer.appendChild(div);
  };

  // ✅ Récupère les salles et affiche les cartes
  const fetchAndDisplaySalles = async () => {
    resultatsContainer.innerHTML = "";

    // DEBUG : Affiche la requête envoyée
    console.log("Requête envoyée avec :", {
      capacite: capaciteSelect.value,
      equipement: equipementSelect.value,
      date: dateInput.value,
      heure: heureInput.value
    });

    try {
      const res = await fetch("/api/salles/recherche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacite: capaciteSelect.value,
          equipement: equipementSelect.value,
          date: dateInput.value,
          heure: heureInput.value
        })
      });

      if (!res.ok) throw new Error("Impossible de charger les salles");
      const salles = await res.json();

      // DEBUG : Affiche la réponse reçue
      console.log("Réponse reçue :", salles);

      if (salles.length === 0) {
        resultatsContainer.innerHTML = "<p>Aucune salle disponible pour ces critères.</p>";
        return;
      }

      salles.forEach(addSalleToClient);

    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement des salles");
    }
  };

  // ✅ Branche l’événement
  formRecherche.addEventListener("submit", e => {
    e.preventDefault();
    fetchAndDisplaySalles();
  });

}
