// public/js/adminCode.js
const adminForm = document.querySelector(".admin-code-form");
if (adminForm) {
  adminForm.addEventListener("submit", async e => {
    e.preventDefault();
    const code = adminForm.querySelector("#admin-code").value.trim();

    const res = await fetch("/api/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const json = await res.json();

    if (res.ok && json.verified) {
      // Front décide de la redirection
      window.location.replace("/admin-secret");
    } else {
      alert(json.error || "Échec de la vérification du code.");
    }
  });
}
