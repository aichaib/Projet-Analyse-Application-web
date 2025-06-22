// routes.js
import { Router } from "express";

import passport from "passport";
import { getUserByEmail, addUser, updateLastLogin } from "./model/user.js";
import {
  createCodeForUser,
  createCodeForEmail,
  getLatestCodeByUser,
  deleteCode, getLatestCodeByEmail
} from "./model/verificationCode.js";

import { buildCalendar, monthNames } from "./model/calendareController.js";
import {
  listSalles,
  createSalle,
  updateSalle,
  deleteSalle,
  findSalleById
} from "./model/gestion_salle.js";

import {
  getSalles,              // pour l'API publique
  listReservations,       // liste d'un utilisateur
  createReservation,
  cancelReservation,
  getHistoriqueReservations
} from "./model/utilisation_salle.js";

import { isEmailValid, isPasswordValid } from "./validation.js";
import { sendVerificationCode, sendInscriptionVerificationCode } from "./model/email.js";

import bcrypt from "bcrypt";
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
    titre: "Inscription Utilisateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

// — Connexion utilisateur (GET /user/login) —
router.get("/user/login", (req, res) => {
  res.render("userLogin", {
    titre: "Connexion Utilisateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/connexion.js"]
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
    // Utilisateur "simple"
    await updateLastLogin(user.id);
    req.logIn(user, loginErr => {
      if (loginErr) return next(loginErr);
      if (!req.session.user) {
        req.session.user = user;
      }
      return res.status(200).json({ success: true });
    });
  })(req, res, next);
});

router.get("/accueil/user", (req, res) => {
  res.render("accueilUser", {
    titre: "Page d'accueil utilisateur",
    styles: ["/css/style.css", "/css/pageUser.css"],
    scripts: ["/js/reservation.js"],
    user: req.session.user
  });
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
    console.error("Erreur d'inscription utilisateur :", e);
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });
    }
    res.status(500).json({ error: e.message });
  }
});


// — Inscription admin (GET /admin/register) —

// — traite la demande d'inscription admin (envoi code au super-admin) —

function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.adminAuth) {
    return next();
  } else {
    return res.redirect("/admin/login");
  }
}


router.post("/admin/inscription", async (req, res) => {
  const { prenom, nom, email, motDePasse } = req.body;
  if (req.session.pendingInscriptionEmail === email) {
    return res.json({ next: "/admin/inscription/code" });
  }
  req.session.pendingInscriptionEmail = email;
  req.session.pendingAdminInfos = { prenom, nom, motDePasse };

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000);

  await createCodeForEmail(email, code, expires);

  await sendInscriptionVerificationCode(prenom, nom, email, code);
  return res.status(200).json({ message: "Demande envoyée au super-admin" });
});

router.get("/admin/register", (req, res) => {
  res.render("adminInscription", {
    titre: "Inscription Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

router.get("/admin/register/code", (req, res) => {
  if (!req.session.pendingInscriptionEmail) {
    return res.redirect("/admin/login");
  }
  res.render("adminSecret",
    {
      titre: "Code d'inscription admin",
      styles: ["/css/style.css", "/css/form.css"],
      scripts: ["/js/adminCode.js"]
    });
});

// — Connexion admin (GET /admin/login) —
router.get("/admin/login", (req, res) => {
  res.render("adminLogin", {
    titre: "Connexion Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminLogin.js"]
  });
});

// — Formulaire de saisie du code 2FA admin —
router.get("/admin/code", (req, res) => {
  if (!req.session.pendingAdminEmail) {
    return res.redirect("/admin/login");
  }
  res.render("adminCode", {
    titre: "Code Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminCode.js"]
  });
});



// --- Traitement de la connexion admin ---
router.post("/admin/login", (req, res, next) => {
  const { email, motDePasse } = req.body;
  if (!isEmailValid(email) || !isPasswordValid(motDePasse)) {
    return res.status(400).json({ error: "Email ou mot de passe invalide." });
  }
  passport.authenticate("local", async (err, user, info) => {
    if (!user || !user.isAdmin) { 
      return res.status(401).json({ error: "Accès refusé." });
    }
    console.log("Résultat passport :", { err, user, info })
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: "Accès refusé." });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await createCodeForUser(user.id, user.email, code, expiresAt);

    await sendVerificationCode(user.email, code);
    console.log("Code 2FA envoyé :", user.email, ":", code);

    req.session.pendingAdminEmail = user.email;
    return res.json({ admin2FA: true });
  })(req, res, next);
});


// POST /api/verify-code — validation du 2FA admin
// POST /admin/verify-code — validation du 2FA admin
router.post("/admin/verify-code", async (req, res) => {
  const { code } = req.body;
  const email = req.session.pendingAdminEmail;

  if (!email) {
    return res.status(400).json({ error: "Session expirée ; reconnectez-vous." });
  }

  const entry = await getLatestCodeByEmail(email);
  if (!entry || entry.expiresAt < new Date()) {
    return res.status(410).json({ error: "Code expiré." });
  }

  // Très important : s'assurer que les deux codes sont des chaînes et bien nettoyés
  const inputCode = code.toString().trim(); // <- assure que c'est bien une string
  const valid = await bcrypt.compare(inputCode, entry.code);

  if (!valid) {
    console.log("Code tapé :", inputCode);
    console.log("Code attendu (hashé) :", entry.code);
    return res.status(401).json({ error: "Code invalide." });
  }

  const user = await getUserByEmail(email);
  await deleteCode(entry.id);
  req.session.user = {
    id: user.id,
    email: user.email,
    prenom: user.prenom,
    nom: user.nom,
    adminAuth: true,
  };
  delete req.session.pendingAdminEmail;
  return res.json({ redirect: "/accueil/admin" });
});

router.post("/admin/inscription/verify", async (req, res) => {
  const { code } = req.body;
  const email = req.session.pendingInscriptionEmail;
  console.log("Vérification d'inscription pour :", email, "avec le code :", code);
  if (!email) return res.status(400).json({ error: "Session perdue" });

  const entry = await getLatestCodeByEmail(email);
  if (!entry || entry.expiresAt < new Date()) {
    return res.status(410).json({ error: "Code expiré." });
  }
  if (!(await bcrypt.compare(code.toString(), entry.code))) {
    return res.status(401).json({ error: "Code invalide." });
  }

  // tout est bon : suppression du code et création de l'admin réel
  await deleteCode(entry.id);
  const infos = req.session.pendingAdminInfos;
  delete req.session.pendingInscriptionEmail;
  delete req.session.pendingAdminInfos;

  await addUser({
    prenom: infos.prenom,
    nom: infos.nom,
    email,
    motDePasse: infos.motDePasse,
    isAdmin: true
  });
  return res.json({ redirect: "/admin/login" });
});


router.get("/accueil/admin", requireAuth,(req, res) => {
  if (!req.session.user || !req.session.user.adminAuth) {
    return res.redirect("/admin/login");
  }
  res.render("dashboardAdmin", {
    titre: "Page d'accueil administrateur",
    styles: ["/css/style.css", "/css/styleDashboard.css"],
    scripts: ["/js/main.js"],
    user: req.session.user
  });
});

// ── Gestion des salles ────────────────────────────────────────────

// GET /salles
// Affiche la liste de toutes les salles
router.get("/salles",requireAuth, async (req, res, next) => {
  try {
    const salles = await listSalles();
    res.render("salles/list", { salles });
  } catch (err) {
    next(err);
  }
});

// POST /salles
// Crée une nouvelle salle
router.post("/salles",requireAuth, async (req, res, next) => {
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
// Formulaire d'édition d'une salle
router.get("/salles/:id/edit",requireAuth, async (req, res, next) => {
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
// Affiche les réservations de l'utilisateur connecté
router.get("/reservations", async (req, res, next) => {
  console.log("Session utilisateur:", req.session.user);
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const now = new Date();
    const month = Number(req.query.month) >= 0
      ? Number(req.query.month)
      : now.getMonth();
    const year = Number(req.query.year) || now.getFullYear();

    // 3) Charger les réservations de l'utilisateur
    const allResa = await listReservations(req.session.user.id);

    // 4) Construire le calendrier
    const days = buildCalendar(month, year, allResa);
    const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const monthYear = `${monthNames[month]} ${year}`;
    res.render("listReservation", {
      titres: "Mes réservations",
      styles: ["/css/style.css", "/css/calendar.css"],
      scripts: ["/js/reservation.js", "/js/calendar.js"],
      weekdays,
      days,
      monthYear,
      month,
      year,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// GET /reservations/new
// Formulaire de création d'une réservation
router.get("/reservations/new", async (req, res, next) => {
  console.log("Session utilisateur:", req.session.user);
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const salles = await getSalles();
    [
      { day: 30, inMonth: false, reservations: [] },
      { day: 31, inMonth: false, reservations: [] },
      { day: 1, inMonth: true, reservations: [ /* réserves ce jour */] },
    ]
    res.render("newReservationUser", {
      titre: "Nouvelle réservation",
      styles: ["/css/style.css", "/css/reservation.css"],
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

// Annule une réservation
router.delete("/reservations/:id", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    await cancelReservation(
      parseInt(req.params.id, 10),
      req.session.user.id
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /historique
// Affiche l'historique des réservations de l'utilisateur
router.get("/historique", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }

  try {
    const historique = await getHistoriqueReservations(req.session.user.id);
    
    // Formatter les dates pour l'affichage
    const reservationsFormattees = historique.map(resa => ({
      ...resa,
      dateDebut: new Date(resa.dateDebut).toLocaleString('fr-FR'),
      dateFin: new Date(resa.dateFin).toLocaleString('fr-FR')
    }));

    res.render("historique", {
      titre: "Historique des réservations",
      styles: ["/css/style.css", "/css/historique.css"],
      reservations: reservationsFormattees,
      user: req.session.user
    });
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
      dateFin: date + "T" + heure  // ou calculer fin +1h par défaut
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