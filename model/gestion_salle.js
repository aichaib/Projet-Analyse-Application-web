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

