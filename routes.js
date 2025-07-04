import { Router } from "express";

import { PrismaClient } from "@prisma/client";

import passport from "passport";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ─── IMPORTS ─────────────────────────────────────────────────────────────
import {
  getUserById, getUserByEmail, addUser, updateLastLogin, updateUser,
  deleteUser, listUsers
} from "./model/user.js";

import {
  createCodeForUser, createCodeForEmail, getLatestCodeByUser,
  getLatestCodeByEmail, deleteCode
} from "./model/verificationCode.js";

import { sendVerificationCode, sendInscriptionVerificationCode } from "./model/email.js";
import { isEmailValid, isPasswordValid } from "./validation.js";

import {
  listSalles, createSalle, updateSalle, deleteSalle,
  findSalleById, findSalleByNom, getSallesFiltrees
} from "./model/gestion_salle.js";

import {
  getSalles, listReservations, createReservation, cancelReservation,
  getHistoriqueReservations, getReservationsByUserId,
  getSallesDispoParCritere, getCapacitesDisponibles,
  getAllReservations
} from "./model/utilisation_salle.js";


import {
  getHistoriqueByAdminId, logAdminAction
} from "./model/historiqueAdmin.js";

import { buildCalendar, monthNames } from "./model/calendareController.js";

import { envoyerMessageContact } from "./model/email.js";
const router = Router();

// ─── PAGE PUBLIQUE ──────────────────────────────────────────────────────
router.get("/", (req, res) => {
  res.render("index", {
    titre: "Accueil",
    scripts: ["./js/main.js"],
    styles: ["./css/style.css"]
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", {
    titre: 'Contactez-nous',
    styles: ['/css/form.css', '/css/contact.css', '/css/style.css'],
    scripts: ['/js/contact.js']
  });
});

// router.post("/contact", async (req, res) => {
//   const { sujet, message } = req.body;
//   try {
//     await sendVerificationCode(req.user?.email || req.body.email, sujet, message);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ success: false, error: 'Erreur lors de l’envoi du message' });
//   }
// });

router.get("/deconnexion", (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).send("Erreur de déconnexion");
    res.redirect("/");
  });
});

// ─── UTILISATEUR : AUTH ─────────────────────────────────────────────────
router.get("/user/register", (req, res) => {
  res.render("userInscription", {
    titre: "Inscription Utilisateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

router.post("/inscription", async (req, res) => {
  const { prenom, nom, email, motDePasse } = req.body;
  if (!prenom || !nom || !email || !motDePasse) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  try {
    await addUser({ prenom, nom, email, motDePasse });
    res.status(201).json({ message: "Inscription réussie" });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Cet e-mail est déjà utilisé." });
    res.status(500).json({ error: e.message });
  }
});

router.get("/user/login", (req, res) => {
  res.render("userLogin", {
    titre: "Connexion Utilisateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/connexion.js"]
  });
});

router.post("/connexion", (req, res, next) => {
  const { email, motDePasse } = req.body;
  if (!isEmailValid(email) || !isPasswordValid(motDePasse)) {
    return res.status(400).json({ error: "Email ou mot de passe invalide." });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json(info);
    await updateLastLogin(user.id);
    req.logIn(user, loginErr => {
      if (loginErr) return next(loginErr);
      req.session.user = user;
      res.status(200).json({ success: true });
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
      styles: ["/css/style.css", "/css/styleSalles.css"],
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
router.get("/salles/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const salle = await findSalleById(id);
    if (!salle) {
      return res.status(404).send("Salle non trouvée");
    }

    // Fetch equipements from database
    const equipements = await listEquipements();

    await logAdminAction(req.session.user.id, "Accès à l'édition d'une salle", `Salle ID: ${id}`);

    res.render("salles/edit", {
      titre: "Modifier la salle",
      styles: ["/css/style.css", "/css/styleEdit.css"],
      scripts: ["model/gestion_salle.js"],
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
router.delete("/api/salles/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false,
      error: "ID de salle invalide" 
    });
  }

  try {
    // Verify salle exists first
    const salle = await prisma.salle.findUnique({
      where: { id: parseInt(id) }
    });

    if (!salle) {
      return res.status(404).json({
        success: false,
        error: "Salle non trouvée"
      });
    }

    // Transaction for atomic operations
    await prisma.$transaction([
      prisma.salleEquipement.deleteMany({
        where: { salleId: parseInt(id) }
      }),
      prisma.utilisationSalle.deleteMany({
        where: { salleId: parseInt(id) }
      }),
      prisma.salle.delete({
        where: { id: parseInt(id) }
      })
    ]);

    await logAdminAction(req.session.user.id, "Suppression salle", `ID: ${id}`);
    
    return res.json({
      success: true,
      message: "Salle supprimée avec succès"
    });

  } catch (err) {
    console.error("Erreur suppression:", err);
    return res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
// /routes.js

router.get("/reservations/new", async (req, res) => {
  try {
    const salles = await prisma.salle.findMany({
      include: {
        equipements: {
          include: { equipement: true }
        }
      }
    });

    const capacites = await prisma.salle.findMany({
      select: { capacite: true },
      distinct: ['capacite'],
      orderBy: { capacite: 'asc' }
    });

    const equipements = await prisma.equipement.findMany({
      select: { nom: true }
    });

    // ✅ C'EST ICI ! Ajoute ce console.log avant le res.render
    console.log("✅ Salles envoyées :", salles.map(s => ({
      nom: s.nom,
      capacite: s.capacite,
      equipements: s.equipements.map(e => e.equipement.nom)
    })));

    res.render("newReservationUser", {
      titre: "Nouvelle réservation",
      styles: ["/css/style.css", "/css/reservation.css"],
      scripts: ["/js/reservation.js"],
      salles,
      capacites: capacites.map(c => c.capacite),
      equipements,
      user: req.session.user
    });

  } catch (err) {
    console.error("❌ Erreur Prisma :", err);
    res.status(500).send("Erreur lors du chargement des salles");
  }
});




// POST /reservations
// Enregistre une nouvelle réservation
// Recherche dynamique filtrée pour AJAX
router.post("/api/salles/recherche", async (req, res) => {
  const { capacite, equipement, date, heure } = req.body;

  try {
    const salles = await getSallesFiltrees({ capacite, equipement, date, heure });
    res.json(salles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la recherche" });
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

// GET /reservations/:id/edit - Page de modification d'une réservation
router.get("/reservations/:id/edit", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }
  try {
    const reservationId = parseInt(req.params.id, 10);
    const reservation = await prisma.utilisationSalle.findFirst({
      where: { 
        id: reservationId,
        utilisateurId: req.session.user.id 
      },
      include: { salle: true }
    });
    
    if (!reservation) {
      return res.status(404).send("Réservation non trouvée");
    }
    
    const salles = await getSalles();
    res.render("editReservation", {
      titre: "Modifier la réservation",
      styles: ["/css/style.css", "/css/reservation.css"],
      scripts: ["/js/reservation.js"],
      reservation,
      salles,
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// PUT /reservations/:id - Modifier une réservation
router.put("/reservations/:id", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  try {
    const reservationId = parseInt(req.params.id, 10);
    const { salleId, dateDebut, dateFin } = req.body;
    
    if (!salleId || !dateDebut || !dateFin) {
      return res.status(400).json({ error: "Données manquantes." });
    }
    
    // Vérifier que la réservation appartient à l'utilisateur
    const existingReservation = await prisma.utilisationSalle.findFirst({
      where: { 
        id: reservationId,
        utilisateurId: req.session.user.id 
      }
    });
    
    if (!existingReservation) {
      return res.status(404).json({ error: "Réservation non trouvée." });
    }
    
    // Mettre à jour la réservation
    const updatedReservation = await prisma.utilisationSalle.update({
      where: { id: reservationId },
      data: {
        salleId: parseInt(salleId, 10),
        dateDebut,
        dateFin
      }
    });
    
    res.json({ success: true, reservation: updatedReservation });
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
  console.log("Payload reçu :", req.body); // DEBUG
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const { salleId, dateDebut, dateFin } = req.body;
    if (!salleId || !dateDebut || !dateFin) {
      return res.status(400).json({ error: "Données manquantes." });
    }
    const reservation = await createReservation({
      utilisateurId: req.session.user.id,
      salleId: parseInt(salleId, 10),
      dateDebut,
      dateFin
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
      scripts: ["model/gestion_salle.js"],
      equipements
    });
  } catch (err) {
    next(err);
  }
});



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
  updateEquipement, deleteEquipement,
} from "./model/equipement.js";

// Get liste de tous les equipements
router.get("/list/equipement", async (req, res) => {
  try {
    const equipements = await listEquipements();
    res.render("listEquipement", {
      titres: "Liste des Equipements",
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
    const user = await getUserById(id); 
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

router.post('/user/settings', async (req, res) => {
  const { prenom, nom, email } = req.body;
  try {
    await updateUser(req.user.id, { prenom, nom, email });
    res.json({ success: true, message: 'Mise à jour réussie' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});



router.get("/admin/login", (req, res) => {
  res.render("adminLogin", {
    titre: "Connexion Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminLogin.js"]
  });
});

router.post("/admin/login", async (req, res, next) => {
  const { email, motDePasse } = req.body;
  if (!isEmailValid(email) || !isPasswordValid(motDePasse)) {
    return res.status(400).json({ error: "Email ou mot de passe invalide." });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (!user?.isAdmin) return res.status(401).json({ error: "Accès refusé." });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await createCodeForUser(user.id, user.email, code, expiresAt);
    await sendVerificationCode(user.email, code);
    req.session.pendingAdminEmail = user.email;
    return res.json({ admin2FA: true });
  })(req, res, next);
});

router.get("/admin/code", (req, res) => {
  if (!req.session.pendingAdminEmail) return res.redirect("/admin/login");
  res.render("adminCode", {
    titre: "Code Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminCode.js"]
  });
});

router.post("/admin/verify-code", async (req, res) => {
  const { code } = req.body;
  const email = req.session.pendingAdminEmail;
  const entry = await getLatestCodeByEmail(email);
  if (!entry || entry.expiresAt < new Date()) return res.status(410).json({ error: "Code expiré." });

  const valid = await bcrypt.compare(code.trim(), entry.code);
  if (!valid) return res.status(401).json({ error: "Code invalide." });

  const user = await getUserByEmail(email);
  await deleteCode(entry.id);
  req.session.user = {
    id: user.id,
    email: user.email,
    prenom: user.prenom,
    nom: user.nom,
    adminAuth: true
  };
  delete req.session.pendingAdminEmail;
  return res.json({ redirect: "/accueil/admin" });
});

router.get("/admin/register", (req, res) => {
  res.render("adminInscription", {
    titre: "Inscription Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/inscription.js"]
  });
});

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

router.get("/admin/register/code", (req, res) => {
  if (!req.session.pendingInscriptionEmail) return res.redirect("/admin/login");
  res.render("adminSecret", {
    titre: "Code d'inscription admin",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminCode.js"]
  });
});

router.post("/admin/inscription/verify", async (req, res) => {
  const { code } = req.body;
  const email = req.session.pendingInscriptionEmail;
  const entry = await getLatestCodeByEmail(email);
  if (!entry || entry.expiresAt < new Date()) return res.status(410).json({ error: "Code expiré." });
  if (!(await bcrypt.compare(code.toString(), entry.code))) return res.status(401).json({ error: "Code invalide." });

  const infos = req.session.pendingAdminInfos;
  delete req.session.pendingInscriptionEmail;
  delete req.session.pendingAdminInfos;

  await addUser({ ...infos, email, isAdmin: true });
  return res.json({ redirect: "/admin/login" });
});

router.get("/accueil/admin", requireAuth, (req, res) => {
  res.render("dashboardAdmin", {
    titre: "Page d'accueil administrateur",
    styles: ["/css/style.css", "/css/styleDashboard.css"],
    scripts: ["/js/main.js"],
    user: req.session.user
  });
});


// ─── GESTION DES SALLES ET RÉSERVATIONS ──────────────────────────────────
router.get("/salles", requireAuth, async (req, res, next) => {
  const salles = await listSalles();
  res.render("salles/list", {
    titres: "Liste des salles",
    styles: ["/css/style.css", "/css/sallesList.css"],
    scripts: ["/js/salles.js"],
    salles
  });
});

router.get("/salles/new", requireAuth, async (req, res, next) => {
  const equipements = await listEquipements();
  res.render("salles/newSalle", {
    titre: "Nouvelle salle",
    styles: ["/css/style.css", "/css/styleCreationSalle.css"],
    scripts: ["model/gestion_salle.js"],
    equipements
  });
});

router.post("/salles", requireAuth, async (req, res, next) => {
  const { nom, capacite, emplacement, equipementId } = req.body;
  const existing = await findSalleByNom(nom);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Le nom de salle existe déjà." });
  }

  await createSalle({
    nom,
    capacite: parseInt(capacite),
    emplacement,
    equipementId: parseInt(equipementId)
  });
  try {
    await logAdminAction(req.session.user.id, "Création salle", nom);
    res.redirect("/salles");
  } catch (err) {
    console.error("Erreur lors du logging ou de la redirection :", err);
    res.status(500).json({ error: "Erreur lors de la redirection après création." });
  }

});

router.get("/salles/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const salle = await findSalleById(id); // contient salle.equipements[]
    const equipements = await listEquipements();

    // Marquer l’équipement déjà associé
    const equipementAssocie = salle.equipements[0]?.id; // premier équipement

    const equipementsAvecSelected = equipements.map(e => ({
      ...e,
      selected: e.id === equipementAssocie
    }));

    res.render("salles/edit", {
      titre: "Modifier la salle",
      styles: ["/css/style.css", "/css/styleEdit.css"],
      scripts: ["model/gestion_salle.js"],
      salle,
      equipements: equipementsAvecSelected
    });
  } catch (err) {
    next(err);
  }
});

router.put("/salles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { nom, capacite, emplacement, equipementId } = req.body;

  try {
    const sallesAvecCeNom = await findSalleByNom(nom);
    const autreSalle = sallesAvecCeNom.find(salle => salle.id !== id);
    if (autreSalle) {
      return res.status(409).json({ error: "Le nom de salle existe déjà." });
    }

    await updateSalle(id, {
      nom,
      capacite: parseInt(capacite),
      emplacement,
      equipementId
    });

    await logAdminAction(req.session.user.id, "Mise à jour d'une salle", `Salle ID: ${id}`);
    return res.json({ success: true });

  } catch (err) {
    console.error("Erreur serveur PUT /salles/:id :", err);
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});


// ─── RÉSERVATIONS UTILISATEUR ──────────────────────────────────────────
router.get("/reservations", async (req, res, next) => {
  if (!req.session.user) return res.redirect("/user/login");
  const now = new Date();
  const month = Number(req.query.month) ?? now.getMonth();
  const year = Number(req.query.year) ?? now.getFullYear();
  const allResa = await listReservations(req.session.user.id);
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
});


router.post("/api/reservations", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });
  const { salleId, date, heure } = req.body;
  if (!salleId || !date || !heure) return res.status(400).json({ error: "Données manquantes." });
  const reservation = await createReservation({
    utilisateurId: req.session.user.id,
    salleId: parseInt(salleId),
    dateDebut: date + "T" + heure,
    dateFin: date + "T" + heure
  });
  res.json({ reservation, message: "Réservation réussie" });
});


router.delete("/reservations/:id", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié." });
  await cancelReservation(parseInt(req.params.id), req.session.user.id);
  res.json({ success: true });
});

router.get("/historique", async (req, res) => {
  if (!req.session.user) return res.redirect("/user/login");
  const historique = await getHistoriqueReservations(req.session.user.id);
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
});

// ─── GESTION DES SALLES ET ÉQUIPEMENTS ADMIN ─────────────────────────────
router.get("/api/salles", async (req, res) => {
  const salles = await getSalles();
  res.json(salles);
});

///Gestion user Admin
router.get("/admin/utilisateurs", requireAuth, async (req, res) => {
  const users = await listUsers();
  res.render("utilisateurs/listUtilisateurs", {
    titre: "Gestion des utilisateurs",
    styles: ["/css/style.css", "/css/styleListUtilisateurs.css"],
    users
  });
});

router.get("/admin/utilisateurs/:id/edit", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await getUserById(id);
  if (!user) return res.status(404).send("Utilisateur non trouvé");

  await logAdminAction(req.session.user.id, "Accès à l'édition d'un utilisateur", `Utilisateur ID: ${id}`);
  res.render("utilisateurs/editUtilisateurs", {
    titre: "Modifier l'utilisateur",
    styles: ["/css/style.css", "/css/styleEdit.css"],
    scripts: ["/js/utilisateurs.js"],
    user
  });
});


///Gestion equipements 
router.get("/list/equipement", async (req, res) => {
  const equipements = await listEquipements();
  res.render("listEquipement", {
    titres: "Liste des Equipements",
    styles: ["/css/style.css", "/css/equipement.css"],
    scripts: ["/js/equipement"],
    equipements,
  });
});

router.get("/new/equipement", (req, res) => {
  res.render("newEquipement", {
    titre: "Ajouter un équipement",
    styles: ["/css/style.css", "/css/equipement.css"],
    scripts: ["/js/equipement.js"],
  });
});

router.post("/new/equipement", async (req, res) => {
  await createEquipement({ nom: req.body.nom });
  res.redirect("/list/equipement");
});

router.get('/equipement/modifier/:id', async (req, res) => {
  const equipement = await listEquipements().then(list => list.find(e => e.id === parseInt(req.params.id)));
  if (!equipement) return res.status(404).send("Équipement non trouvé");

  res.render("editEquipement", {
    titre: "Modifier un équipement",
    styles: ["/css/style.css", "/css/equipement.css"],
    scripts: ["/js/equipement.js"],
    equipement
  });
});

router.post('/equipement/modifier/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const nom = req.body.nom?.trim();
  if (!nom) return res.status(400).send("Le nom de l'équipement est requis.");
  await updateEquipement(id, { nom });
  res.redirect("/list/equipement");
});

router.post('/equipement/:id/delete', async (req, res) => {
  await deleteEquipement(parseInt(req.params.id));
  res.redirect('/list/equipement');
});


///Historique de reservation ADmin
router.get("/admin/historique", requireAuth, async (req, res) => {
  const historique = await getAllReservations();
  const formatted = historique.map(resa => ({
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
});

router.get("/admin/historiqueAdmin", requireAuth, async (req, res) => {
  const historique = await getHistoriqueByAdminId(req.session.user.id);
  res.render("historiqueAdmin", {
    titre: "Historique de mes actions",
    styles: ["/css/style.css", "/css/historiqueAdmin.css"],
    historique,
    user: req.session.user
  });
});

import { sendContactMessage } from "./model/email.js"; // en haut si ce n'est pas déjà importé

// POST /contact — Traitement du formulaire de contact
router.post("/contact", async (req, res) => {
  const { sujet, message, email, nom = "Utilisateur inconnu" } = req.body;

  if (!sujet || !message || !email) {
    return res.status(400).json({ success: false, error: "Champs manquants" });
  }

  try {
    await envoyerMessageContact(nom, email, sujet, message);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erreur envoi email" });
  }
});


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


export default router;
