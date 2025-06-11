// importer le client prisma
import { PrismaClient } from "@prisma/client";

// créer une instance de prisma
const prisma = new PrismaClient();

// lire tous les équipements
export async function listEquipements() {
    return await prisma.equipement.findMany({
    include: { salle: true },
  });
}

// creer un nouvel équipement
export async function createEquipement({ nom}) {
  return await prisma.equipement.create({
    data: {
      nom
    },
  });
}

// mettre à jour un équipement existant
export async function updateEquipement(id, { nom }) {
  return await prisma.equipement.update({
    where: { id },
    data: {
      nom,
    },
  });
}

// supprimer un équipement
export async function deleteEquipement(id) {
  return await prisma.equipement.delete({
    where: { id },
  });
}