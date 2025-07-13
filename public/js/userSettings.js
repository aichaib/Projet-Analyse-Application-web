const form = document.getElementById('settings-form');
const status = document.getElementById('settings-status');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  // Choisissez l’URL en fonction de la page
  const endpoint = window.location.pathname.startsWith("/admin")
    ? "/admin/parametres"
    : "/user/settings";

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  const json = await res.json();
  if (res.ok) {
    status.textContent = json.message;
    status.classList.add('text-success');
    status.classList.remove('text-danger');
  } else {
    status.textContent = "Erreur : " + (json.error||json.message);
    status.classList.add('text-danger');
    status.classList.remove('text-success');
  }
});
