import { Router } from "express";
import sallesRouter from "./sallesRouter.js";
router.use("/salles", sallesRouter);

const router = Router();
import passport from "passport";

//Definition des routes
/*  ............. */
router.get("/", (req, res) => {
    res.render("index",{
        titre: "Accueil",
        scripts :["./js/main.js"],
        styles : ["./css/style.css"]
    });
  
});


export default router;
