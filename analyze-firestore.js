
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeFirestore() {
  console.log("🔍 Analysiere Firebase Struktur für Praxis '1'...\n");

  try {
    // 1. Benutzer checken
    console.log("--- BENUTZER ---");
    const userSnap = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
    if (userSnap.empty) {
      console.log("Keine Benutzer gefunden.");
    } else {
      userSnap.forEach(doc => {
        console.log(`- ${doc.id}: ${doc.data().name} (${doc.data().rolle})`);
      });
    }
    console.log("\n");

    // 2. Vorlagen checken (aktueller 'Chaos'-Ordner)
    console.log("--- VORLAGEN (aktuell flach) ---");
    const vorlagenSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
    if (vorlagenSnap.empty) {
      console.log("Keine Vorlagen gefunden.");
    } else {
      const categories = {};
      vorlagenSnap.forEach(doc => {
        const data = doc.data();
        const cat = data.Kategorie || "Unkategorisiert";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(doc.id);
      });

      Object.keys(categories).forEach(cat => {
        console.log(`\nKategorie: ${cat}`);
        categories[cat].forEach(id => console.log(`  - ${id}`));
      });
    }

  } catch (error) {
    console.error("Fehler beim Lesen:", error);
  }
}

analyzeFirestore();







