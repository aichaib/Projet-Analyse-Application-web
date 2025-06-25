// routes.js
import { Router } from "express";

import passport from "passport";
import {
  getUserById,
  getUserByEmail,
  addUser,
  updateLastLogin,
  updateUser,
  deleteUser,
  listUsers,
  createUser,
  findUserByEmail
} from "./model/user.js";

import { getHistoriqueByAdminId } from './model/historiqueAdmin.js';

import {
  createCodeForUser,
  createCodeForEmail,
  getLatestCodeByUser,
  deleteCode, getLatestCodeByEmail
} from "./model/verificationCode.js";


import { buildCalendar, monthNames } from "./model/calendareController.js";
import { logAdminAction } from "./model/historiqueAdmin.js";

import {
  listSalles,
  createSalle,
  updateSalle,
  deleteSalle,
  findSalleById,
  findSalleByNom
} from "./model/gestion_salle.js";

import {
  getSalles,              // pour l'API publique
  listReservations,       // liste d'un utilisateur
  createReservation,
  cancelReservation,
  getHistoriqueReservations,
  getReservationsByUserId,
  getSallesDispoParCritere,
  getCapacitesDisponibles
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

  const inputCode = code.toString().trim();
  const valid = await bcrypt.compare(inputCode, entry.code);

  if (!valid) {
    return res.status(401).json({ error: "Code invalide." });
  }

  const user = await getUserByEmail(email);
  await deleteCode(entry.id);

  // C’est ICI que tu mets cette ligne :
  if (!req.session.user) {
    req.session.user = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      nom: user.nom,
      adminAuth: true
    };
  }

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


router.get("/accueil/admin", requireAuth, (req, res) => {
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
router.get("/salles", requireAuth, async (req, res, next) => {
  try {
    const salles = await listSalles();
    res.render("salles/list", {
      titres: "Liste des salles",
      styles: ["/css/style.css", "/css/sallesList.css"],
      scripts: ["/js/salles.js"],
      salles
    });
  } catch (err) {
    console.error("Erreur création salle :", err);
    next(err);
  }
});

// POST /salles
// Crée une nouvelle salle
router.post("/salles", requireAuth, async (req, res, next) => {
  try {
    const { nom, capacite, emplacement, equipementId } = req.body;
    console.log("Données reçues :", req.body);

    // Vérifie si une salle existe déjà
    const existing = await findSalleByNom(nom);

    if (existing) {
      return res.status(409).json({ error: "Le nom de salle existe déjà." });
    }

    await createSalle({
      nom,
      capacite: parseInt(capacite),
      emplacement,
      equipementId: parseInt(equipementId)
    });

    await logAdminAction(req.session.user.id, "Création salle", nom);

    return res.redirect("/salles");
  } catch (err) {
    console.error("ERREUR serveur à POST /salles:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Le nom de salle est déjà utilisé." });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// GET /salles/:id/edit
// Formulaire d'édition d'une salle
router.get("/salles/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const salle = await findSalleById(id);
    if (!salle) {
      return res.status(404).send("Salle non trouvée");
    }

    await logAdminAction(req.session.user.id, "Accès à l'édition d'une salle", `Salle ID: ${id}`);

    res.render("salles/edit", {
      titre: "Modifier la salle",
      styles: ["/css/style.css", "/css/styleEdit.css"],
      scripts: ["/js/crudSalles.js"],
      salle,
      equipements
    });
  } catch (err) {
    next(err);
  }
});


// PUT /salles/:id
// Met à jour une salle
router.put("/salles/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nom, capacite, emplacement, equipementId } = req.body;

    await updateSalle(id, {
      nom,
      capacite: parseInt(capacite, 10),
      emplacement,
      equipementId
    });

    await logAdminAction(req.session.user.id, "Mise à jour d'une salle", `Salle ID: ${id}, Nom: ${nom}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});


// DELETE /salles/:id
// Supprime une salle
router.delete("/salles/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteSalle(id);
    await logAdminAction(req.session.user.id, "Suppression d'une salle", `Salle ID: ${id}`);
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

// Formulaire de création d'une réservation
router.get("/reservations/new", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const salles = await getSalles();
    const equipements = await listEquipements();
    const capacites = await getCapacitesDisponibles();

    res.render("newReservationUser", {
      titre: "Nouvelle réservation",
      styles: ["/css/style.css", "/css/reservation.css"],
      scripts: ["/js/reservation.js"],
      salles,
      equipements,
      capacites,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// POST /reservations
// Enregistre une nouvelle réservation
router.post("/api/salles/recherche", async (req, res) => {
  try {
    const { capacite, equipement, date, heure } = req.body;
    const dateHeure = date && heure ? `${date}T${heure}` : null;

    const salles = await getSallesDispoParCritere({
      capacite: capacite ? parseInt(capacite, 10) : undefined,
      equipement,
      dateHeure
    });

    res.json(salles);
  } catch (err) {
    console.error("Erreur recherche salle :", err);
    res.status(500).json({ error: "Erreur serveur" });
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


// ── Ajout du formulaire 'Ajouter une salle' ────────────────────────
router.get("/salles/new", requireAuth, async (req, res, next) => {
  try {
    const equipements = await import("./model/equipement.js").then(m => m.listEquipements());
    res.render("salles/newSalle", {
      titre: "Nouvelle salle",
      styles: ["/css/style.css", "/css/styleCreationSalle.css"],
      scripts: ["/js/crudSalles.js"],
      equipements
    });
  } catch (err) {
    next(err);
  }
});

// ── Historique complet des réservations (admin) ─────────────────────
import { getAllReservations } from "./model/utilisation_salle.js";  // Assurez-vous que cette fonction existe

router.get("/admin/historique", requireAuth, async (req, res, next) => {
  try {
    const all = await getAllReservations();
    const formatted = all.map(resa => ({
      ...resa,
      dateDebut: new Date(resa.dateDebut).toLocaleString('fr-FR'),
      dateFin: new Date(resa.dateFin).toLocaleString('fr-FR')
    }));
    res.render("historique", {
      titre: "Historique complet des réservations",
      styles: ["/css/style.css", "/css/historique.css"],
      reservations: formatted,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// ── Gestion des utilisateurs (admin) ───────────────────────────────

router.get("/admin/utilisateurs", requireAuth, async (req, res, next) => {
  try {
    const users = await listUsers();
    res.render("utilisateurs/listUtilisateurs", {
      titre: "Gestion des utilisateurs",
      styles: ["/css/style.css", "/css/styleListUtilisateurs.css"],
      users
    });
  } catch (err) {
    next(err);
  }
});



// ── Gestion des équipements ────────────────────────────────────────
import {
  listEquipements, createEquipement,
  updateEquipement, deleteEquipement
} from "./model/equipement.js";

// Get liste de tous les equipements
router.get("/list/equipement", async (req, res) => {
  try {
    const equipements = await listEquipements();
    res.render("listEquipement", {
      titres: "Liste des Equipements",
      styles: ["/css/style.css", "/css/equipement.css"],
      styles: ["/css/style.css", "/css/equipement.css"],    
      scripts: ["/js/equipement"],

      equipements,
    });
  } catch (error) {
    console.error("Error fetching equipements:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Post création d'un nouvel equipement
router.post("/new/equipement", async (req, res) => {
  const { nom } = req.body;
  try {
    await createEquipement({ nom });

    res.redirect("/list/equipement");
    
  } catch (error) {
    if (error.message.includes("existe déjà")) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Erreur création équipement:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/new/equipement", (req, res) => {
  res.render("newEquipement", {
    titre: "Ajouter un équipement",
    styles: ["/css/style.css", "/css/equipement.css"],
    scripts: ["/js/equipement.js"],
  });
});

// Get formulaire de modification d'un equipement
router.get('/equipement/modifier/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const equipement = await listEquipements().then(equipements => equipements.find(e => e.id === id));
    if (!equipement) {
      return res.status(404).send("Équipement non trouvé");
    }
    res.render("editEquipement", {
      titre: "Modifier un équipement",
      styles: ["/css/style.css", "/css/equipement.css"],
      scripts: ["/js/equipement.js"],
      equipement
    });
  } catch (error) {
    console.error("Error fetching equipement:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Post modification d'un equipement
router.post('/equipement/modifier/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  console.log("Requête POST modification equipement", { id, body: req.body });
  const nom = req.body.nom;
  if (!nom || nom.trim() === "") {
    const messageErreur = "Le nom de l'équipement est requis.";
    if (req.headers['content-type'] === 'application/json') {
      return res.status(400).json({ error: messageErreur });
    } else {
      return res.status(400).send(messageErreur);
    }
  }

  try {
    await updateEquipement(id, { nom: nom.trim() });

    if (req.headers['content-type'] === 'application/json') {
      return res.json({ success: true, message: "Équipement mis à jour." });
    } else {
      return res.redirect("/list/equipement");
    }
  } catch (error) {
    console.error("Erreur modification equipement:", error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: error.message });
    } else {
      return res.status(500).send("Erreur de mise à jour");
    }
  }
});



// Delete un equipement
router.post('/equipement/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await deleteEquipement(id);
    res.redirect('/list/equipement');
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

router.get("/admin/utilisateurs/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await getUserById(id); // Assuming you're using ID now, not email
    if (!user) {
      return res.status(404).send("Utilisateur non trouvé");
    }
    await logAdminAction(req.session.user.id, "Accès à l'édition d'un utilisateur", `Utilisateur ID: ${id}`);

    res.render("utilisateurs/editUtilisateurs", {
      titre: "Modifier l'utilisateur",
      styles: ["/css/style.css", "/css/styleEdit.css"],
      scripts: ["/js/utilisateurs.js"],
      user
    });
  } catch (err) {
    next(err);
  }
});


router.delete("/admin/utilisateurs/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await deleteUser(parseInt(id));
    res.status(204).send();
  } catch (err) {
    console.error("Erreur suppression utilisateur :", err);
    res.status(500).json({ error: "Échec de la suppression" });
  }
});




router.get("/admin/historique", requireAuth, async (req, res, next) => {
  try {
    const historique = await getHistoriqueByAdminId(req.session.user.id);
    res.render("admin/historiqueAdmin", {
      titre: "Historique de mes actions",
      styles: ["/css/style.css"],
      historique,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});


router.get("/admin/historiqueAdmin", requireAuth, async (req, res, next) => {
  try {
    const historique = await getHistoriqueByAdminId(req.session.user.id);
    res.render("historiqueAdmin", {
      titre: "Historique de mes actions",
      styles: ["/css/style.css", "/css/historiqueAdmin.css"],
      historique,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

router.get("/parametres", (req, res) => {
  res.render("userSettings", {
    user: req.user,
    titre: "Paramètres",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/userSettings.js"]
  });
});


// POST /user/settings
router.post('/user/settings', async (req, res) => {
  const { prenom, nom, email } = req.body;
  try {
    await updateUser(req.user.id, { prenom, nom, email });
    res.json({ success: true, message: 'Mise à jour réussie' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});

// GET /contact
router.get('/contact', (req, res) => {
  res.render('contact', {
    titre: 'Contactez-nous',
    styles: ['/css/forms.css', '/css/contact.css', '/css/styles.css'],
    scripts: ['/js/contact.js']
  });
});

// POST /contact
router.post('/contact', async (req, res) => {
  const { sujet, message } = req.body;
  try {
    await sendContactMessage(req.user?.email || req.body.email, sujet, message);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur lors de l’envoi du message' });
  }
});

export default router;
