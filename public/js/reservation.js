// Vérifie si on est bien sur la page de recherche
const formRecherche = document.getElementById("formRecherche");
if (formRecherche) {
  const capaciteSelect = document.getElementById("capacite");
  const equipementSelect = document.getElementById("equipement");
  const dateInput = document.getElementById("dateReservation");
  const heureInput = document.getElementById("heureReservation");
  const resultatsContainer = document.getElementById("resultatsSalles");

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
        <div class="etat-initial">
          <button class="btn btn-primary btn-reserver" data-id="${salle.id}">Réserver</button>
        </div>
        <div class="reservation-status" style="display: none;">
          <span class="status-text text-warning">Réservation en cours...</span><br>
          <button class="btn btn-secondary btn-annuler mt-2">Annuler</button>
        </div>
        <div class="reservation-success" style="display: none;">
          <span class="text-success fw-bold">Réservation réussie ✅</span>
        </div>
      </div>
    </div>
  `;

      resultatsContainer.appendChild(div);

      // Ajouter les événements après insertion dans le DOM
      const reserverBtn = div.querySelector(".btn-reserver");
      reserverBtn.addEventListener("click", async (e) => {
        const salleId = e.target.dataset.id;
        const carte = e.target.closest(".card-footer");
        const etatInitial = carte.querySelector(".etat-initial");
        const statut = carte.querySelector(".reservation-status");
        const success = carte.querySelector(".reservation-success");

        const date = dateInput.value;
        const heure = heureInput.value;
        if (!date || !heure) {
          alert("Veuillez sélectionner une date et une heure.");
          return;
        }

        etatInitial.style.display = "none";
        statut.style.display = "block";

        let annule = false;
        carte.querySelector(".btn-annuler").addEventListener("click", () => {
          annule = true;
          statut.style.display = "none";
          etatInitial.style.display = "block";
        });

        try {
          const res = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salleId, date, heure })
          });

          const data = await res.json();

          if (!annule && res.ok) {
            statut.style.display = "none";
            success.style.display = "block";
            // Optionnel : rechargement ou redirection
            // setTimeout(() => window.location.href = "/reservations", 1500);
          } else if (!annule) {
            statut.style.display = "none";
            etatInitial.style.display = "block";
            alert(data.error || "Erreur lors de la réservation.");
          }

        } catch (err) {
          if (!annule) {
            console.error(err);
            statut.style.display = "none";
            etatInitial.style.display = "block";
            alert("Erreur réseau.");
          }
        }
      });

    };



    // Récupère les salles et affiche les cartes
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


          // DEBUG : Affiche la réponse reçue
          console.log("Réponse reçue :", salles);

          if (salles.length === 0) {
            resultatsContainer.innerHTML = "<p>Aucune salle disponible pour ces critères.</p>";
            return;

          }
        }
        salles.forEach(addSalleToClient);

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


    formRecherche.addEventListener("submit", e => {
      e.preventDefault();
      fetchAndDisplaySalles();
    });


    if (btnReserverGlobal) {
      btnReserverGlobal.addEventListener("click", createReservation);
      btnReserverGlobal.disabled = true; // Désactivé par défaut
    }

  }
}
