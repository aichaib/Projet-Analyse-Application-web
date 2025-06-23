// model/user.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Trouve un utilisateur par email */
export async function getUserByEmail(email) {
  return prisma.utilisateur.findUnique({ where: { email } });
}

/** Crée un nouvel utilisateur (hash du mot de passe) */
export async function addUser({ prenom, nom, email, motDePasse,isAdmin = false  }) {
  console.log("Création utilisateur :", email);
  const motDePasseHash = await bcrypt.hash(motDePasse, 10);   // hachage OK
  return prisma.utilisateur.create({
    data: { prenom, nom, email, motDePasseHash,isAdmin }              // champ exact du schéma
  });
}


/** Met à jour la date du dernier login */
export async function updateLastLogin(utilisateurId) {
  return prisma.utilisateur.update({
    where: { id: utilisateurId },
    data: { lastLogin: new Date() }
  });
}

export async function listUsers() {
  return prisma.utilisateur.findMany();
}