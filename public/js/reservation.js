// public/js/reservation.js

// Si je ne suis pas sur la page de recherche, je ne fais rien
const formRecherche = document.getElementById("formRecherche");
if (formRecherche) {
  const capaciteSelect   = document.getElementById("capacite");
  const equipementSelect = document.getElementById("equipement");
  const dateInput        = document.getElementById("dateReservation");
  const heureInput       = document.getElementById("heureReservation");
  const resultatsContainer = document.getElementById("resultatsSalles");
  const btnReserverGlobal  = document.querySelector(".btn-reserver");

  let selectedSalleId = null;

  // 1) Ajoute une salle comme une ligne cliquable (div.salle-row)
  const addSalleToClient = salle => {
    const row = document.createElement("div");
    row.className = "salle-row";
    row.dataset.id = salle.id;
    row.innerHTML = /* html */`
      <span class="salle-nom">${salle.nom}</span>
      <span class="salle-capacite">Capacité : ${salle.capacite}</span>
    `;
    row.addEventListener("click", () => {
      document.querySelectorAll(".salle-row.selected")
        .forEach(el => el.classList.remove("selected"));
      row.classList.add("selected");
      selectedSalleId = salle.id;
      btnReserverGlobal.disabled = false;
    });
    resultatsContainer.appendChild(row);
  };

  // 2) Récupère les salles, filtre, affiche
  const fetchAndDisplaySalles = async () => {
    resultatsContainer.innerHTML = "";
    selectedSalleId = null;
    btnReserverGlobal.disabled = true;

    try {
      const res = await fetch("/api/salles");
      if (!res.ok) throw new Error("Impossible de charger les salles");
      const salles = await res.json();
      const filtres = salles.filter(salle => {
        const capOk = !capaciteSelect.value
          || salle.capacite >= parseInt(capaciteSelect.value, 10);
        const eqOk = !equipementSelect.value
          || (salle.equipements || []).includes(equipementSelect.value);
        return capOk && eqOk;
      });
      if (filtres.length === 0) {
        resultatsContainer.innerHTML = "<p>Aucune salle trouvée.</p>";
      } else {
        filtres.forEach(addSalleToClient);
      }
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

    // Correction stricte : format ISO complet sans modification
    const dateTime = new Date(`${dateInput.value}T${heureInput.value}`);
    const dateTimeFin = new Date(dateTime.getTime() + 3 * 60 * 60 * 1000); // +3h
    const payload = {
      salleId: selectedSalleId,
      dateDebut: dateTime.toISOString(),
      dateFin: dateTimeFin.toISOString()
    };

    try {
      const res = await fetch("/api/reservations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
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
    btnReserverGlobal.disabled = true; // Désactivé par défaut
  }
}
