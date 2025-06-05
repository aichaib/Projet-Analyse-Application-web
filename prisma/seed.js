// prisma/seed.js
// Script de semence pour peupler SQLite via Prisma (prisma/schema.prisma)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("→ Création des équipements...");
    const equipements = ["Projecteur", "Tableau Blanc", "Ordinateur"];
    for (const nom of equipements) {
        await prisma.equipement.upsert({
            where: { nom },
            update: {},
            create: { nom }
        });
    }

    console.log("→ Création des salles...");
    const salles = [
        { nom: "Salle A101", capacite: 25, emplacement: "Batiment A" },
        { nom: "Salle B202", capacite: 20, emplacement: "Batiment B" }
    ];

    for (const s of salles) {
        const salle = await prisma.salle.upsert({
            where: { nom: s.nom },
            update: {},
            create: {
                nom: s.nom,
                capacite: s.capacite,
                emplacement: s.emplacement
            }
        });

        // Lier chaque salle aux deux premiers équipements
        const proj = await prisma.equipement.findUnique({ where: { nom: "Projecteur" } });
        const tab = await prisma.equipement.findUnique({ where: { nom: "Tableau Blanc" } });
        if (proj) {
            await prisma.salleEquipement.upsert({
                where: { salleId_equipementId: { salleId: salle.id, equipementId: proj.id } },
                update: {},
                create: { salleId: salle.id, equipementId: proj.id }
            });
        }
        if (tab) {
            await prisma.salleEquipement.upsert({
                where: { salleId_equipementId: { salleId: salle.id, equipementId: tab.id } },
                update: {},
                create: { salleId: salle.id, equipementId: tab.id }
            });
        }
    }

    console.log("→ Seed terminé ✔︎");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });