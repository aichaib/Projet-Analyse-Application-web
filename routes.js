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
  getSallesDispoParCritere, getCapacitesDisponibles, updateReservation
} from "./model/utilisation_salle.js";

import {
  getHistoriqueByAdminId, logAdminAction
} from "./model/historiqueAdmin.js";

import { buildCalendar, monthNames } from "./model/calendareController.js";

import { envoyerMessageContact } from "./model/email.js";

import {
  listEquipements, createEquipement,
  updateEquipement, deleteEquipement,
} from "./model/equipement.js";

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

router.post("/contact", async (req, res) => {
  const { nom, email, sujet, message } = req.body;

  if (!nom || !email || !sujet || !message) {
    return res.status(400).json({ success: false, error: "Tous les champs sont requis." });
  }

  try {
    await envoyerMessageContact(nom, email, sujet, message);
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur envoi formulaire de contact :", err);
    res.status(500).json({ success: false, error: "Erreur lors de l’envoi du message" });
  }
});


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

// ─── ADMIN : AUTH ───────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.adminAuth) {
    return next();
  } else {
    return res.redirect("/admin/login");
  }
}

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



router.get("/admin/login", (req, res) => {
  res.render("adminlogin", {
    titre: "Connexion Administrateur",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/adminLogin.js"]
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

router.get("/accueil/admin", requireAuth, (req, res) => {
  if (!req.session.user || !req.session.user.adminAuth) {
    return res.redirect("/admin/login");
  }
  if (req.accepts("json")) {
    const u= req.session.user ;
    return res.json({
    id: u.id,
    email: u.email,
    prenom: u.prenom,
    nom: u.nom,
    isAdmin: true,
    adminAuth: true
    });
  }
  res.render("dashboardAdmin", {
    titre: "Page d'accueil administrateur",
    styles: ["/css/style.css", "/css/styleDashboard.css"],
    scripts: ["/js/main.js"],
    user: req.session.user
  });
});


// ─── CREATE new salle ─────────────────────────────
router.post("/salles", requireAuth, async (req, res, next) => {
  console.log(" POST /salles appelé");
  console.log("Session utilisateur :", req.session.user); // Vérifie si l'admin est toujours connecté
  console.log("Corps reçu (req.body) :", req.body);       // Vérifie ce que fetch envoie

  try {
    const { nom, capacite, emplacement, equipementId } = req.body;
    console.log("Données extraites :", { nom, capacite, emplacement, equipementId });

    const existing = await findSalleByNom(nom);
    if (existing.length > 0) {
      console.warn("Salle déjà existante :", existing);
      return res.status(409).json({ error: "Le nom de salle existe déjà." });
    }


    const newSalle = await createSalle({
      nom,
      capacite,
      emplacement,
      equipementId
    });

    console.log(" Salle créée :", newSalle);

    await logAdminAction(req.session.user.id, "Création salle", nom);

    return res.json({ success: true, redirect: "/salles" });

  } catch (err) {
    console.error(" ERREUR POST /salles:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Le nom de salle est déjà utilisé." });
    }
    return res.status(500).json({ error: "Erreur serveur" });
  }
});




router.get("/salles/new", requireAuth, async (req, res, next) => {
  try {
    const equipements = await listEquipements();
    res.render("salles/newSalle", {
      titre: "Nouvelle salle",
      styles: ["/css/style.css", "/css/styleCreationSalle.css"],
      scripts: ["/js/salles.js"],
      equipements
    });
  } catch (err) {
    next(err);
  }
});

// ─── LIST salles ─────────────────────────────
router.get("/salles", requireAuth, async (req, res, next) => {
  try {
    const salles = await listSalles();
    res.render("salles/list", {
      titre: "Liste des salles",
      styles: ["/css/style.css", "/css/styleSalles.css"],
      scripts: ["/js/salles.js"],
      salles
    });
  } catch (err) {
    console.error("Erreur list salles :", err);
    next(err);
  }
});

// ─── RENDER edit form ─────────────────────────────
router.get("/salles/:id/edit", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const salle = await findSalleById(id); // includes salle.equipements[]
    const equipements = await listEquipements();

    // mark selected equipements in the list
    const equipementIdsAssocies = salle.equipements.map(e => e.id);

    const equipementsAvecSelected = equipements.map(e => ({
      ...e,
      selected: equipementIdsAssocies.includes(e.id)
    }));

    res.render("salles/edit", {
      titre: "Modifier la salle",
      styles: ["/css/style.css", "/css/styleEdit.css"],
      scripts: ["/js/salles.js"],
      salle,
      equipements: equipementsAvecSelected
    });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE salle ─────────────────────────────
// routes.js

router.put("/salles/:id", requireAuth, async (req, res) => {
  console.log(" PUT /salles/:id", req.params.id, "avec", req.body);

  try {
    const id = parseInt(req.params.id, 10);
    const { nom, capacite, emplacement, equipementId } = req.body;

    // 1) Si on modifie le nom, vérifier qu'il n'existe pas sur une autre salle
    if (typeof nom !== "undefined") {
      const doublons = await findSalleByNom(nom);
      const autre = doublons.find(s => s.id !== id);
      if (autre) {
        console.warn("Nom en conflit :", nom, autre);
        return res.status(409).json({ error: "Le nom de salle existe déjà." });
      }
    }

    // 2) Appel métier
    const salleMiseAJour = await updateSalle(id, {
      nom,
      capacite,
      emplacement,
      equipementId
    });
    console.log("Salle après MAJ :", salleMiseAJour);

    // 3) Historique & réponse
    await logAdminAction(req.session.user.id, "Mise à jour salle", `ID ${id}`);
    return res.json({ success: true, redirect: "/salles", salle: salleMiseAJour });

  } catch (err) {
    console.error(" Erreur PUT /salles/:id :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


// ─── DELETE salle ─────────────────────────────
// Assuming your form or frontend calls DELETE /salles/:id
router.delete("/salles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: "ID invalide" });
  }

  try {
    // vérifier que la salle existe
    const existing = await prisma.salle.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Salle non trouvée" });
    }

    // suppression via la fonction métier
    await deleteSalle(id);

    await logAdminAction(req.session.user.id, "Suppression salle", `ID ${id}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression salle API :", err);
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// ─── RÉSERVATIONS ───────────────────────────────────────────────────────
router.post("/api/reservations", async (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });

  try {
    const { salleId, date, heure } = req.body;
    if (!salleId || !date || !heure) {
      return res.status(400).json({ error: "Données manquantes." });
    }

    // Calculer la plage horaire demandée (par défaut 3h)
    const dateDebut = new Date(`${date}T${heure}:00`);
    const dateFin = new Date(dateDebut.getTime() + 3 * 60 * 60 * 1000); // +3h
    const [year, month, day] = date.split("-"); // ex: "2025-07-18"
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));


    // Vérifier les conflits (chevauchement)
    const conflits = await prisma.utilisationSalle.findMany({
      where: {
        salleId: parseInt(salleId, 10),
        dateUtilisation: localDate,

        // Chevauchement horaire
        OR: [
          {
            heureUtilisation: {
              lte: dateDebut
            },
            // début <= heure de début demandée < fin existante
            heureUtilisation: {
              lt: dateFin,
              gt: dateDebut
            }
          },
          {
            heureUtilisation: {
              lt: dateFin
            },
            // début existant < fin demandée <= fin existante
            heureUtilisation: {
              lte: dateFin,
              gte: dateDebut
            }
          }
        ]
      }
    });

    if (conflits.length > 0) {
      return res.status(409).json({ error: "La salle est déjà réservée à cette heure." });
    }

    // Pas de conflit : créer la réservation
    const reservation = await createReservation({
      utilisateurId: req.session.user.id,
      salleId: parseInt(salleId, 10),
      dateUtilisation: localDate,
      heureUtilisation: `${date}T${heure}:00`
    });

    res.json({ reservation, message: "Réservation réussie" });
  } catch (err) {
    console.error("Erreur création réservation:", err);
    next(err);
  }
});




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
  } catch (err) {
    next(err);
  }
});

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

// ──────────────── MODIFIER UNE RÉSERVATION ────────────────
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

router.put("/reservations/:id", async (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  try {
    const reservationId = parseInt(req.params.id, 10);
    const { salleId, dateUtilisation, heureUtilisation } = req.body;

    if (!salleId || !dateUtilisation || !heureUtilisation) {
      return res.status(400).json({ error: "Données manquantes." });
    }

    // 🟢 Reconstruire la date/heure proprement
    const [year, month, day] = dateUtilisation.split("-");
    const [hour, minute] = heureUtilisation.split(":");

    const fullDateTime = new Date(
      Number(year),
      Number(month) - 1, // JS: mois 0-indexé
      Number(day),
      Number(hour),
      Number(minute),
      0, 0
    );
    if (isNaN(fullDateTime.getTime())) {
      return res.status(400).json({ error: "Date ou heure invalide." });
    }
    const dateUtilisationLocal = new Date(
      Number(year),
      Number(month) - 1, // mois JS = 0-indexé
      Number(day),
      0, 0, 0, 0
    );

    // ✅ Appeler la fonction métier
    const result = await updateReservation(
      reservationId,
      req.session.user.id,
      parseInt(salleId, 10),
      dateUtilisationLocal, // juste le jour
      fullDateTime // heure exacte
    );

    if (result.conflict) {
      return res.status(409).json({ error: "La salle est déjà réservée à cette heure." });
    }

    res.json({ success: true, reservation: result.reservation });
  } catch (err) {
    console.error("Erreur modification réservation :", err);
    next(err);
  }
});

// ──────────────── HISTORIQUE DES RÉSERVATIONS ────────────────
router.get("/historique", async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/user/login");
  }

  try {
    const reservations = await getHistoriqueReservations(req.session.user.id);

    res.render("historique", {
      titre: "Historique des réservations",
      styles: ["/css/style.css", "/css/historique.css"],
      reservations,
      user: req.session.user
    });
  } catch (err) {
    console.error("Erreur historique :", err);
    next(err);
  }
});

// ─── API ROUTES ─────────────────────────────────────────────────────────
router.get("/api/salles", async (req, res, next) => {
  try {
    const salles = await getSalles();
    res.json(salles);
  } catch (err) {
    next(err);
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
// ─── GESTION UTILISATEURS (ADMIN) ───────────────────────────────────────
router.get("/admin/utilisateurs", requireAuth, async (req, res, next) => {
  try {
    const users = await listUsers();
    if (req.accepts("json")) {
      return res.json(users);
      
    }
    res.render("utilisateurs/listUtilisateurs", {
      titre: "Gestion des utilisateurs",
      styles: ["/css/style.css", "/css/styleListUtilisateurs.css"],
      scripts: ["/js/gestionUser.js"],
      users
    });
  } catch (err) {
    next(err);
  }
});

// Render edit user form
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
      scripts: ["/js/gestionUser.js"],
      user
    });
  } catch (err) {
    next(err);
  }
});

// Handle user update
router.post("/admin/utilisateurs/modifier/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { prenom, nom, email, isAdmin } = req.body;
  try {
    await updateUser(id, { prenom, nom, email, isAdmin: isAdmin === true });
    // Si on reçoit du JSON, renvoyer JSON
    if (req.is("application/json")) {
      return res.json({ success: true, message: "Utilisateur mis à jour." });
    }
    // Sinon, rediriger classiquement
    res.redirect("/admin/utilisateurs");
  } catch (err) {
    console.error(err);
    if (req.is("application/json")) {
      return res.status(500).json({ success: false, error: "Erreur serveur" });
    }
    res.status(500).send("Erreur serveur");
  }
});

router.delete("/admin/utilisateurs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: "ID invalide" });
  }

  try {
    await deleteUser(id);
    await logAdminAction(
      req.session.user.id,
      "Suppression utilisateur",
      `ID: ${id}`
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression utilisateur :", err);
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});


// ─── GESTION ÉQUIPEMENTS ────────────────────────────────────────────────
router.get("/list/equipement", async (req, res) => {
  try {
    const equipements = await listEquipements();
    res.render("listEquipement", {
      titres: "Liste des Equipements",
      styles: ["/css/style.css", "/css/equipement.css"],
      scripts: ["/js/equipement.js"],
      equipements,
    });
  } catch (error) {
    console.error("Error fetching equipements:", error);
    res.status(500).send("Internal Server Error");
  }
});

// API: liste plate des équipements

router.get("/api/equipements", async (req, res) => {

  try {

    const equipements = await prisma.equipement.findMany({

      orderBy: { nom: "asc" }

    });

    res.json(equipements);

  } catch (err) {

    console.error("Erreur /api/equipements:", err);

    res.status(500).json({ error: "Erreur serveur" });

  }

});
 

router.get("/new/equipement", (req, res) => {
  res.render("newEquipement", {
    titre: "Ajouter un équipement",
    styles: ["/css/style.css", "/css/equipement.css"],
    scripts: ["/js/equipement.js"],
  });
});

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

router.get('/equipement/modifier/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const equipements = await listEquipements();
    const equipement = equipements.find(e => e.id === id);
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

router.post('/equipement/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await deleteEquipement(id);
    res.redirect('/list/equipement');
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

router.post("/equipement/modifier/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nom } = req.body;

  try {
    await updateEquipement(id, { nom });
    res.redirect("/list/equipement");
  } catch (error) {
    console.error("Erreur mise à jour équipement:", error);
    res.status(500).send("Erreur serveur");
  }
});

// ─── HISTORIQUES ────────────────────────────────────────────────────────
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
      styles: ["/css/style.css", "/css/historique.css"],
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
    scripts: ["/js/userSettings.js"],
    returnUrl: "/accueil/user"
  });
});

router.get("/admin/parametres", requireAuth, (req, res) => {
  res.render("userSettings", {
    user: req.session.user,   // ← ça contient id, prenom, nom, email, adminAuth
    titre: "Paramètres Admin",
    styles: ["/css/style.css", "/css/form.css"],
    scripts: ["/js/userSettings.js"],
    returnUrl: "/accueil/admin"
  });
});

router.post("/admin/parametres", requireAuth, async (req, res) => {
  const { prenom, nom, email } = req.body;
  try {
    await updateUser(req.session.user.id, { prenom, nom, email });
    // on met à jour la session pour que la vue reflète le nouveau nom / email
    Object.assign(req.session.user, { prenom, nom, email });
    res.json({ success: true, message: "Paramètres admin mis à jour !" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
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

// ADD THESE NEW JSON ENDPOINTS FOR iOS APP
router.get("/admin/historique/json", requireAuth, async (req, res, next) => {
  try {
    const historique = await getHistoriqueByAdminId(req.session.user.id);
    
    // Format the data for iOS app
    const formattedHistorique = historique.map(item => ({
      id: item.id,
      action: item.action,
      details: item.details,
      timestamp: item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ')
    }));
    
    res.json(formattedHistorique);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });
  const u = req.session.user;
  // Harmoniser le payload avec ton modèle iOS User
  res.json({
    id: u.id,
    prenom: u.prenom || "",
    nom: u.nom || "",
    email: u.email || "",
    isAdmin: !!(u.adminAuth || u.isAdmin)
  });
});

router.get("/admin/historiqueAdmin/json", requireAuth, async (req, res, next) => {
  try {
    const historique = await getHistoriqueByAdminId(req.session.user.id);
    
    // Format the data for iOS app
    const formattedHistorique = historique.map(item => ({
      id: item.id,
      action: item.action,
      details: item.details,
      timestamp: item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ')
    }));
    
    res.json(formattedHistorique);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/reservations/all", async (req, res) => {
  try {
    const rows = await prisma.utilisationSalle.findMany({
      include: { salle: true },
      orderBy: [{ dateUtilisation: "asc" }, { heureUtilisation: "asc" }],
    });

    const data = rows.map(r => ({
      id: r.id,
      salleId: r.salleId,
      // "yyyy-MM-dd"
      dateUtilisation: new Date(r.dateUtilisation).toISOString().slice(0, 10),
      // "HH:mm" (si stocké en DateTime)
      heureUtilisation: new Date(r.heureUtilisation).toISOString().slice(11, 16),
    }));

    res.json(data);
  } catch (err) {
    console.error("Erreur /api/reservations/all:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/api/reservations/mine", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Non authentifié" });

  try {
    const rows = await prisma.utilisationSalle.findMany({
      where: { utilisateurId: req.session.user.id },
      include: { salle: true },
      orderBy: [{ dateUtilisation: "asc" }, { heureUtilisation: "asc" }],
    });

    const data = rows.map(r => ({
      id: r.id,
      salleId: r.salleId,
      dateUtilisation: new Date(r.dateUtilisation).toISOString().slice(0, 10),
      heureUtilisation: new Date(r.heureUtilisation).toISOString().slice(11, 16),
    }));

    res.json(data);
  } catch (err) {
    console.error("Erreur /api/reservations/mine:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;