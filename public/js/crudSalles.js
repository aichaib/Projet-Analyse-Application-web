async function updateSalle(id, nom, capacite, emplacement) {
  try {
    const response = await fetch(`/salles/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nom,
        capacite,
        emplacement
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log("Salle mise à jour avec succès !");
    } else {
      console.error("Échec de la mise à jour.");
    }
  } catch (error) {
    console.error("Erreur lors de la requête PUT :", error);
  }
}

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