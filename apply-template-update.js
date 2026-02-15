
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

const OPTIMIZED_TEMPLATE_TEXT = `**1) Leistungsübersicht (Abrechnung)**

Füllung Zahn [ZAHL] - [FLÄCHEN] - [BETRAG] €
[Anästhesie-Art] ([ja/nein])
Isolation mittels Kofferdamm ([ja/nein])
Matrize und Keil ([ja/nein])
Mehrschichttechnik ([ja/nein])
Trockenlegung in SÄT ([ja/nein])
Lichtgehärtet ([ja/nein])
Politur ([ja/nein])

**2) Behandlungsdokumentation (Praxisakte)**

Patient kommt zur Füllung an Zahn [ZAHL], Flächen: [FLÄCHEN].
Klinische Untersuchung: [BEFUND].
Vitalitätsprüfung: [ERGEBNIS].
Röntgenologisch: [BEFUND].
Aufklärung über Vor- und Nachteile durchgeführt, Patient einverstanden.
Kosten: [BETRAG] €, Farbe: [FARBE].
[Anästhesie-Art] mit [MENGE] durchgeführt.
Die Behandlung erfolgte unter Kofferdamm ([ja/nein]).
Zur Füllung wurde eine Matrize angelegt ([ja/nein]).
Keil und Spannring gesetzt ([ja/nein]).
Karies vollständig exkaviert.
Kavität mit Adhäsivtechnik vorbereitet.
Trockenlegung in SÄT durchgeführt ([ja/nein]).
Die Füllung wurde in Mehrschichttechnik gelegt ([ja/nein]).
Füllung mit [MATERIAL] schichtweise gelegt und lichthärtend polymerisiert ([ja/nein]).
Anatomische Ausformung hergestellt, Kontaktpunkt wiederhergestellt.
Okklusion geprüft und eingeschliffen.
Abschließend wurde die Füllung poliert ([ja/nein]).
Duraphat appliziert ([ja/nein]).
Postoperative Hinweise gegeben: [HINWEISE].
Kontrolltermin in [ZEITRAUM] vereinbart.
Patient verließ die Praxis in stabilem Zustand.`;

async function updateTemplate() {
    const templateId = "V2_Kons_Fuellung";
    console.log(`Updating template ${templateId}...`);

    try {
        const docRef = doc(db, "Praxen", "1", "Vorlagen", templateId);
        await updateDoc(docRef, {
            Text: OPTIMIZED_TEMPLATE_TEXT
        });
        console.log("✅ Template updated successfully!");
    } catch (error) {
        console.error("❌ Error updating template:", error);
    }
}

updateTemplate();
