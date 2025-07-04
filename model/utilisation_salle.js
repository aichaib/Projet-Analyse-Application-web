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
    include: { salle: true },
    orderBy: { dateUtilisation: 'asc' }
  });

  // Ajoute des champs formatés
  return reservations.map(r => {
    const heureDebut = new Date(r.heureUtilisation);
    const heureFin = new Date(heureDebut.getTime() + 3 * 60 * 60 * 1000); // +3h

    const formatHeure = (date) =>
      `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

    return {
      ...r,
      heureDebutStr: formatHeure(heureDebut),
      heureFinStr: formatHeure(heureFin)
    };
  });
};


export async function getCapacitesDisponibles() {
  const capacites = await prisma.salle.findMany({
    select: { capacite: true },
    distinct: ['capacite'],
    orderBy: { capacite: 'asc' }
  });
  return capacites.map(c => c.capacite);
}


export async function getSallesDispoParCritere({ capacite, equipement, dateHeure }) {
  const dateObj = new Date(dateHeure);

  // Séparer la date et l’heure
  const jour = new Date(dateObj.toISOString().split("T")[0]); // YYYY-MM-DD
  const heure = dateObj; // heure précise avec minutes et secondes

  const salles = await prisma.salle.findMany({
    where: {
      //  Filtrer la capacité demandée
      capacite: capacite ? { gte: capacite } : undefined,

      //  Filtrer par équipement (optionnel)
      equipements: equipement ? {
        some: {
          equipement: {
            nom: { contains: equipement }
          }
        }
      } : undefined,

      //  Exclure les salles déjà réservées à ce moment-là
      reservations: {
        none: {
          dateUtilisation: jour,
          heureUtilisation: heure
        }
      }
    },
    include: {
      equipements: {
        include: { equipement: true }
      }
    }
  });

  return salles;
}




/**
 * Pour créer une réservation
 * @param {*} { utilisateurId, salleId, dateDebut, dateFin }
 * @returns la réservation créée
 */
export const createReservation = async ({
  utilisateurId,
  salleId,
  dateUtilisation,
  heureUtilisation
}) => {
  if (!dateUtilisation || !heureUtilisation) {
    throw new Error("Date ou heure manquante pour la réservation.");
  }

  const reservation = await prisma.utilisationSalle.create({
    data: {
      utilisateurId,
      salleId,
      dateUtilisation: new Date(dateUtilisation),   // le jour choisi
      heureUtilisation: new Date(heureUtilisation), // l’heure exacte choisie
      dateCreation: new Date() // timestamp actuel
    }
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
