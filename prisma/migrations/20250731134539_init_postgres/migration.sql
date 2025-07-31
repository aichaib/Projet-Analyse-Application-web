-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salle" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "emplacement" TEXT NOT NULL,

    CONSTRAINT "Salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipement" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalleEquipement" (
    "salleId" INTEGER NOT NULL,
    "equipementId" INTEGER NOT NULL,

    CONSTRAINT "SalleEquipement_pkey" PRIMARY KEY ("salleId","equipementId")
);

-- CreateTable
CREATE TABLE "UtilisationSalle" (
    "id" SERIAL NOT NULL,
    "utilisateurId" INTEGER NOT NULL,
    "salleId" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateUtilisation" TIMESTAMP(3) NOT NULL,
    "heureUtilisation" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilisationSalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueAction" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "VerificationCode_utilisateurId_idx" ON "VerificationCode"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Salle_nom_key" ON "Salle"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_nom_key" ON "Equipement"("nom");

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalleEquipement" ADD CONSTRAINT "SalleEquipement_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalleEquipement" ADD CONSTRAINT "SalleEquipement_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilisationSalle" ADD CONSTRAINT "UtilisationSalle_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilisationSalle" ADD CONSTRAINT "UtilisationSalle_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
