
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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

async function updateTemplateDefaults() {
    const templateId = "V2_Kons_Fuellung";
    console.log(`Updating defaults for ${templateId}...`);

    try {
        const docRef = doc(db, "Praxen", "1", "Vorlagen", templateId);

        // Define the standards we want to be toggleable
        const standards = "Anästhesie, Kofferdam, Matrize, Adhäsivtechnik, Mehrschichttechnik, Politur, Okklusionsprüfung";

        await updateDoc(docRef, {
            "practiceDefaults.standardLeistungen": standards
        });
        console.log("✅ Template defaults updated successfully!");
    } catch (error) {
        console.error("❌ Error updating template:", error);
    }
}

updateTemplateDefaults();
