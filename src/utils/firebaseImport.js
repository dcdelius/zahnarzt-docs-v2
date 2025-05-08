import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDU_-VLE5pfPyYzdaW-hocgfOEwSFcHmp4",
  authDomain: "zahnarzt-app.firebaseapp.com",
  projectId: "zahnarzt-app",
  storageBucket: "zahnarzt-app.appspot.com",
  messagingSenderId: "425056158854",
  appId: "1:425056158854:web:0f37abc307a346842bfd07"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// Authentifizierung
export async function authenticate() {
  try {
    // Hier deine Test-Email und Passwort einfügen
    const userCredential = await signInWithEmailAndPassword(auth, "david.richter@me.com", "123456");
    console.log("Erfolgreich authentifiziert:", userCredential.user.uid);
    return true;
  } catch (error) {
    console.error("Authentifizierungsfehler:", error);
    return false;
  }
} 