// validation.js

/**
 * Vérifie qu'une chaîne est un email valide.
 * @param {string} email
 * @returns {boolean}
 */
export function isEmailValid(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && re.test(email.trim());
}

/**
 * Vérifie qu'un mot de passe est valide (au moins 8 caractères).
 * @param {string} password
 * @returns {boolean}
 */
export function isPasswordValid(password) {
  return typeof password === "string" && password.length >= 8;
}

/**
 * Vérifie qu'un nom ou prénom n'est pas vide.
 * @param {string} name
 * @returns {boolean}
 */
export function isNameValid(name) {
  return typeof name === "string" && name.trim().length > 0;
}

/**
 * Vérifie que deux mots de passe correspondent.
 * @param {string} pw
 * @param {string} pwConfirm
 * @returns {boolean}
 */
export function doPasswordsMatch(pw, pwConfirm) {
  return pw === pwConfirm;
}

/**
 * Vérifie qu'un code 2FA est bien un nombre à 6 chiffres.
 * @param {string} code
 * @returns {boolean}
 */
export function isCodeValid(code) {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}
