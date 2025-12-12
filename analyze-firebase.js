
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from 'dotenv';

// Load env vars
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

async function analyzeTemplates() {
  console.log("🔍 Analysiere Praxen/1/Vorlagen...");
  
  try {
    const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
    
    if (snapshot.empty) {
      console.log("Keine Vorlagen gefunden.");
      return;
    }

    const templates = [];
    const junk = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      // Kriterien für "echte" Vorlage: Hat einen Titel/ID und Struktur
      // Kriterien für "Müll": Lange generierte Texte, fehlende Titel, seltsame IDs
      
      const isSuspicious = !data.Kategorie && !data.Text && !data.GPTPrompt;
      const isGeneratedText = data.Text && data.Text.length > 1000 && !data.Prompt; // Indiz für gespeichertes Ergebnis

      if (isSuspicious || isGeneratedText) {
        junk.push({ id: doc.id, ...data });
      } else {
        templates.push({ id: doc.id, ...data });
      }
    });

    console.log(`\n✅ Echte Vorlagen (${templates.length}):`);
    templates.forEach(t => console.log(`- [${t.Kategorie || 'Ohne Kategorie'}] ${t.id}`));

    console.log(`\n🗑️ Potenzieller Müll/Alte Texte (${junk.length}):`);
    junk.forEach(t => console.log(`- ID: ${t.id} (Kategorie: ${t.Kategorie}, Text-Länge: ${t.Text?.length || 0})`));

  } catch (error) {
    console.error("Fehler:", error);
  }
}

analyzeTemplates();

