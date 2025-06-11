import { Router } from "express";
import { listEquipements, createEquipement, updateEquipement, deleteEquipement } from "../model/equipement.js";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Middleware d'authentification
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
  return null;
}
router.use(isAuthenticated);


// Get liste de tous les equipements
router.get("/", async (req, res) => {
  try {
    const equipements = await listEquipements();
    res.render("equipements/list", { equipements });
  } catch (error) {
    console.error("Error fetching equipements:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get formulaire de création d'un nouvel equipement
router.get("/new", (req, res) => {
  res.render("equipements/new");
});

// Post création d'un nouvel equipement
router.post("/", async (req, res) => {
  const { nom } = req.body;
  try {
    await createEquipement({ nom });
    res.redirect("/equipements");
  } catch (error) {
    console.error("Error creating equipement:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get formulaire d'édition d'un equipement
router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id },
    });
    if (!equipement) {
      return res.status(404).send("Equipement not found");
    }
    res.render("equipements/edit", { equipement });
  } catch (error) {
    console.error("Error fetching equipement for edit:", error);
    res.status(500).send("Internal Server Error");
  }
  return null;
});

// Put mise à jour d'un equipement
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nom } = req.body;
  try {
    await updateEquipement(id, { nom });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating equipement:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Delete suppression d'un equipement
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await deleteEquipement(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipement:", error);
    res.status(500).send("Internal Server Error");
  }
});
export default router;