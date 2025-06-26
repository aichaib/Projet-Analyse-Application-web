import { Router } from "express";
import passport from "passport";
import bcrypt from "bcrypt";

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
  findSalleById, findSalleByNom
} from "./model/gestion_salle.js";

import {
  getSalles, listReservations, createReservation, cancelReservation,
  getHistoriqueReservations, getReservationsByUserId,
  getSallesDispoParCritere, getCapacitesDisponibles,
  getAllReservations
} from "./model/utilisation_salle.js";

import {
  listEquipements, createEquipement, updateEquipement, deleteEquipement
} from "./model/equipement.js";

import {
  getHistoriqueByAdminId, logAdminAction
} from "./model/historiqueAdmin.js";

import { buildCalendar, monthNames } from "./model/calendareController.js";

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
    styles: ['/css/forms.css', '/css/contact.css', '/css/styles.css'],
    scripts: ['/js/contact.js']
  });
});

router.post("/contact", async (req, res) => {
  const { sujet, message } = req.body;
  try {
    await sendVerificationCode(req.user?.email || req.body.email, sujet, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur lors de l’envoi du message' });
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
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});

// ─── ADMIN : AUTH, INSCRIPTION, 2FA ─────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session?.user?.adminAuth) return next();
  return res.redirect("/admin/login");
}

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
    scripts: ["/js/crudSalles.js"],
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
      scripts: ["/js/crudSalles.js"],
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



router.delete("/salles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await deleteSalle(id);
  await logAdminAction(req.session.user.id, "Suppression d'une salle", `Salle ID: ${id}`);
  res.json({ success: true });
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

router.get("/reservations/new", async (req, res, next) => {
  if (!req.session.user) return res.redirect("/user/login");
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

router.post("/api/salles/recherche", async (req, res) => {
  const { capacite, equipement, date, heure } = req.body;
  const dateHeure = date && heure ? `${date}T${heure}` : null;
  const salles = await getSallesDispoParCritere({ capacite: parseInt(capacite), equipement, dateHeure });
  res.json(salles);
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
export default router;