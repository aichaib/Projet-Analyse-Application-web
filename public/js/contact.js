const form = document.getElementById('form-contact');
const status = document.getElementById('contact-status');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  const res = await fetch('/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    status.textContent = 'Votre message a été envoyé. Merci !';
    status.classList.remove('text-danger');
    status.classList.add('text-success');
    form.reset();
  } else {
    const json = await res.json();
    status.textContent = 'Erreur : ' + (json.error || 'serveur');
    status.classList.remove('text-success');
    status.classList.add('text-danger');
  }
});
