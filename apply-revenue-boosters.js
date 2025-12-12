import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

const revenueBoosters = [
  // 1. KONS: Politur & bMF
  {
    id: "V2_Kons_Fuellung",
    gptPrompt: `KONTEXT: Füllungstherapie.
REVENUE BOOSTER: Optimiere für maximale Abrechenbarkeit (BEMA/GOZ).

STANDARDS (Immer dokumentieren):
- "Ausarbeitung und Hochglanzpolitur der Füllung." (Rechtfertigt Qualität).
- "Einschleifen der Okklusion in Statik und Dynamik." (Wichtig für Faktor).
- "Adhäsivtechnik: Ätzen, Primen, Bonden." (Wichtig für GOZ 2060/2100/2120).

TRIGGER für ZUSATZLEISTUNGEN (bMF):
- Suche nach: "tief", "Blutung", "Klemme", "Matrize", "schwierig", "Papille", "Speichel", "subgingival".
- WENN gefunden -> Schreibe: "Erschwerte Formgebung / Blutstillung mittels Matrize/Keil/Elektrotom notwendig (bMF)."
- Das triggert BEMA 12 / GOZ 2030.`
  },

  // 2. ENDO B (Aufbereitung): Phys & Med
  {
    id: "V2_Endo_B_Aufbereitung",
    gptPrompt: `KONTEXT: Endo-Aufbereitung.
REVENUE BOOSTER: Alle Teilschritte erfassen.

STANDARDS:
- "Reichliche Spülung (NaOCl/EDTA) zur Desinfektion." (Qualität).
- "Medikamentöse Einlage in alle Kanäle eingebracht." (Med - BEMA).

TRIGGER für LÄNGENMESSUNG (Phys):
- Suche nach: "gemessen", "Länge", "Apex", "Locator", "Piepsen", "elektrisch".
- WENN gefunden -> Schreibe: "Elektrometrische Längenbestimmung durchgeführt (Phys)." (Besser als nur Rö).`
  },

  // 3. ZE-FEST A (Präp): Aufbaufüllung
  {
    id: "V2_ZE_Fest_A_Praep",
    gptPrompt: `KONTEXT: Kronen-Präparation.
REVENUE BOOSTER: Fokus auf Aufbaufüllung (BEMA 13 / GOZ 2180).

LOGIK-WEICHE (Der wichtigste Booster):
- Suche nach: "Aufbau", "Füllung", "Loch zu", "Versiegelung", "Unterfüllung", "Kern", "Stumpfaufbau", "Komposit".
- WENN gefunden (oder auch nur angedeutet) -> Schreibe ZWINGEND unter Vorbehandlung: "Präendodontische/Adhäsive Aufbaufüllung in Dentinadhäsivtechnik zur Stumpfversorgung."
- Das ist eine eigenständige Leistung neben der Krone!

WEITERE BOOSTER:
- "Retraktionsfaden / Paste gelegt." (GOZ).
- "Entfernung alter Kronen/Brücken." (Eigene Position).`
  },

  // 4. ZE-FEST B (Einsetzen): Einschleifen
  {
    id: "V2_ZE_Fest_B_Einsetzen",
    gptPrompt: `KONTEXT: ZE Einsetzen.
REVENUE BOOSTER: Schwierigkeit begründen.

STANDARDS:
- "Feinjustierung der Okklusion durch Einschleifen im Munde." (Rechtfertigt Faktorsteigerung oder sK).
- "Kontaktpunkte approximal angepasst."

ADHASIV (Revenue Booster GOZ 2197):
- Wenn "Kleben/Adhäsiv" -> "Dentinkonditionierung und adhäsive Befestigung."`
  },

  // 5. CHECK-UP: Zst & Mu
  {
    id: "V2_01_Checkup",
    gptPrompt: `KONTEXT: Check-up (01).
REVENUE BOOSTER: Zusatzleistungen finden.

TRIGGER:
- "Zahnstein", "Beläge", "rau" -> "Entfernung von harten Zahnbelägen (Zst)."
- "Taschen", "Blutung", "Entzündung", "Salbe" -> "Medikamentöse Behandlung der Gingiva (Mu)."
- "Empfindlich", "Hälse" -> "Fluoridierung / Desensibilisierung."`
  }
];

async function applyRevenueBoosters() {
  console.log("🚀 Schärfe Vorlagen für Abrechnung (Revenue Booster)...");

  for (const t of revenueBoosters) {
    const ref = doc(db, "Praxen", "1", "Vorlagen", t.id);
    // Wir updaten nur den Prompt, lassen den Text (Struktur) aber gleich, 
    // da wir die Standards über den Prompt "reinpressen".
    await setDoc(ref, {
      GPTPrompt: t.gptPrompt,
      systemVersion: "v2"
    }, { merge: true });
    console.log(`💰 Booster aktiviert: ${t.id}`);
  }

  console.log("\n🎉 Vorlagen sind jetzt auf Umsatz optimiert.");
  process.exit(0);
}

applyRevenueBoosters().catch(console.error);






