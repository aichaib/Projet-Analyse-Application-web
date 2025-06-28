import nodeMailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

    const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    transporter.verify()
  .then(() => console.log('Transporteur SMTP prêt à envoyer des e-mails'))
  .catch(err => console.error('Erreur configuration SMTP', err));
// Envoie de code de vérification 2FA
export async function sendVerificationCode(email, code) {

    console.log(`Envoi du code de vérification à l'adresse e-mail : ${email}`);

    const html = `
    <h1>Voici votre code de vérification</h1>
    <p>Votre code est : <strong>${code}</strong></p>
    `;

   try {
    const info = await transporter.sendMail({
      from: `"Campus Booking" <${process.env.EMAIL_USER}>`,
      to:   email,
      subject: 'Code de vérification',
      html,
    });
    console.log('Message 2FA envoyé, id =', info.messageId);
    return info;
  } catch (err) {
    console.error('Erreur envoi 2FA:', err);
    throw err;
  }
}

// Envoie de code pour inscription
export async function sendInscriptionVerificationCode(firstName, lastName, email, code) {
  console.log(`Envoi de la demande d'inscription de ${firstName} ${lastName}`);
  const html = `
    <h1>Code de vérification pour inscription</h1>
    <p>Ce code expire dans 3 minutes :</p>
    <p><strong>${code}</strong></p>
    <hr>
    <p><strong>Informations du requérant :</strong></p>
    <ul>
      <li>Prénom : ${firstName}</li>
      <li>Nom : ${lastName}</li>
      <li>Email : ${email}</li>
    </ul>
    <p>Si cette personne ne doit pas être inscrite, ne divulguez pas le code.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from:    `"La Cité Collégiale" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_USER,  // envoi à l'admin
      subject: 'Demande d’inscription – CampusBooking',
      html,
    });
    console.log('Demande inscription envoyée, id =', info.messageId);
    return info;
  } catch (err) {
    console.error('Erreur envoi demande inscription:', err);
    throw err;
  }
}

// Envoie d'un message via le formulaire "Contactez-nous"
export async function sendContactMessage(email, sujet, message) {
  const html = `
    <h2>Message de contact</h2>
    <p><strong>De :</strong> ${email}</p>
    <p><strong>Sujet :</strong> ${sujet}</p>
    <p><strong>Message :</strong></p>
    <p>${message.replace(/\n/g, "<br>")}</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Formulaire Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Le message sera envoyé à l'adresse de l'admin
      subject: `Nouveau message : ${sujet}`,
      html
    });
    console.log("Message de contact envoyé, ID =", info.messageId);
    return info;
  } catch (err) {
    console.error("Erreur envoi message contact :", err);
    throw err;
  }
}


// export async function envoyerMessageContact(sujet, message, emailUtilisateur) {
//   const mailOptions = {
//     from: '"Campus Booking" <campusbooking2025@gmail.com>',
//     to: "admin@tonsite.com", // ou un admin réel
//     subject: `Message de contact : ${sujet}`,
//     html: `
//       <h3>Message de Contact</h3>
//       <p><strong>De :</strong> ${emailUtilisateur}</p>
//       <p><strong>Sujet :</strong> ${sujet}</p>
//       <p><strong>Message :</strong></p>
//       <p>${message}</p>
//     `
//   };

//   return transporter.sendMail(mailOptions);
// }

export async function envoyerMessageContact(nom, email, sujet, message) {
  const html = `
    <h2>Message de contact reçu</h2>
    <p><strong>Nom :</strong> ${nom}</p>
    <p><strong>Adresse e-mail :</strong> ${email}</p>
    <p><strong>Sujet :</strong> ${sujet}</p>
    <p><strong>Message :</strong></p>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p>Ce message a été envoyé depuis le formulaire de contact du site.</p>
  `;

  const mailOptions = {
    from: `"Formulaire Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // L’administrateur reçoit le message
    cc: email,                  // L’utilisateur reçoit une copie
    subject: `Message de contact : ${sujet}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message de contact envoyé :", info.messageId);
    return info;
  } catch (err) {
    console.error("Erreur envoi contact :", err);
    throw err;
  }
}

