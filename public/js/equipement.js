const inputName = document.getElementById("nom");
const addEquipementForm = document.getElementById("equipementForm");

const editEquipementForm = document.getElementById("editEquipementForm");
const inputNom = document.getElementById("nom");

editEquipementForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = editEquipementForm.;
  const newNom = inputNom.value.trim();

  if (!newNom) {
    alert("Le nom de l'équipement ne peut pas être vide.");
    return;
  }

  try {
    const response = await fetch(`/equipement/modifier/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newNom })
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || "Équipement modifié avec succès");
      window.location.href = "/list/equipement"; 
    } else {
      alert(result.error || "Erreur lors de la modification");
    }
  } catch (error) {
    alert("Erreur réseau: " + error.message);
  }
});


// Fonction pour ajouter un équipement
const _addEquipementToServer = async (event) => {
  event.preventDefault();

  const equipementName = inputName.value.trim();
  if (!equipementName) {
    alert("Le nom de l'équipement ne peut pas être vide.");
    return;
  }
  const response = await fetch("/new/equipement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom: equipementName }),
  });

  if (response.ok) {
    const data = await response.json();

    //Réinitialise le champ
    inputName.value = "";

    //Message facultatif
    alert(`Équipement ajouté avec succès : ${data.nom}`);

  } else {
    const errorData = await response.json();
    alert(`Erreur lors de l'ajout de l'équipement : ${errorData.error || errorData.message}`);
  }
};


// Fonction pour supprimer un équipement
const deleteEquipement = async (id) => {
  const response = await fetch(`/equipement/${id}`, {
    method: "DELETE",
  });

  if (response.ok) {
    alert('Équipement supprimé avec succès');
    location.reload();
  } else {
    const errorData = await response.json();
    alert(`Erreur lors de la suppression : ${errorData.error || errorData.message}`);
  }
};


addEquipementForm.addEventListener("submit", _addEquipementToServer);