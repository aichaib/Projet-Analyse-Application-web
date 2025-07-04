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
  return await prisma.salle.create({
    data: {
      nom,
      capacite,
      emplacement,
      equipements: {
        create: [
          {
            equipement: {
              connect: { id:equipementId }
            }
          }
        ]
      }
    }
  });
}


// mettre à jour une salle existante
export async function updateSalle(id, { nom, capacite, emplacement, equipementId }) {
  // 1. Supprimer les anciennes associations
  await prisma.salleEquipement.deleteMany({
    where: { salleId: id }
  });

// 2. Mettre à jour la salle et relier le nouvel équipeme
  return await prisma.salle.update({
    where: { id },
    data: {
      nom,
      capacite,
      emplacement,
      equipements: {
        create: [
          {
            equipement: {
              connect: { id: parseInt(equipementId, 10) }
            }
          }
        ]
      }
    }
  });
}


// supprimer une salle
export async function deleteSalle(id) {
  return await prisma.salle.delete({
    where: { id },
  });
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


