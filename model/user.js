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
  const dataToUpdate = {};
  if (typeof prenom !== "undefined") dataToUpdate.prenom = prenom;
  if (typeof nom !== "undefined") dataToUpdate.nom = nom;
  if (typeof email !== "undefined") {
    // on ne fait le contrôle de doublon QUE si on a un email
    const exist = await prisma.utilisateur.findUnique({
      where: { email }
    });
    if (exist && exist.id !== id) {
      throw new Error("Cet email est déjà utilisé.");
    }
    dataToUpdate.email = email;
  }

  return prisma.utilisateur.update({
    where: { id },
    data: dataToUpdate
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
  // Supprime d'abord les codes de vérification liés à l'utilisateur
  await prisma.verificationCode.deleteMany({ where: { utilisateurId: id } });
  // Supprime ensuite les réservations de l'utilisateur
  await prisma.utilisationSalle.deleteMany({ where: { utilisateurId: id } });
  // Supprime l'utilisateur lui-même
  return prisma.utilisateur.delete({
    where: { id }
  });
}



