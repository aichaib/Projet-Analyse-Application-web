// importer le client prisma
import { PrismaClient } from "@prisma/client";

// créer une instance de prisma
const prisma = new PrismaClient();

// lire toutes les salles avec leurs équipements
export async function listSalles() {
  return prisma.salle.findMany({
    include: {
      equipements: {
        include: {
          equipement: true
        }
      }
    }
  });
}


// creer une nouvelle salle
export async function createSalle({ nom, capacite, emplacement, equipementId }) {
  // Créer la salle
  const newSalle = await prisma.salle.create({
    data: {
      nom,
      capacite: parseInt(capacite, 10),
      emplacement,
    },
  });

  // Associer l’équipement si sélectionné
  if (equipementId) {
    await prisma.salleEquipement.create({
      data: {
        salleId: newSalle.id,
        equipementId: parseInt(equipementId, 10)
      }
    });
  }

  return newSalle;
}




// mettre à jour une salle existante
// model/gestion_salle.js

export async function updateSalle(id, { nom, capacite, emplacement, equipementId }) {
  // 1) Préparer data pour colonnes simples
  const dataToUpdate = {};
  if (typeof nom !== "undefined")        dataToUpdate.nom        = nom;
  if (typeof capacite !== "undefined")   dataToUpdate.capacite   = parseInt(capacite, 10);
  if (typeof emplacement !== "undefined")dataToUpdate.emplacement= emplacement;

  // 2) Mettre à jour la salle si nécessaire
  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.salle.update({
      where: { id },
      data: dataToUpdate
    });
  }

  // 3) Gérer les équipements seulement si on envoie equipementId
  if (typeof equipementId !== "undefined") {
    const ids = Array.isArray(equipementId)
      ? equipementId
      : equipementId
        ? [equipementId]
        : [];

    // Supprimer toutes les liaisons existantes
    await prisma.salleEquipement.deleteMany({ where: { salleId: id } });

    // Recréer les liaisons
    if (ids.length > 0) {
      await prisma.salleEquipement.createMany({
        data: ids.map(eid => ({
          salleId: id,
          equipementId: parseInt(eid, 10)
        }))
        // plus d'option skipDuplicates ici
      });
    }
  }

  // 4) Retourner la salle à jour
  return prisma.salle.findUnique({
    where: { id },
    include: {
      equipements: { include: { equipement: true } }
    }
  });
}

// supprimer une salle
export async function deleteSalle(id) {
  // supprime d'abord les liaisons et utilisations, puis la salle
  return prisma.$transaction([
    prisma.salleEquipement.deleteMany({ where: { salleId: id } }),
    prisma.utilisationSalle.deleteMany({ where: { salleId: id } }),
    prisma.salle.delete({ where: { id } }),
  ]);
}

// trouver une salle par son ID
export async function findSalleById(id) {
  return await prisma.salle.findUnique({
    where: { id },
    include: { equipements: true },
  });
}

export async function findSalleByNom(nom) {
  return await prisma.salle.findMany({
    where: { nom }
  });
}

export async function getSallesFiltrees({ capacite, equipement, date, heure }) {
  // Récupère toutes les salles avec leurs équipements
  let salles = await listSalles();

  // Filtrer par capacité
  if (capacite) {
    salles = salles.filter(salle => salle.capacite >= parseInt(capacite, 10));
  }

  // Filtrer par équipement (structure : salle.equipements[].equipement.nom)
  if (equipement) {
    salles = salles.filter(salle =>
      salle.equipements.some(e => e.equipement.nom === equipement)
    );
  }

  // TODO : Filtrer par date et heure => à gérer plus tard avec les réservations existantes

  console.log("Salles filtrées :", salles.map(s => s.nom)); // debug

  return salles;
}

export async function getSallesDispoParCritere({ capacite, equipement, dateHeure }) {
  let salles = await prisma.salle.findMany({
    include: {
      equipements: {
        include: {
          equipement: true
        }
      },
      reservations: true  // Si tu as une relation pour vérifier les réservations existantes
    }
  });

  // Filtre capacité
  if (capacite) {
    salles = salles.filter(salle => salle.capacite >= capacite);
  }

  // Filtre équipement
  if (equipement) {
    salles = salles.filter(salle =>
      salle.equipements.some(e => e.equipement.nom === equipement)
    );
  }

  // Filtre dispo : si dateHeure fourni
  if (dateHeure) {
    const dateTime = new Date(dateHeure);

    salles = salles.filter(salle => {
      // Vérifie qu’aucune réservation existante chevauche ce créneau
      return !salle.reservations.some(res =>
        new Date(res.dateDebut) <= dateTime && dateTime <= new Date(res.dateFin)
      );
    });
  }

  console.log("Salles dispo filtrées :", salles.map(s => s.nom));
  return salles;
}


