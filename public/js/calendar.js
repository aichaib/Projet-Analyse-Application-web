document.addEventListener('DOMContentLoaded', () => {
  const header  = document.querySelector('.calendar-header');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  const month = parseInt(header.dataset.month, 10);
  const year  = parseInt(header.dataset.year,  10);

  prevBtn.addEventListener('click', () => {
    let m = month - 1, y = year;
    if (m < 0) { m = 11; y--; }
    window.location.href = `/reservations?month=${m}&year=${y}`;
  });

  nextBtn.addEventListener('click', () => {
    let m = month + 1, y = year;
    if (m > 11) { m = 0; y++; }
    window.location.href = `/reservations?month=${m}&year=${y}`;
  });
});
