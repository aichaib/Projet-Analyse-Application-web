// importer le client prisma
import { PrismaClient } from "@prisma/client";

// Créer une instance de prisma
const prisma = new PrismaClient();

/**
 * Pour lister les réservations d'un utilisateur
 * @param {*} utilisateurId
 * @returns la liste des réservations
 */
export const listReservations = async (utilisateurId) => {
    const reservations = await prisma.utilisationSalle.findMany({
        where: { utilisateurId },
        include: { salle: true }
    });
    return reservations;
};

/**
 * Pour créer une réservation
 * @param {*} { utilisateurId, salleId, dateDebut, dateFin }
 * @returns la réservation créée
 */
export const createReservation = async ({ utilisateurId, salleId, dateDebut, dateFin }) => {
    const reservation = await prisma.utilisationSalle.create({
        data: { utilisateurId, salleId, dateDebut, dateFin }
    });
    return reservation;
};

/**
 * Pour annuler une réservation
 * @param {*} id
 * @param {*} utilisateurId
 * @returns la réservation annulée
 */
export const cancelReservation = async (id, utilisateurId) => {
    const reservation = await prisma.utilisationSalle.deleteMany({
        where: { id, utilisateurId }
    });
    return reservation;
};

/**
 * Pour récupérer la liste des salles
 * @returns la liste des salles
 */
export const getSalles = async () => {
    const salles = await prisma.salle.findMany();
    return salles;
};