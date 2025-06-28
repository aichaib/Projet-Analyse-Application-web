const form = document.getElementById('settings-form');
const status = document.getElementById('settings-status');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  const res = await fetch('/user/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    const json = await res.json();
    status.textContent = json.message || 'Paramètres sauvegardés avec succès !';
    status.classList.remove('text-danger');
    status.classList.add('text-success');
  } else {
    const json = await res.json();
    status.textContent = 'Erreur : ' + (json.error || 'serveur');
    status.classList.remove('text-success');
    status.classList.add('text-danger');
  }
});
