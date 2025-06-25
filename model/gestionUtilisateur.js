// model/user.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Liste tous les utilisateurs */
export async function listUsers() {
  return prisma.utilisateur.findMany();
}

/** Crée un utilisateur à partir d’un objet (avec motDePasseHash déjà fourni) */
export async function createUser({ prenom, nom, email, motDePasseHash }) {
  return prisma.utilisateur.create({
    data: { prenom, nom, email, motDePasseHash }
  });
}

/** Met à jour un utilisateur par ID */
export async function updateUser(id, { prenom, nom, email }) {
  return prisma.utilisateur.update({
    where: { id },
    data: { prenom, nom, email }
  });
}

/** Supprime un utilisateur par ID */
export async function deleteUser(id) {
  return prisma.utilisateur.delete({
    where: { id }
  });
}

/** (Optionnel) Trouve un utilisateur par email (utile pour l'auth) */
export async function findUserByEmail(email) {
  return prisma.utilisateur.findUnique({
    where: { email }
  });
}
