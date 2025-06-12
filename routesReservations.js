import { Router } from "express";
const router = Router();
// Routes pour les réservations

// GET /reservations - affiche la liste des réservations de l'utilisateur connecté
router.get("/reservations", (req, res) => {
    res.render("reservations/listReservationUser", {
        titre: "Mes réservations",
        styles: ["/css/style.css","/css/pageUser.css"],
        
        reservations // variable en mémoire déjà déclarée plus haut
    });
});

// GET /reservations/new - affiche le formulaire pour créer une nouvelle réservation
router.get("/reservations/new", (req, res) => {
    res.render("reservations/newReservationUser", {
        titre: "Nouvelle réservation",
        styles: ["/css/style.css","/css/pageUser.css"],
        scripts: ["/js/reservation.js"]
    });
});

// POST /reservations - crée une nouvelle réservation
router.post("/reservations", async (request, response) => {
    const { salleId, dateDebut, dateFin } = request.body;
    if (new Date(dateDebut) >= new Date(dateFin)) {
        return response.status(400).send('La date de début doit être avant la date de fin.');
    }
    await createReservation({ utilisateurId: request.session.user.id, salleId: parseInt(salleId), dateDebut, dateFin });
    response.redirect("/reservations");
});

// DELETE /reservations/:id - annule une réservation
router.delete("/reservations/:id", async (request, response) => {
    await cancelReservation(parseInt(request.params.id), request.session.user.id);
    response.json({ success: true });
});

// --- LOGIQUE EN MÉMOIRE POUR LES RÉSERVATIONS ---
const salles = [
    { id: 1, nom: "Salle A" },
    { id: 2, nom: "Salle B" }
];
const reservations = [];

// API pour obtenir les salles
router.get("/api/salles", (req, res) => {
    res.status(200).json(salles);
});

// API pour créer une réservation
router.post("/api/reservations", (req, res) => {
    const { salleId, date, heure } = req.body;
    if (!salleId || !date || !heure) {
        return res.status(400).json({ error: "Données manquantes." });
    }
    const reservation = { salleId, date, heure };
    reservations.push(reservation);
    res.status(200).json({ reservation, message: "Réservation réussie" });
});

export default router;
