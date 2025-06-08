// model/verificationCode.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createCodeForUser(utilisateurId, code, expiresAt) {
  return prisma.verificationCode.create({ data: { utilisateurId, code, expiresAt } });
}

export async function createCodeForEmail(email, code, expiresAt) {
  return prisma.verificationCode.create({ data: { email, code, expiresAt } });
}

/** Récupère le dernier code non-expiré par userId */
export async function getLatestCodeByUser(userId) {
  return prisma.verificationCode.findFirst({
    where: { utilisateurId: userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
}

/** Récupère le dernier code non-expiré par email */
export async function getLatestCodeByEmail(email) {
  return prisma.verificationCode.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
}

/** Supprime un code par son id */
export async function deleteCode(id) {
  return prisma.verificationCode.delete({ where: { id } });
}
