export const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril',
  'Mai', 'Juin', 'Juillet', 'Août',
  'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Construit un tableau de 42 cases (6 semaines x 7 jours) pour un mois donné.
 * @param {number} month – 0 = Janvier…11 = Décembre
 * @param {number} year
 * @param {Array} reservations – liste brute des réservations [{ dateUtilisation, heureUtilisation, salle }]
 * @returns {Array<{ date: Date, day: number, inMonth: boolean, reservations: Array }>}
 */
export function buildCalendar(month, year, reservations) {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);

  // Décalage pour commencer lundi
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + i);

    // Trouve les réservations du jour
    const todaysReservations = reservations.filter(r => {
      const rDate = new Date(r.dateUtilisation);
      return (
        rDate.getFullYear() === currentDay.getFullYear() &&
        rDate.getMonth() === currentDay.getMonth() &&
        rDate.getDate() === currentDay.getDate()
      );
    });

    const formattedReservations = todaysReservations.map(r => {
      // Calcule les heures en chaîne simple HH:MM
      const heureDebut = new Date(r.heureUtilisation);
      const heureFin = new Date(heureDebut.getTime() + 3 * 60 * 60 * 1000); // +3h

      const formatTime = (date) =>
        `${date.getHours().toString().padStart(2, '0')}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

      return {
        id: r.id,
        salle: r.salle,
        heureDebutStr: formatTime(heureDebut), // HH:MM début
        heureFinStr: formatTime(heureFin),     // HH:MM fin
      };
    });

    days.push({
      date: currentDay,
      day: currentDay.getDate(),
      inMonth: currentDay.getMonth() === month,
      reservations: formattedReservations
    });
  }

  return days;
}
