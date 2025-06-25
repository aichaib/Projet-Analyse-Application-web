// public/js/reservation.js

// Si je ne suis pas sur la page de recherche, je ne fais rien
const formRecherche = document.getElementById("formRecherche");
if (formRecherche) {
  const capaciteSelect = document.getElementById("capacite");
  const equipementSelect = document.getElementById("equipement");
  const dateInput = document.getElementById("dateReservation");
  const heureInput = document.getElementById("heureReservation");
  const resultatsContainer = document.getElementById("resultatsSalles");
  const btnReserverGlobal = document.querySelector(".btn-reserver");

  let selectedSalleId = null;

  // 1) Ajoute une carte salle dans le DOM
  const addSalleToClient = (salle, equipementRecherche) => {
    const div = document.createElement("div");
    div.className = "salle-card";
    div.dataset.id = salle.id;

    // Lister tous les équipements (ou juste ceux qui correspondent si filtre actif)
    const equipements = (salle.equipements || [])
      .map(e => e.equipement.nom);

    div.innerHTML = /* html */`
    <h3>${salle.nom}</h3>
    <p>Capacité : ${salle.capacite}</p>
    <p>Équipements : ${equipements.join(", ")}</p>
  `;

    div.addEventListener("click", () => {
      document.querySelectorAll(".salle-card.selected")
        .forEach(el => el.classList.remove("selected"));
      div.classList.add("selected");
      selectedSalleId = salle.id;
    });

    resultatsContainer.appendChild(div);
  };


  // 2) Récupère les salles, filtre, affiche
  const fetchAndDisplaySalles = async () => {
    resultatsContainer.innerHTML = "";
    selectedSalleId = null;
    btnReserverGlobal.disabled = true;

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

      const filtres = salles.filter(salle => {
        const capOk = !capaciteSelect.value || salle.capacite >= parseInt(capaciteSelect.value, 10);
        const eqOk = !equipementSelect.value || salle.equipements.some(e => e.equipement.nom === equipementSelect.value);
        return capOk && eqOk;
      });

      filtres.forEach(s => addSalleToClient(s, equipementSelect.value));


    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement des salles");
    }
  };

  // 3) Envoi de la réservation
  const createReservation = async () => {
    if (!selectedSalleId) {
      return alert("Veuillez sélectionner une salle.");
    }
    if (!dateInput.value || !heureInput.value) {
      return alert("Date et heure requises.");
    }

    const payload = {
      salleId: selectedSalleId,
      dateDebut: `${dateInput.value}T${heureInput.value}`,
      dateFin: `${dateInput.value}T${heureInput.value}`
    };

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Si je ne suis pas authentifié, va à la page de login
      if (res.status === 401) {
        window.location.href = "/user/login";
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        return alert(json.error || "Erreur lors de la réservation");
      }

      alert(json.message);
      window.location.href = "/reservations";
    } catch (err) {
      console.error(err);
      alert("Erreur réseau, réessayez plus tard");
    }
  };

  // 4) Brancher les events
  formRecherche.addEventListener("submit", e => {
    e.preventDefault();
    fetchAndDisplaySalles();
  });

  if (btnReserverGlobal) {
    btnReserverGlobal.addEventListener("click", createReservation);
  }
}
