const form = document.querySelector(".register-code-form");
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const code = form["code"].value.trim();
    const res  = await fetch("/admin/register/code", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code })
    });
    const data = await res.json();
    if (res.ok && data.next) {
      window.location.href = data.next;  // "/admin/login"
    } else {
      alert(data.error || "Code invalide ou expiré");
    }
  });
}
