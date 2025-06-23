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

/**
 * Récupère l'historique des réservations (passées) d'un utilisateur.
 * @param {number} utilisateurId - L'ID de l'utilisateur.
 * @returns {Promise<UtilisationSalle[]>}
 */
export async function getHistoriqueReservations(utilisateurId) {
  try {
    return await prisma.utilisationSalle.findMany({
      where: {
        utilisateurId: utilisateurId,
        dateFin: {
          lt: new Date(), // lt = Less Than (inférieur à la date actuelle)
        },
      },
      include: {
        salle: true, // Inclure les détails de la salle
      },
      orderBy: {
        dateDebut: 'desc', // Les plus récentes en premier
      },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération de l'historique:", err);
    throw err;
  }
}

/**
 * Récupère toutes les réservations actives et futures d'un utilisateur.
 * @param {number} utilisateurId - L'ID de l'utilisateur.
 * @returns {Promise<UtilisationSalle[]>}
 */
export async function getReservationsByUserId(utilisateurId) {
  try {
    return await prisma.utilisationSalle.findMany({
      where: {
        utilisateurId: utilisateurId,
        dateFin: {
          gte: new Date(),
        },
      },
      include: {
        salle: true,
      },
      orderBy: {
        dateDebut: 'asc',
      },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des réservations de l'utilisateur:", err);
    throw err;
  }
}

export async function getAllReservations() {
  try {
    return await prisma.utilisationSalle.findMany({
      include: {
        salle: true,
        utilisateur: true, // Inclure les détails de l'utilisateur
      },
      orderBy: {
        dateDebut: 'asc',
      },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération de toutes les réservations:", err);
    throw err;
  }
}