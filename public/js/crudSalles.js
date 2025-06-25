document.getElementById("formSalle")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.querySelector(".btn-envoyer").disabled = true;

  const nom = document.getElementById("nom").value.trim();
  const capacite = parseInt(document.getElementById("capacite").value);
  const emplacement = document.getElementById("emplacement").value.trim();
  const equipementId = parseInt(document.getElementById("equipement").value);

  try {
    const response = await fetch("/salles", {
      method: "POST",
      body: JSON.stringify({ nom, capacite, emplacement, equipementId }),
      headers: { "Content-Type": "application/json" }
    });

    if (response.redirected) {
      window.location.href = response.url;
    } else {
      const data = await response.json();
      alert(data.error || "Création échouée.");
    }
  } catch (error) {
    console.error("Erreur lors de la création :", error);
    alert("Erreur serveur.");
  }
});


async function supprimerSalle(id) {
  try {
    const response = await fetch(`/salles/${id}`, {
      method: "DELETE"
    });

    const result = await response.json();
    if (result.success) {
      console.log("Salle supprimée avec succès !");

    } else {
      console.error("Échec de la suppression de la salle.");
    }
  } catch (error) {
    console.error("Erreur lors de la requête DELETE :", error);
  }
}

async function ajouterSalle(nom, capacite, emplacement) {
  try {
    const response = await fetch("/salles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nom,
        capacite,
        emplacement
      })
    });

    if (response.redirected) {
      // If server redirects after creation
      window.location.href = response.url;
    } else {
      const result = await response.json();
      console.log("Salle ajoutée :", result);
    }
  } catch (error) {
    console.error("Erreur lors de la requête POST :", error);
  }
}

async function listSalles() {
  try {
    const response = await fetch("/salles");
    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des salles");
    }
    const salles = await response.json();
    console.log("Liste des salles :", salles);
    return salles;
  } catch (error) {
    console.error("Erreur lors de la requête GET :", error);
  }
}