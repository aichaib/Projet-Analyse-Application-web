// model/verificationCode.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcrypt";

export async function createCodeForUser(utilisateurId, email, plainCode, expiresAt) {
  const hash = await bcrypt.hash(plainCode, 10);
  return prisma.verificationCode.create({
    data: { utilisateurId, email, code: hash, expiresAt }
  });
}

export async function createCodeForEmail(email, plainCode, expiresAt) {
  const hash = await bcrypt.hash(plainCode, 10);
  return prisma.verificationCode.create({
    data: { email, code: hash, expiresAt }
  });
}

/** Récupère le dernier code non-expiré par userId */export async function getLatestCodeByUser(userId) {
  try {
    const entry = await prisma.verificationCode.findFirst({
      where: { utilisateurId: userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    
    console.log("Dernier code pour l'utilisateur", userId, ":", entry);
    return entry;
  } catch (error) {
    console.error("Erreur getLatestCodeByUser:", error);
    throw error;
  }
}

/** Récupère le dernier code non-expiré par email */
export async function getLatestCodeByEmail(email) {
  try {
    const entry = await prisma.verificationCode.findFirst({
      where: { email, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    
    console.log("Dernier code pour l'email", email, ":", entry);
    return entry;
  } catch (error) {
    console.error("Erreur getLatestCodeByEmail:", error);
    throw error;
  }
}

/** Supprime un code par son id */
export async function deleteCode(id) {
  return prisma.verificationCode.delete({ where: { id } });
}
