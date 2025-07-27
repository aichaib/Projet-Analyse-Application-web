//Doit etre en debut de fichier pour charger les variables d'environnement
import "dotenv/config";

import https from "node:https";
import { readFile } from "node:fs/promises";

//importer les routes
import routerExterne from "./routes.js";

// Importation des fichiers et librairies
import { engine } from "express-handlebars";
import express, { json } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import methodOverride from "method-override";
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

// Configuration des helpers Handlebars
const hbs = engine({
  helpers: {
    formatTime: function(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },
    formatDate: function(dateString) {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    },
    eq: function(a, b) {
      return a === b;
    }
  }
});

app.engine("handlebars", engine()); //Pour indiquer a express que l'on utilise handlebars
app.set("view engine", "handlebars"); //Pour indiquer le rendu des vues
app.set("views", "./views"); //Pour indiquer le dossier des vues

// Ajout de middlewares
app.use(helmet(cspOption));
app.use(compression());
app.use(cors());
app.use(json());
app.use(methodOverride('_method'));

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
        name: process.env.npm_package_name,
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

//Demarrer le serveur
//Usage du HTTPS
if (process.env.NODE_ENV === "development") {
    let credentials = {
        //c'est la clé
        key: await readFile("./security/localhost.key"),
        // c'est le certificat
        cert: await readFile("./security/localhost.cert"),
    };
 
    https.createServer(credentials, app).listen(process.env.PORT, "0.0.0.0");
    console.info("Serveur démarré avec succès: ");
    console.log("https://localhost:" + process.env.PORT);
  
} else {
    app.listen(process.env.PORT, "0.0.0.0");
    console.info("Serveur démarré avec succès: ");
    console.info("http://localhost:" + process.env.PORT);
  
}
