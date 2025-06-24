const inputName = document.getElementById("nom");
const addEquipementForm = document.getElementById("equipementForm");

const _addEquipementToServer = async (event) => {
    event.preventDefault();
    const equipementName = inputName.value.trim();

    if (!equipementName) {
        alert("Le nom de l'équipement ne peut pas être vide.");
        return;
    }

    const response = await fetch("/new/equipement", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nom: equipementName }),
    });

    if (response.ok) {
        inputName.value = "";
        const data = await response.json();
        alert(`Équipement ajouté avec succès : ${data.nom}`);
    } else {
        const errorData = await response.json();
        alert(`Erreur lors de l'ajout de l'équipement : ${errorData.error || errorData.message}`);
    }
};

addEquipementForm.addEventListener("submit", _addEquipementToServer);
