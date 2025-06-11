import cron from 'node-cron';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
cron.schedule('0 * * * *', async () => {
  await prisma.verificationCode.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
  console.log('[Cron] Nettoyage des codes expirés');
});
