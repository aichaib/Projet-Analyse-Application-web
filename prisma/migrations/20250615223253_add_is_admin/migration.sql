-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Utilisateur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME
);
INSERT INTO "new_Utilisateur" ("createdAt", "email", "id", "lastLogin", "motDePasseHash", "nom", "prenom", "updatedAt") SELECT "createdAt", "email", "id", "lastLogin", "motDePasseHash", "nom", "prenom", "updatedAt" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
