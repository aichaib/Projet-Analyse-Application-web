import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function logAdminAction(adminId, action, details) {
  return prisma.historiqueAction.create({
    data: { adminId, action, details, timestamp: new Date() }
  });
}

export async function getHistoriqueByAdminId(adminId) {
  return prisma.historiqueAction.findMany({
    where: { adminId },
    orderBy: { timestamp: "desc" }
  });
}
