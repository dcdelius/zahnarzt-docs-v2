
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
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

const MANUAL_MAPPING = {
  "Endo Termin 1": "Endodontie",
  "fuellung_komposit": "Konservierende Zahnheilkunde",
  "Kronenbeschliff": "Prothetik", // oder Zahnersatz zusammenfassen?
  "FST": "Prothetik",
  "Gerüstanprobe": "Prothetik",
  "Präparation Scan": "Prothetik",
  "Scan Implantatkrone": "Implantologie"
};

async function migrateTemplates() {
  console.log("🚀 Starte Migration der Vorlagen...\n");

  try {
    const oldTemplatesSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
    
    if (oldTemplatesSnap.empty) {
      console.log("Keine Vorlagen zum Migrieren gefunden.");
      return;
    }

    for (const docSnap of oldTemplatesSnap.docs) {
      const data = docSnap.data();
      let category = data.Kategorie;

      // Fallback oder manuelles Mapping
      if (!category || category === "Unkategorisiert") {
        category = MANUAL_MAPPING[docSnap.id] || "Sonstiges";
      }
      
      // Konsistente Benennung
      category = category.trim();

      // Zielpfad: Praxen/1/Behandlungen/{Kategorie}/Vorlagen/{ID}
      const targetRef = doc(db, "Praxen", "1", "Behandlungen", category, "Vorlagen", docSnap.id);
      
      // Daten speichern
      await setDoc(targetRef, {
        ...data,
        migratedAt: new Date(),
        originalId: docSnap.id
      });

      console.log(`✅ Migriert: ${docSnap.id} -> Behandlungen/${category}/Vorlagen/${docSnap.id}`);
    }

    console.log("\n🎉 Migration abgeschlossen. Prüfe nun die neue Struktur in der App.");

  } catch (error) {
    console.error("❌ Fehler bei der Migration:", error);
  }
}

migrateTemplates();







