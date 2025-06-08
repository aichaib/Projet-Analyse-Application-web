import { Router } from "express";
import { listSalles, createSalle, updateSalle, deleteSalle } from "../model/gestion_salle.js";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Middleware d'authentification
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

router.use(isAuthenticated);

// GET /salles — liste toutes les salles
router.get("/", async (req, res) => {
  const salles = await listSalles();
  res.render("salles/list", { salles });
});

// GET /salles/new — affiche le formulaire de création
router.get("/new", (req, res) => {
  res.render("salles/new");
});

// POST /salles — crée une nouvelle salle
router.post("/", async (req, res) => {
  const { nom, capacite, emplacement } = req.body;
  await createSalle({ nom, capacite: parseInt(capacite), emplacement });
  res.redirect("/salles");
});

// GET /salles/:id/edit — affiche le formulaire d'édition
router.get("/:id/edit", async (req, res) => {
  const salle = await prisma.salle.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  res.render("salles/edit", { salle });
});

// PUT /salles/:id — met à jour une salle
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nom, capacite, emplacement } = req.body;
  await updateSalle(id, { nom, capacite: parseInt(capacite), emplacement });
  res.json({ success: true });
});

// DELETE /salles/:id — supprime une salle
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await deleteSalle(id);
  res.json({ success: true });
});

export default router;
