const form = document.getElementById('settings-form');
const status = document.getElementById('settings-status');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const res = await fetch('/user/settings', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const json = await res.json();
  status.textContent = res.ok ? json.message : json.error;
});
