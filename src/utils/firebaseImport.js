import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// Authentifizierung
export async function authenticate() {
  try {
    const email = process.env.REACT_APP_AUTH_EMAIL;
    const password = process.env.REACT_APP_AUTH_PASSWORD;
    
    if (!email || !password) {
      throw new Error('Authentication credentials not configured');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Erfolgreich authentifiziert:", userCredential.user.uid);
    return true;
  } catch (error) {
    console.error("Authentifizierungsfehler:", error);
    return false;
  }
} 