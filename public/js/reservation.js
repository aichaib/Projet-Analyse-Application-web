// Charger les salles dans le select
export const chargerSalles = async () => {
    const response = await fetch('/api/salles');
    const salles = await response.json();
    const select = document.getElementById('selectSalle');
    salles.forEach(salle => {
        const option = document.createElement('option');
        option.value = salle.id;
        option.textContent = salle.nom;
        select.appendChild(option);
    });
};

// Envoyer la réservation
export const reserverSalle = async (event) => {
    event.preventDefault();
    const salleId = document.getElementById('selectSalle').value;
    const date = document.getElementById('dateReservation').value;
    const heure = document.getElementById('heureReservation').value;

    const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salleId, date, heure })
    });

    const result = await response.json();
    if (response.ok) {
        alert('Réservation réussie !');
    } else {
        alert(result.error || 'Erreur lors de la réservation');
    }
};

async function filtrerSalles() {
    const capacite = parseInt(document.getElementById('capacite').value) || 0;
    const equipement = document.getElementById('equipement').value;

    // Appel à l'API pour récupérer toutes les salles
    const response = await fetch('/api/salles');
    const salles = await response.json();

    // Filtrage côté client
    const resultats = salles.filter(salle => {
        const okCapacite = !capacite || salle.capacite >= capacite;
        const okEquip = !equipement || (salle.equipements && salle.equipements.includes(equipement));
        return okCapacite && okEquip;
    });

    afficherResultats(resultats);
}

function afficherResultats(salles) {
    const div = document.getElementById('resultatsSalles');
    if (salles.length === 0) {
        div.innerHTML = "<p>Aucune salle trouvée.</p>";
        return;
    }
    div.innerHTML = salles.map(salle =>
        `<div class="salle-result">
            <strong>${salle.nom}</strong> - Capacité : ${salle.capacite} - Équipements : ${(salle.equipements || []).join(", ")}
            <button class="btn-reserver">Réserver</button>
        </div>`
    ).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    chargerSalles();
    document.getElementById('formReservation').addEventListener('submit', reserverSalle);
    document.getElementById('btnRechercher').addEventListener('click', filtrerSalles);
}); 