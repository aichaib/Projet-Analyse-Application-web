import { Router, Router } from "express";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  findUserByEmail
} from "../model/user.js"; // Assure-toi que ces fonctions sont bien exportées
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /users - Liste des utilisateurs
 */
router.get("/", async (req, res) => {
  const users = await listUsers();
  res.render("users/list", { users });
});

/**
 * GET /users/new - Formulaire de création
 */
router.get("/new", (req, res) => {
  res.render("users/new");
});

/**
 * POST /users - Création d'un utilisateur
 */
router.post("/", async (req, res) => {
  const { prenom, nom, email, motDePasseHash } = req.body;
  await createUser({ prenom, nom, email, motDePasseHash });
  res.redirect("/users");
});

/**
 * GET /users/:id/edit - Formulaire de modification
 */
router.get("/:id/edit", async (req, res) => {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: Number(req.params.id) }
  });

  if (!utilisateur) return res.status(404).send("Utilisateur non trouvé");

  res.render("users/edit", { utilisateur });
});

/**
 * PUT /users/:id - Mise à jour d’un utilisateur
 */
router.put("/:id", async (req, res) => {
  const { prenom, nom, email } = req.body;
  await updateUser(Number(req.params.id), { prenom, nom, email });
  res.json({ success: true });
});

/**
 * DELETE /users/:id - Suppression d’un utilisateur
 */
router.delete("/:id", async (req, res) => {
  await deleteUser(Number(req.params.id));
  res.json({ success: true });
});

export default router;
