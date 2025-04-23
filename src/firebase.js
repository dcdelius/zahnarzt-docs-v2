// src/firebase.js
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore" // ✅ WICHTIG

// Konfiguration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// OpenAI API Key
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Firebase Initialisierung
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app) // ✅ DAS NUTZT DU IN Dashboard.jsx

// Error Handling für Firebase
export const handleFirebaseError = (error) => {
  console.error('Firebase Error:', error);
  switch (error.code) {
    case 'permission-denied':
      return 'Keine Berechtigung für diese Aktion';
    case 'not-found':
      return 'Dokument nicht gefunden';
    case 'already-exists':
      return 'Dokument existiert bereits';
    case 'resource-exhausted':
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment';
    default:
      return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut';
  }
};