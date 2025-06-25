const form = document.getElementById('contact-form');
const status = document.getElementById('contact-status');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  const res = await fetch('/contact', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });

  if (res.ok) {
    status.textContent = 'Votre message a été envoyé. Merci !';
    form.reset();
  } else {
    const json = await res.json();
    status.textContent = 'Erreur : ' + (json.error || 'serveur');
  }
});
