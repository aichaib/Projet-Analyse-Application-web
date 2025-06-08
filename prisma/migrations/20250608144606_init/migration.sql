-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Utilisateur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME
);
INSERT INTO "new_Utilisateur" ("email", "id", "motDePasseHash", "nom", "prenom") SELECT "email", "id", "motDePasseHash", "nom", "prenom" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
