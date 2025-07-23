// routes.api.js

import { Router } from "express";
import bcrypt from "bcrypt";
import {
  getUserByEmail,
  addUser,
  updateLastLogin
} from "./model/user.js";

import {
  listSalles,
  findSalleById
} from "./model/gestion_salle.js";

import {
  listReservations,
  createReservation,
  cancelReservation
} from "./model/utilisation_salle.js";

const router = Router();

//
// ─── UTILISATEURS ─────────────────────────────────────
//

// Connexion utilisateur (POST /api/login)
router.post("/api/login", async (req, res) => {
  const { email, motDePasse } = req.body;
  if (!email || !motDePasse) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    const valide = await bcrypt.compare(motDePasse, user.motDePasseHash);
    if (!valide) return res.status(401).json({ error: "Mot de passe incorrect" });

    await updateLastLogin(user.id);
    return res.json({ success: true, user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// Inscription utilisateur (POST /api/register)
router.post("/api/register", async (req, res) => {
  const { prenom, nom, email, motDePasse } = req.body;
  if (!prenom || !nom || !email || !motDePasse) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    const user = await addUser({ prenom, nom, email, motDePasse });
    return res.status(201).json({ success: true, user: { id: user.id, prenom, nom, email } });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email déjà utilisé" });
    }
    return res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

//
// ─── SALLES ──────────────────────────────────────────
//

// Liste des salles (GET /api/salles)
router.get("/api/salles", async (req, res) => {
  try {
    const salles = await listSalles();
    return res.json(salles);
  } catch (err) {
    return res.status(500).json({ error: "Erreur chargement des salles" });
  }
});

// Détail salle (GET /api/salles/:id)
router.get("/api/salles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  try {
    const salle = await findSalleById(id);
    if (!salle) return res.status(404).json({ error: "Salle non trouvée" });
    return res.json(salle);
  } catch (err) {
    return res.status(500).json({ error: "Erreur chargement salle" });
  }
});

//
// ─── RÉSERVATIONS ────────────────────────────────────
//

// Liste des réservations d'un utilisateur (GET /api/reservations/:userId)
router.get("/api/reservations/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: "ID utilisateur invalide" });

  try {
    const reservations = await listReservations(userId);
    return res.json(reservations);
  } catch (err) {
    return res.status(500).json({ error: "Erreur chargement des réservations" });
  }
});

// Créer une réservation (POST /api/reservations)
router.post("/api/reservations", async (req, res) => {
  const { utilisateurId, salleId, dateUtilisation, heureUtilisation } = req.body;
  if (!utilisateurId || !salleId || !dateUtilisation || !heureUtilisation) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    const reservation = await createReservation({ utilisateurId, salleId, dateUtilisation, heureUtilisation });
    return res.status(201).json({ success: true, reservation });
  } catch (err) {
    return res.status(500).json({ error: "Erreur création réservation" });
  }
});

// Supprimer une réservation (DELETE /api/reservations/:id)
router.delete("/api/reservations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { utilisateurId } = req.body;
  if (isNaN(id) || !utilisateurId) {
    return res.status(400).json({ error: "ID invalide ou utilisateur manquant" });
  }

  try {
    await cancelReservation(id, utilisateurId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erreur suppression réservation" });
  }
});

export default router;
