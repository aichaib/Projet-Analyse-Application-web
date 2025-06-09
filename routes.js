import { Router } from "express";
import {listSalles, createSalle, updateSalle, deleteSalle, findSalleById } from "../model/gestion_salle.js";

const router = Router();
import passport from "passport";

//Definition des routes
/*  ............. */
router.get("/", (req, res) => {
  res.render("index", {
    titre: "Accueil",
    scripts: ["./js/main.js"],
    styles: ["./css/style.css"]
  });
});

// GET /salles — liste toutes les salles
router.get("/salles", async (req, res) => {
  const salles = await listSalles();
  res.render("salles/list", { salles });
});

// GET /salles/new — formulaire de creation
router.get("/salles/new", (req, res) => {
  res.render("salles/new");
});

// POST /salles — creer une nouvelle salle
router.post("/salles", async (req, res) => {
  const { nom, capacite, emplacement } = req.body;
  await createSalle({ nom, capacite: parseInt(capacite), emplacement });
  res.redirect("/salles");
});

// GET /salles/:id/edit — formulaire d'edition
router.get("/salles/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id);
  const salle = await findSalleById(id);
  res.render("salles/edit", { salle });
});

// PUT /salles/:id — mise a jour
router.put("/salles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nom, capacite, emplacement } = req.body;
  await updateSalle(id, { nom, capacite: parseInt(capacite), emplacement });
  res.json({ success: true });
});

// DELETE /salles/:id — suppression
router.delete("/salles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await deleteSalle(id);
  res.json({ success: true });
});

export default router;
