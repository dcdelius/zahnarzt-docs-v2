// src/firebase.js
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore" // ✅ WICHTIG

// Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyDU_-VLE5pfPyYzdaW-hocgfOEwSFcHmp4",
  authDomain: "zahnarzt-app.firebaseapp.com",
  projectId: "zahnarzt-app",
  storageBucket: "zahnarzt-app.appspot.com",
  messagingSenderId: "425056158854",
  appId: "1:425056158854:web:0f37abc307a346842bfd07"
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