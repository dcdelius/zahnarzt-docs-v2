
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

async function checkTemplate() {
    const templateId = "V2_Kons_Fuellung";
    console.log(`Checking template ${templateId}...`);

    try {
        const docRef = doc(db, "Praxen", "1", "Vorlagen", templateId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            console.log("Practice Defaults:", data.practiceDefaults);
            console.log("Standard Leistungen:", data.practiceDefaults?.standardLeistungen);
        } else {
            console.log("Template not found");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkTemplate();
