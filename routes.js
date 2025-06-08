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
import { isEmailValid, isPasswordValid } from "./validation.js";
import { sendVerificationCode, sendInscriptionVerificationCode } from "./model/email.js";

const router = Router();

// — accueil —
router.get("/", (req, res) => {
  res.render("index", {
    titre:   "Accueil",
    styles:  ["/css/style.css"],
    scripts: ["/js/main.js"],
    user:    req.user
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
    return res.status(400).json({ error: "Email ou mot de passe invalide" });
  }
  passport.authenticate("local", async (err, user, info) => {
    if (err)   return next(err);
    if (!user) return res.status(401).json(info);

    // --- admin 2FA ---
    if (user.email === process.env.EMAIL_USER) {
      const code     = Math.floor(100000 + Math.random() * 900000).toString();
      const expires  = new Date(Date.now() + 15 * 60 * 1000);
      await createCodeForUser(user.id, code, expires);
      await sendVerificationCode(user.email, code);
      return req.logIn(user, e => {
        if (e) return next(e);
        return res.redirect("/admin/code");
      });
    }

    // --- utilisateur simple ---
    await updateLastLogin(user.id);
    return req.logIn(user, e => {
      if (e) return next(e);
      return res.redirect("/dashboard");
    });
  })(req, res, next);
});

// — traite l’inscription utilisateur pure —
router.post("/inscription", async (req, res) => {
  const { prenom, nom, email, motDePasse } = req.body;
  if (!prenom||!nom||!isEmailValid(email)||!isPasswordValid(motDePasse)) {
    return res.status(400).json({ error: "Données invalides" });
  }
  try {
    const user = await addUser({ prenom, nom, email, motDePasse });
    return res.status(201).json({ message: "Inscription réussie" });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "E-mail déjà utilisé" });
    return res.status(500).json({ error: e.message });
  }
});

// — traite la demande d’inscription admin (envoi code au super-admin) —
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

// — validation du code 2FA admin —
router.post("/api/verify-code", async (req, res) => {
  const { code } = req.body;
  const user = req.user;
  if (!code) return res.status(400).json({ message: "Code manquant." });

  const entry = await getLatestCodeForUser(user.id);
  if (!entry)                    return res.status(404).json({ message: "Aucune demande trouvée." });
  if (entry.expiresAt < new Date()) return res.status(410).json({ message: "Code expiré." });
  const ok = await bcrypt.compare(code, entry.code);
  if (!ok)                       return res.status(401).json({ message: "Code invalide." });

  await deleteCode(entry.id);
  return res.json({ redirect: "/admin-secret" });
});

// — (optionnel) validation du code d’inscription utilisateur —  
router.post("/api/inscription/verify", async (req, res) => {
  const { code } = req.body;
  const entry = await getLatestCodeForEmail(req.session.email);
  if (!entry)                    return res.status(404).json({ message: "Code introuvable." });
  if (entry.expiresAt < new Date()) return res.status(410).json({ message: "Code expiré." });
  const ok = await bcrypt.compare(code, entry.code);
  if (!ok)                       return res.status(401).json({ message: "Code invalide." });

  // crée l’utilisateur réel ici…
  await deleteCode(entry.id);
  return res.json({ redirect: "/user/login" });
});

// — déconnexion —
router.post("/deconnexion", (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).end();
  req.logOut(err => {
    if (err) return next(err);
    res.redirect("/");
  });
});

export default router;
