// importer le client prisma
import { PrismaClient } from "@prisma/client";

// créer une instance de prisma
const prisma = new PrismaClient();

// lire tous les équipements
export async function listEquipements() {
  return prisma.equipement.findMany();
}

// creer un nouvel équipement
export async function createEquipement(data) {
  const exists = await prisma.equipement.findUnique({
    where: { nom: data.nom },
  });
  if (exists) {
    throw new Error(`Equipement avec le nom '${data.nom}' existe déjà.`);
  }
  return prisma.equipement.create({
    data,
  });
}

// mettre à jour un équipement existant
export async function updateEquipement(id, { nom }) {
  console.log("→ Appel updateEquipement avec :", id, nom); // ← AJOUT
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