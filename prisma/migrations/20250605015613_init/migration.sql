/*
  Warnings:

  - You are about to drop the `HistoriqueReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ListeAttente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `creeLe` on the `Equipement` table. All the data in the column will be lost.
  - You are about to drop the column `modifieLe` on the `Equipement` table. All the data in the column will be lost.
  - You are about to drop the column `creeLe` on the `Salle` table. All the data in the column will be lost.
  - You are about to drop the column `modifieLe` on the `Salle` table. All the data in the column will be lost.
  - The primary key for the `SalleEquipement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `SalleEquipement` table. All the data in the column will be lost.
  - You are about to drop the column `creeLe` on the `Utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `estAdmin` on the `Utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `modifieLe` on the `Utilisateur` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Notification_reservationId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HistoriqueReservation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ListeAttente";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Notification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Reservation";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UtilisationSalle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "salleId" INTEGER NOT NULL,
    CONSTRAINT "UtilisationSalle_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UtilisationSalle_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL
);
INSERT INTO "new_Equipement" ("id", "nom") SELECT "id", "nom" FROM "Equipement";
DROP TABLE "Equipement";
ALTER TABLE "new_Equipement" RENAME TO "Equipement";
CREATE UNIQUE INDEX "Equipement_nom_key" ON "Equipement"("nom");
CREATE TABLE "new_Salle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "emplacement" TEXT NOT NULL
);
INSERT INTO "new_Salle" ("capacite", "emplacement", "id", "nom") SELECT "capacite", "emplacement", "id", "nom" FROM "Salle";
DROP TABLE "Salle";
ALTER TABLE "new_Salle" RENAME TO "Salle";
CREATE UNIQUE INDEX "Salle_nom_key" ON "Salle"("nom");
CREATE TABLE "new_SalleEquipement" (
    "salleId" INTEGER NOT NULL,
    "equipementId" INTEGER NOT NULL,

    PRIMARY KEY ("salleId", "equipementId"),
    CONSTRAINT "SalleEquipement_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalleEquipement_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SalleEquipement" ("equipementId", "salleId") SELECT "equipementId", "salleId" FROM "SalleEquipement";
DROP TABLE "SalleEquipement";
ALTER TABLE "new_SalleEquipement" RENAME TO "SalleEquipement";
CREATE TABLE "new_Utilisateur" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL
);
INSERT INTO "new_Utilisateur" ("email", "id", "motDePasseHash", "nom", "prenom") SELECT "email", "id", "motDePasseHash", "nom", "prenom" FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
