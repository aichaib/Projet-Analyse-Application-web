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

export async function sendContactMessage(from, sujet, message) {
  return transporter.sendMail({
    from,
    to: process.env.EMAIL_USER,
    subject: `[Contact] ${sujet}`,
    html: `<p>De : ${from}</p><p>${message}</p>`
  });
}
