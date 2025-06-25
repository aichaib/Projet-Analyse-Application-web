import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();


/** Trouve un utilisateur par email */
export async function getUserByEmail(email) {
  return prisma.utilisateur.findUnique({ where: { email } });
}

/** Trouve un utilisateur par ID */
export async function getUserById(id) {
  return prisma.utilisateur.findUnique({ where: { id } });
}

/** Liste tous les utilisateurs */
export async function listUsers() {
  return prisma.utilisateur.findMany();
}

/** (Alias optionnel) Trouve un utilisateur par email */
export async function findUserByEmail(email) {
  return prisma.utilisateur.findUnique({ where: { email } });
}


/** Crée un nouvel utilisateur (hachage automatique du mot de passe) */
export async function addUser({ prenom, nom, email, motDePasse, isAdmin = false }) {
  console.log("Création utilisateur :", email);
  const motDePasseHash = await bcrypt.hash(motDePasse, 10);
  return prisma.utilisateur.create({
    data: { prenom, nom, email, motDePasseHash, isAdmin }
  });
}

/** Crée un utilisateur à partir d’un objet déjà haché */
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

/** Met à jour la date du dernier login */
export async function updateLastLogin(utilisateurId) {
  return prisma.utilisateur.update({
    where: { id: utilisateurId },
    data: { lastLogin: new Date() }
  });
}


/** Supprime un utilisateur par ID */
export async function deleteUser(id) {
  return prisma.utilisateur.delete({
    where: { id }
  });
}
