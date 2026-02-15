import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function checkProstheticTemplates() {
  console.log("🔍 Prüfe Prothetik-Vorlagen in Firebase...\n");

  const templatesRef = collection(db, "Praxen", "1", "Vorlagen");
  const snapshot = await getDocs(templatesRef);

  const prostheticTemplates = [
    "V2_ZE_Fest_A_Praep",
    "V2_ZE_Fest_B_Einsetzen",
    "V2_ZE_Mobil_A_Start",
    "V2_ZE_Mobil_B_Funktion",
    "V2_ZE_Mobil_C_Fertig"
  ];

  for (const templateId of prostheticTemplates) {
    const doc = snapshot.docs.find(d => d.id === templateId);
    if (doc) {
      const data = doc.data();
      console.log(`\n✅ ${templateId}:`);
      console.log(`   - Text vorhanden: ${data.Text ? `Ja (${data.Text.length} Zeichen)` : 'NEIN'}`);
      console.log(`   - GPTPrompt vorhanden: ${data.GPTPrompt ? `Ja (${data.GPTPrompt.length} Zeichen)` : 'NEIN'}`);
      console.log(`   - systemVersion: ${data.systemVersion || 'FEHLT'}`);
      console.log(`   - Kategorie: ${data.Kategorie || 'FEHLT'}`);
      if (data.Text) {
        console.log(`   - Text-Vorschau: ${data.Text.substring(0, 100)}...`);
      }
    } else {
      console.log(`\n❌ ${templateId}: NICHT GEFUNDEN`);
    }
  }

  process.exit(0);
}

checkProstheticTemplates().catch(console.error);







