// WICHTIG: Diese Datei ist veraltet und enthält keine hardcodierten API-Keys mehr
// Verwende stattdessen firebase.js und die UI für Imports

import { db } from '../firebase';

// Diese Funktion ist veraltet - verwende die UI für Imports
export async function authenticate() {
  console.warn('firebaseImport.js ist veraltet. Bitte verwende die UI für Imports.');
  return false;
}

// Export db für Legacy-Code
export { db }; 