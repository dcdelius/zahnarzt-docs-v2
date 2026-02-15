
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

const CLEAN_TEMPLATE_TEXT = `**1) Leistungsübersicht (Abrechnung)**

Füllung Zahn - Flächen - Betrag €
Intraligamentäre Anästhesie
Isolation mittels Kofferdamm
Matrize und Keil
Mehrschichttechnik
Trockenlegung in SÄT
Lichtgehärtet
Politur

**2) Behandlungsdokumentation (Praxisakte)**

Patient kommt zur Füllung.
Klinische Untersuchung: Karies profunda.
Vitalitätsprüfung: positiv.
Röntgenologisch: kariöse Läsion im Dentin.
Aufklärung über Vor- und Nachteile durchgeführt, Patient einverstanden.
Kosten besprochen.
Anästhesie durchgeführt.
Die Behandlung erfolgte unter Kofferdamm.
Zur Füllung wurde eine Matrize angelegt.
Keil und Spannring gesetzt.
Karies vollständig exkaviert.
Kavität mit Adhäsivtechnik vorbereitet.
Trockenlegung in SÄT durchgeführt.
Die Füllung wurde in Mehrschichttechnik gelegt.
Füllung schichtweise gelegt und lichthärtend polymerisiert.
Anatomische Ausformung hergestellt, Kontaktpunkt wiederhergestellt.
Okklusion geprüft und eingeschliffen.
Abschließend wurde die Füllung poliert.
Duraphat appliziert.
Postoperative Hinweise gegeben.
Kontrolltermin vereinbart.
Patient verließ die Praxis in stabilem Zustand.`;

async function revertTemplate() {
    const templateId = "V2_Kons_Fuellung";
    console.log(`Reverting template ${templateId} to clean standard text...`);

    try {
        const docRef = doc(db, "Praxen", "1", "Vorlagen", templateId);
        await updateDoc(docRef, {
            Text: CLEAN_TEMPLATE_TEXT
        });
        console.log("✅ Template reverted successfully!");
    } catch (error) {
        console.error("❌ Error reverting template:", error);
    }
}

revertTemplate();
