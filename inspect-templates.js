
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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

async function inspectTemplates() {
    const ids = ["V2_Kons_Fuellung", "V2_Endo_C_WF", "V2_ZE_Fest_A_Praep"];

    for (const id of ids) {
        try {
            const docRef = doc(db, "Praxen", "1", "Vorlagen", id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                console.log(`\n--- TEMPLATE: ${id} ---`);
                console.log(`TITLE: ${data.title || data.id}`);
                console.log(`INSTRUCTIONS: ${data.dictationInstructions || "None"}`);
                console.log(`DEFAULTS:`, data.practiceDefaults || "None");
                console.log(`MATERIAL:`, (data.Material || "").substring(0, 100) + "...");
                console.log(`TEXT (Preview):`, (data.Text || "").substring(0, 200).replace(/\n/g, " ") + "...");
            } else {
                console.log(`\n❌ Template ${id} not found.`);
            }
        } catch (error) {
            console.error(`Error fetching ${id}:`, error);
        }
    }
}

inspectTemplates();
