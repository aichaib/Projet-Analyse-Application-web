
export const monthNames = [
  'Janvier','Février','Mars','Avril',
  'Mai','Juin','Juillet','Août',
  'Septembre','Octobre','Novembre','Décembre'
];

/**
 * Construit un tableau de 42 cases (6 semaines x 7 jours) pour un mois donné.
 * @param {number} month – 0 = Janvier…11 = Décembre
 * @param {number} year
 * @param {Array} reservations – liste brute des réservations [{ dateDebut, dateFin, salle }, …]
 * @returns {Array<{ date: Date, day: number, inMonth: boolean, reservations: Array }>}
 */
export function buildCalendar(month, year, reservations) {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  // Décalage pour débuter un lundi
  const offset = (start.getDay() + 6) % 7; 
  start.setDate(start.getDate() - offset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const todays = reservations.filter(r => {
      const dd = new Date(r.dateDebut);
      return dd.getFullYear() === d.getFullYear() &&
             dd.getMonth()    === d.getMonth() &&
             dd.getDate()     === d.getDate();
    });

    days.push({
      date: d,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      reservations: todays.map(r => ({
        salle:     r.salle,
        dateDebut: r.dateDebut,
        dateFin:   r.dateFin
      }))
    });
  }
  return days;
}
