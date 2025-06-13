// routes.js
import { Router } from "express";

import passport from "passport";
import { getUserByEmail, addUser, updateLastLogin } from "./model/user.js";
import {
  createCodeForUser,
  createCodeForEmail,
  getLatestCodeByUser,
  deleteCode
} from "./model/verificationCode.js";

import {
  listSalles,
  createSalle,
  updateSalle,
  deleteSalle,
  findSalleById
} from "./model/gestion_salle.js";

import {
  getSalles,              // pour l’API publique
  listReservations,       // liste d’un utilisateur
  createReservation,
  cancelReservation
} from "./model/utilisation_salle.js";

import { isEmailValid, isPasswordValid } from "./validation.js";
import { sendVerificationCode, sendInscriptionVerificationCode } from "./model/email.js";

const router = Router();

// — accueil —
router.get("/", (req, res) => {
  res.render("index", {

    titre: "Accueil",
    scripts: ["./js/main.js"],
    styles: ["./css/style.css"]
  });
});

// — Inscription utilisateur (GET /user/register) —
router.get("/user/register", (req, res) => {
  res.render("userInscription", {
    titre:   "Inscription Utilisateur",
    styles:  ["/css/style.css","/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

// — Connexion utilisateur (GET /user/login) —
router.get("/user/login", (req, res) => {
  res.render("userLogin", {
    titre:   "Connexion Utilisateur",
    styles:  ["/css/style.css","/css/form.css"],
    scripts: ["/js/connexion.js"]
  });
});

// — Inscription admin (GET /admin/register) —
router.get("/admin/register", (req, res) => {
  res.render("adminInscription", {
    titre:   "Inscription Administrateur",
    styles:  ["/css/style.css","/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

// — Connexion admin (GET /admin/login) —
router.get("/admin/login", (req, res) => {
  res.render("adminLogin", {
    titre:   "Connexion Administrateur",
    styles:  ["/css/style.css","/css/form.css"],
    scripts: ["/js/connexion.js"]
  });
});

// — Formulaire de saisie du code 2FA admin —
router.get("/admin/code",  (req, res) => {
  res.render("adminCode", {
    titre:   "Code Administrateur",
    styles:  ["/css/style.css","/css/form.css"],
    scripts: ["/js/adminCode.js"]
  });
});

// — Tableau de bord secret admin —
router.get("/admin-secret", (req, res) => {
  res.render("adminSecret", {
    titre:   "Page secrète admin",
    styles:  ["/css/style.css"],
    scripts: ["/js/adminSecret.js"]
  });
});


// — traite la connexion (utilisateur OU admin) —
router.post("/connexion", (req, res, next) => {
  const { email, motDePasse } = req.body;
  if (!isEmailValid(email) || !isPasswordValid(motDePasse)) {
    return res.status(400).json({ error: "Email ou mot de passe invalide." });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);

    // Super-admin → on déclenche le 2FA
    if (user.email === process.env.EMAIL_USER) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await createCodeForUser(user.id, code, expiresAt);
      await sendVerificationCode(user.email, code);

      return req.logIn(user, loginErr => {
        if (loginErr) return next(loginErr);
        // on renvoie juste un flag, la route ne redirige pas
        return res.status(200).json({ admin2FA: true });
      });
    }

    // Utilisateur “simple”
    await updateLastLogin(user.id);
     req.logIn(user, loginErr => {
      if (loginErr) return next(loginErr);
      return res.status(200).json({ success: true });
    });
  })(req, res, next);
});

// — traite l'inscription utilisateur pure —
router.post("/inscription", async (req, res) => {
  const { prenom, nom, email, motDePasse } = req.body;
  if (!prenom || !nom || !email || !motDePasse) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  try {
    await addUser({ prenom, nom, email, motDePasse });
    res.status(201).json({ message: "Inscription réussie" });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });
    }
    res.status(500).json({ error: e.message });
  }
});

// — traite la demande d'inscription admin (envoi code au super-admin) —
router.post("/admin/inscription", async (req, res) => {
  const { prenom, nom, email } = req.body;
  if (!prenom||!nom||!isEmailValid(email)) {
    return res.status(400).json({ error: "Données invalides" });
  }
  const code    = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000);
  await createCodeForEmail(email, code, expires);
  await sendInscriptionVerificationCode(prenom, nom, email, code);
  return res.status(200).json({ message: "Demande envoyée au super-admin" });
});

// POST /api/verify-code — validation du 2FA admin
router.post("/api/verify-code", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code manquant." });
  }

  // Récupère le dernier code pour l’utilisateur connecté
  const entry = await getLatestCodeForUser(req.user.id);
  if (!entry) {
    return res.status(404).json({ error: "Aucune demande trouvée." });
  }
  if (entry.expiresAt < new Date()) {
    return res.status(410).json({ error: "Code expiré." });
  }

  const valid = await bcrypt.compare(code, entry.code);
  if (!valid) {
    return res.status(401).json({ error: "Code invalide." });
  }

  // tout est bon, supprimez le code
  await deleteCode(entry.id);

  // On ne redirige pas ici, on renvoie un flag
  return res.status(200).json({ verified: true });
});

// POST /api/inscription/verify — validation du code d’inscription utilisateur
router.post("/api/inscription/verify", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code manquant." });
  }

  const entry = await getLatestCodeForEmail(req.session.email);
  if (!entry) {
    return res.status(404).json({ error: "Code introuvable." });
  }
  if (entry.expiresAt < new Date()) {
    return res.status(410).json({ error: "Code expiré." });
  }

  const valid = await bcrypt.compare(code, entry.code);
  if (!valid) {
    return res.status(401).json({ error: "Code invalide." });
  }

  // supprimez le code et créez l’utilisateur si nécessaire…
  await deleteCode(entry.id);

  return res.status(200).json({ verified: true });
});

router.get("/accueil/user", (req, res) => {
  res.render("accueilUser", {
    titre:   "Page d'accueil utilisateur",
    styles:  ["/css/style.css", "/css/pageUser.css"],
    scripts: ["/js/reservation.js"],
    user:    req.session.user
  });
});

// ── Gestion des salles ────────────────────────────────────────────

// GET /salles
// Affiche la liste de toutes les salles
router.get("/salles", async (req, res, next) => {
  try {
    const salles = await listSalles();
    res.render("salles/list", { salles });
  } catch (err) {
    next(err);
  }
});

// POST /salles
// Crée une nouvelle salle
router.post("/salles", async (req, res, next) => {
  try {
    const { nom, capacite, emplacement } = req.body;
    await createSalle({ 
      nom, 
      capacite: parseInt(capacite, 10), 
      emplacement 
    });
    res.redirect("/salles");
  } catch (err) {
    next(err);
  }
});

// GET /salles/:id/edit
// Formulaire d’édition d’une salle
router.get("/salles/:id/edit", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const salle = await findSalleById(id);
    res.render("salles/edit", { salle });
  } catch (err) {
    next(err);
  }
});

// PUT /salles/:id
// Met à jour une salle
router.put("/salles/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nom, capacite, emplacement } = req.body;
    await updateSalle(id, {
      nom,
      capacite: parseInt(capacite, 10),
      emplacement
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /salles/:id
// Supprime une salle
router.delete("/salles/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteSalle(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Gestion des réservations utilisateur ────────────────────────────

// GET /reservations
// Affiche les réservations de l’utilisateur connecté
router.get("/reservations", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const userId = req.session.user.id;
    const reservations = await listReservations(userId);
    res.render("reservations/listReservationUser", {
      titres: "Mes réservations",
      styles: ["/css/style.css","/css/pageUser.css"],
      scripts: ["/js/reservation.js"],
      reservations,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// GET /reservations/new
// Formulaire de création d’une réservation
router.get("/reservations/new", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const salles = await getSalles();
    res.render("newReservationUser", {
      titre: "Nouvelle réservation",
      styles: ["/css/style.css","/css/pageUser.css"],
      scripts: ["/js/reservation.js"],
      salles,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// POST /reservations
// Enregistre une nouvelle réservation
router.post("/reservations", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).send("Vous devez être connecté.");
  }
  try {
    const { salleId, dateDebut, dateFin } = req.body;
    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res.status(400).send("Date début doit être antérieure à date fin.");
    }
    await createReservation({
      utilisateurId: req.session.user.id,
      salleId: parseInt(salleId, 10),
      dateDebut,
      dateFin
    });
    res.redirect("/reservations");
  } catch (err) {
    next(err);
  }
});

// DELETE /reservations/:id
// Annule une réservation
router.delete("/reservations/:id", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    const id = parseInt(req.params.id, 10);
    await cancelReservation(id, req.session.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── API JSON pour réservation & salles ────────────────────────────

// GET /api/salles
// Renvoie la liste de toutes les salles au format JSON
router.get("/api/salles", async (req, res, next) => {
  try {
    const salles = await getSalles();
    res.json(salles);
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations
// Crée une réservation via AJAX
router.post("/api/reservations", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const { salleId, date, heure } = req.body;
    if (!salleId || !date || !heure) {
      return res.status(400).json({ error: "Données manquantes." });
    }
    const reservation = await createReservation({
      utilisateurId: req.session.user.id,
      salleId: parseInt(salleId, 10),
      dateDebut: date + "T" + heure,
      dateFin:   date + "T" + heure  // ou calculer fin +1h par défaut
    });
    res.json({ reservation, message: "Réservation réussie" });
  } catch (err) {
    next(err);
  }
});

 // — déconnexion —
router.get("/deconnexion", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
      return res.status(500).send("Erreur de déconnexion");
    }
    res.redirect("/");
  });
});

export default router;