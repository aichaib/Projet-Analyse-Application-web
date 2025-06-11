// importer le client prisma
import { PrismaClient } from "@prisma/client";

// créer une instance de prisma
const prisma = new PrismaClient();

// lire toutes les salles avec leurs équipements
export async function listSalles() {
  return await prisma.salle.findMany({
    include: { equipements: true },
  });
}

// creer une nouvelle salle
export async function createSalle({ nom, capacite, emplacement }) {
  return await prisma.salle.create({
    data: {
      nom,
      capacite,
      emplacement,
    },
  });
}

// mettre à jour une salle existante
export async function updateSalle(id, { nom, capacite, emplacement }) {
  return await prisma.salle.update({
    where: { id },
    data: {
      nom,
      capacite,
      emplacement,
    },
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


