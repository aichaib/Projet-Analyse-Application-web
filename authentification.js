import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import { getUserByEmail } from "./model/user.js";

// Configuration générale de la stratégie.
// On indique ici qu'on s'attends à ce que le client
// envoit une variable "email" et "motDePasse" au
// serveur pour l'authentification.
const config = {
    usernameField: "email",
    passwordField: "password",
};

// Configuration de quoi faire avec l'identifiant
// et le mot de passe pour les valider
passport.use(
    new Strategy(config, async (email, password, done) => {
        // S'il y a une erreur avec la base de données,
        // on retourne l'erreur au serveur
        try {
            // On va chercher l'utilisateur dans la base
            // de données avec son email
            const user = await getUserByEmail(email);

            // Si on ne trouve pas le user, on
            // retourne que l'authentification a échoué
            // avec un message
            if (!user) {
                return done(null, false, { erreur: "mauvais_utilisateur" });
            }

            // Si on a trouvé le user, on compare
            // son mot de passe dans la base de données
            // avec celui envoyé au serveur. On utilise
            // une fonction de bcrypt pour le faire
            const valide = await bcrypt.compare(password, user.password);

            // Si les mot de passe ne concorde pas, on
            // retourne que l'authentification a échoué
            // avec un message
            if (!valide) {
                return done(null, false, { erreur: "mauvais_mot_de_passe" });
            }

            // Si les mot de passe concorde, on retourne
            // l'information de l'user au serveur
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    })
);

// Configuration de la sérialisation, cela permet de
// mettre l'information de l'utilisateur dans la session
passport.serializeUser((user, done) => {
    // On met uniquement le courriel dans la session
    done(null, user.email);
});

// Configuration de la désérialisation, cela permet de
// récupérer l'information de l'utilisateur à partir de la session
passport.deserializeUser(async (email, done) => {
    // S'il y a une erreur de base de donnée, on
    // retourne l'erreur au serveur
    try {
        // Puisqu'on a juste l'adresse courriel dans
        // la session, on doit être capable d'aller
        // chercher l'utilisateur avec celle-ci dans
        // la base de données.
        const user = await getUserByEmail(email);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
