//Doit etre en debut de fichier pour charger les variables d'environnement
import "dotenv/config";

//importer les routes
import routerExterne from "./routes.js";

// Importation des fichiers et librairies
import { engine } from "express-handlebars";
import express, { json } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cspOption from "./csp-options.js";

// Importation de la session
import session from "express-session";
//importation de memorystore
import memorystore from "memorystore";
// Importation de passport
import passport from "passport";

import "./authentification.js";
import './model/cleanup.js';
// Crréation du serveur express
const app = express();

//initialisation de la memoire de session
const MemoryStore = memorystore(session);

app.engine("handlebars", engine()); //Pour indiquer a express que l'on utilise handlebars
app.set("view engine", "handlebars"); //Pour indiquer le rendu des vues
app.set("views", "./views"); //Pour indiquer le dossier des vues

// Ajout de middlewares
app.use(helmet(cspOption));
app.use(compression());
app.use(cors());
app.use(json());

// Middleware pour parser les données des formulairesapp.use(express.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



//Middeleware pour gerer les sessions
app.use(
    session({
        cookie: {
            maxAge: 3600000,
            sameSite: "lax", // pour que le cookie soit accepté même avec fetch()
            secure: false    // doit être true si HTTPS, false en local
        },
        name: "sessionId",
        store: new MemoryStore({ checkPeriod: 3600000 }),
        resave: false,
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
    })
);

//Middleware pour gerer passport
app.use(passport.initialize());
app.use(passport.session());

//Middeleware integre a express pour gerer la partie static du serveur
//le dossier 'public' est la partie statique de notre serveur
app.use(express.static("public"));

// Ajout des routes
app.use(routerExterne);

// Renvoyer une erreur 404 pour les routes non définies
app.use((request, response) => {
    // Renvoyer simplement une chaîne de caractère indiquant que la page n'existe pas
    response.status(404).send(`${request.originalUrl} Route introuvable.`);
});

//Démarrage du serveur
app.listen(process.env.PORT);
console.info("Serveur démarré :");
console.info(`http://localhost:${process.env.PORT}`);
