import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// liste tous les utilisateurs
export async function listUsers() {
  return prisma.utilisateur.findMany({
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { nom: "asc" }
  });
}

// trouve un utilisateur par id
export async function getUserById(id) {
  return prisma.utilisateur.findUnique({
    where: { id: Number(id) }
  });
}

// trouve un utilisateur par email
export async function getUserByEmail(email) {
  return prisma.utilisateur.findUnique({
    where: { email }
  });
}

// ajoute un nouvel utilisateur, mot de passe hashé
export async function addUser({ prenom, nom, email, motDePasse, isAdmin = false }) {
  const hashedPassword = await bcrypt.hash(motDePasse, 10);
  return prisma.utilisateur.create({
    data: {
      prenom,
      nom,
      email,
      motDePasse: hashedPassword,
      isAdmin
    }
  });
}

// met à jour un utilisateur (sans changer mot de passe ici)
export async function updateUser(id, data) {
  // si motDePasse présent, le hasher
  if (data.motDePasse) {
    data.motDePasse = await bcrypt.hash(data.motDePasse, 10);
  }
  return prisma.utilisateur.update({
    where: { id: Number(id) },
    data
  });
}

// met à jour la date de dernier login
export async function updateLastLogin(id) {
  return prisma.utilisateur.update({
    where: { id: Number(id) },
    data: { lastLoginAt: new Date() }
  });
}

// supprime un utilisateur
export async function deleteUser(id) {
  return prisma.utilisateur.delete({
    where: { id: Number(id) }
  });
}

export async function confirmDelete() {
   const confirmation = confirm("Voulez-vous vraiment supprimer cet utilisateur ?");
      if (!confirmation) return;
}

