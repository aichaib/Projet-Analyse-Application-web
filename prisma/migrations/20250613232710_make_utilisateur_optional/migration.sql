-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VerificationCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utilisateurId" INTEGER,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "VerificationCode_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VerificationCode" ("code", "createdAt", "email", "expiresAt", "id", "utilisateurId") SELECT "code", "createdAt", "email", "expiresAt", "id", "utilisateurId" FROM "VerificationCode";
DROP TABLE "VerificationCode";
ALTER TABLE "new_VerificationCode" RENAME TO "VerificationCode";
CREATE INDEX "VerificationCode_utilisateurId_idx" ON "VerificationCode"("utilisateurId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
