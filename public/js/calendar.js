// public/js/calendar.js

// Navigation entre les mois
document.addEventListener('DOMContentLoaded', function() {
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarHeader = document.querySelector('.calendar-header');
    
    if (prevMonthBtn && nextMonthBtn && calendarHeader) {
        const currentMonth = parseInt(calendarHeader.dataset.month);
        const currentYear = parseInt(calendarHeader.dataset.year);
        
        prevMonthBtn.addEventListener('click', () => {
            let newMonth = currentMonth - 1;
            let newYear = currentYear;
            
            if (newMonth < 0) {
                newMonth = 11;
                newYear = currentYear - 1;
            }
            
            window.location.href = `/reservations?month=${newMonth}&year=${newYear}`;
        });
        
        nextMonthBtn.addEventListener('click', () => {
            let newMonth = currentMonth + 1;
            let newYear = currentYear;
            
            if (newMonth > 11) {
                newMonth = 0;
                newYear = currentYear + 1;
            }
            
            window.location.href = `/reservations?month=${newMonth}&year=${newYear}`;
        });
    }
});

// Helpers pour le modal
function openCalendarModal(html) {
  const modal = document.getElementById('calendar-modal');
  const body = document.getElementById('calendar-modal-body');
  body.innerHTML = html;
  modal.style.display = 'flex';
}
function closeCalendarModal() {
  document.getElementById('calendar-modal').style.display = 'none';
}
document.getElementById('calendar-modal-close').onclick = closeCalendarModal;
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeCalendarModal();
});

// Suppression avec modal
async function supprimerReservation(reservationId) {
  openCalendarModal(`
    <h2>Confirmer la suppression</h2>
    <p>Voulez-vous vraiment supprimer cette réservation ?</p>
    <div class="calendar-modal-actions">
      <button class="calendar-modal-btn cancel" id="modal-suppr-confirm">Supprimer</button>
      <button class="calendar-modal-btn" id="modal-suppr-cancel">Annuler</button>
    </div>
  `);
  document.getElementById('modal-suppr-cancel').onclick = closeCalendarModal;
  document.getElementById('modal-suppr-confirm').onclick = async function() {
    try {
      const response = await fetch(`/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        closeCalendarModal();
        // Supprimer l'élément du DOM
        const eventElement = document.querySelector(`[data-reservation-id="${reservationId}"]`);
        if (eventElement) eventElement.remove();
      } else {
        const error = await response.json();
        alert('Erreur lors de la suppression : ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      alert('Erreur lors de la suppression de la réservation');
    }
  };
}

// Modification avec modal
async function modifierReservation(reservationId) {
  // Récupérer les infos de la réservation (optionnel, ici on lit dans le DOM)
  const event = document.querySelector(`[data-reservation-id="${reservationId}"]`);
  const salleNom = event.querySelector('.event-room').textContent;
  const heure = event.querySelector('.event-time').textContent.split('–')[0].trim();
  // On suppose que la date est celle du jour du calendrier
  const dayDiv = event.closest('.calendar-day');
  const year = document.querySelector('.calendar-header').dataset.year;
  const month = parseInt(document.querySelector('.calendar-header').dataset.month) + 1;
  const day = dayDiv.querySelector('.day-number').textContent;
  const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Récupérer la liste des salles (optionnel, ici on ne propose que la salle actuelle)
  openCalendarModal(`
    <h2>Modifier la réservation</h2>
    <form id="calendar-modal-form" class="calendar-modal-form">
      <label for="modal-salle">Salle</label>
      <input id="modal-salle" value="${salleNom}" disabled>
      <label for="modal-date">Date</label>
      <input id="modal-date" type="date" value="${dateStr}" required>
      <label for="modal-heure">Heure</label>
      <input id="modal-heure" type="time" value="${heure}" required>
      <div class="calendar-modal-actions">
        <button type="submit" class="calendar-modal-btn">Enregistrer</button>
        <button type="button" class="calendar-modal-btn cancel" id="modal-edit-cancel">Annuler</button>
      </div>
    </form>
  `);
  document.getElementById('modal-edit-cancel').onclick = closeCalendarModal;
  document.getElementById('calendar-modal-form').onsubmit = async function(e) {
    e.preventDefault();
    const date = document.getElementById('modal-date').value;
    const heure = document.getElementById('modal-heure').value;
    const dateTime = new Date(`${date}T${heure}`);
    const dateTimeFin = new Date(dateTime.getTime() + 3 * 60 * 60 * 1000); // +3h
    const payload = {
      salleId: event.dataset.salleId || 1, // fallback
      dateDebut: dateTime.toISOString(),
      dateFin: dateTimeFin.toISOString()
    };
    try {
      const response = await fetch(`/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        closeCalendarModal();
        window.location.reload();
      } else {
        const error = await response.json();
        alert('Erreur lors de la modification : ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      alert('Erreur lors de la modification de la réservation');
    }
  };
}

// Rendre les fonctions accessibles globalement
window.modifierReservation = modifierReservation;
window.supprimerReservation = supprimerReservation;

// Attacher les événements sur les boutons du calendrier (CSP safe)
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn-modifier-event').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = btn.closest('.event').dataset.reservationId;
      modifierReservation(id);
    });
  });
  document.querySelectorAll('.btn-supprimer-event').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = btn.closest('.event').dataset.reservationId;
      supprimerReservation(id);
    });
  });
}); 