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

const templates = [
  {
    id: "ZE_Praeparation",
    title: "ZE – Präparation",
    category: "Prothetik",
    text: `**INDIKATION & STATUS:**
• Plan: [ART_DES_ZE] (z.B. Krone/Brücke) an [ZAEHNE]
• Vitalität: [SENSIBILITAET_VITALITAET]
• Röntgen: [ROENTGEN_CHECK_STANDARD]

**PRÄPARATION & MASSNAHMEN:**
• Anästhesie: [ANAESTHESIE_MITTEL]
• Vorbehandlung: [AUFBAUFUELLUNG_ODER_STIFT]
• Präparation: [PRAEP_ART] (z.B. Hohlkehle/Stufe), [RETRAKTION]
• Abformung: [ABFORMUNG_MATERIAL_METHODE]
• Farbnahme: [FARBE]

**PROVISORISCHE VERSORGUNG:**
• Herstellung: [PROVI_MATERIAL] (direkt/Labor)
• Einsetzen: [PROVI_ZEMENT], [OKKLUSIONSCHECK_STANDARD]

**AUFKLÄRUNG:**
• [AUFKLAERUNG_STANDARD] (Risiken, Kosten, HKP)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: [Liste: z.B. "Stumpfaufbau (BEMA 13/GOZ 2180)", "Provisorium", "Individueller Löffel"]
• Faktoren: [z.B. "Hohlkehle subgingival", "Schwierige Farbgestaltung"]`,
    gptPrompt: `KONTEXT: ZE – Präparation (Prothetik).

IMPLIZITE STANDARDS (Automatisch ergänzen):
1.  **Röntgen:** "Röntgenbild und apikale Situation geprüft."
2.  **Präparation:** "Präparationsgrenze dargestellt, ausreichende Reduktion für gewähltes Material."
3.  **Provisorium:** "Provisorium ausgearbeitet, okklusal/approximal eingeschliffen, Zementreste entfernt."
4.  **Aufklärung:** "Aufklärung über Art, Umfang, Alternativen, Kosten (HKP) & Risiken (Pulpaschädigung) erfolgt."

LOGIK FÜR MATERIAL & ABLAUF:
- Wenn in der Materialliste Komposit/Bonding auftaucht -> Beschreibe unter 'Vorbehandlung' eine "Adhäsive Aufbaufüllung".
- Wenn 'Retraktionsfaden' oder 'Paste' genannt/gelistet -> Füge dies bei 'Präparation' ein (Wichtig für GOZ!).
- Unterscheide anhand des Diktats: Krone (Einzelzahn) vs. Brücke (Pfeilerzähne nennen).

ABRECHNUNGS-TRIGGER (Fülle den Check-Block):
- Suche aggressiv nach **"Aufbaufüllung"** oder **"Stumpfaufbau"**. Das muss in den Abrechnungs-Check!
- Suche nach **"Individueller Löffel"** oder **"Impregum/Polyether"** -> Abrechnungshinweis.
- Suche nach **"Einschleifen Antagonist"** -> Abrechnungshinweis (GOZ 8900 / BEMA 108).`,
    users: ["all"]
  },
  {
    id: "ZE_Einsetzen",
    title: "ZE – Einsetzen",
    category: "Prothetik",
    text: `**EINPROBE & STATUS:**
• Provisorium: [ENTFERNUNG_PROVI], Stumpf gesäubert ([REINIGUNGSMETHODE]).
• Einprobe: [PASSUNG_RANDSCHLUSS_KONTAKT_OKKLUSION]

**DEFINITIVE BEFESTIGUNG:**
• Werkstück: [MATERIAL_ART] (z.B. VMK, Zirkon, E-Max)
• Vorbehandlung Zahn: [KONDITIONIERUNG_ZAHN] (z.B. Ätzen/Bonding oder Reinigung)
• Vorbehandlung ZE: [KONDITIONIERUNG_ZE] (z.B. Silan/Primer)
• Zementierung: [BEFESTIGUNGSMATERIAL]
• Ausarbeitung: [UEBERSCHUESSE_ENTFERNT], [OKKLUSIONSFEINKORREKTUR]

**ABSCHLUSS:**
• [PFLEGEHINWEISE_STANDARD]
• Röntgenkontrolle: [ROENTGEN_JA_NEIN] (wegen Zementresten)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: [z.B. "Eingliederung Krone/Brücke", "Adhäsive Befestigung (2197)"]
• Material: [Verbrauchtes Material für Laborbeleg]`,
    gptPrompt: `KONTEXT: ZE – Einsetzen (Prothetik).

INTELLIGENTE BEFESTIGUNGS-LOGIK (WICHTIG!):
Analysiere die {MATERIAL_LIST} und das Diktat, um die Methode zu bestimmen:

A) **Adhäsiv (Vollkeramik/E-Max):**
   - Wenn Materialien wie "Variolink", "Panavia", "Multilink", "Ätzgel", "Bonding" vorkommen:
   - Schreibe bei 'Vorbehandlung Zahn': "Absolute Trockenlegung, Schmelzätzung, Adhäsivsystem."
   - Schreibe bei 'Vorbehandlung ZE': "Flusssäure/Silanisierung (falls Keramik) oder Primer."
   - **Abrechnungs-Check:** Füge zwingend "Adhäsive Befestigung (GOZ 2197)" hinzu!

B) **Konventionell (NEM/Zirkon):**
   - Wenn Materialien wie "Ketac", "Fuji", "Harvard", "Zinkphosphat" vorkommen:
   - Schreibe: "Konventionelle Zementierung, relative Trockenlegung."

IMPLIZITE STANDARDS:
1.  **Einprobe:** "Randschluss spaltfrei, Kontaktpunkte stramm, Okklusion stimmig (Shimstock)."
2.  **Ausarbeitung:** "Zementüberschüsse vollständig entfernt (Sonde/Zahnseide)."
3.  **Abschluss:** "Pflegehinweise (Zahnzwischenraumpflege) demonstriert."

OUTPUT:
Fülle die Vorlage präzise. Nutze Fachbegriffe.`,
    users: ["all"]
  }
];

async function addTemplates() {
  console.log("🚀 Starte das Hinzufügen der ZE-Vorlagen...");

  for (const template of templates) {
    const docRef = doc(db, "Praxen", "1", "Vorlagen", template.id);
    await setDoc(docRef, {
      Kategorie: template.category,
      GPTPrompt: template.gptPrompt,
      Text: template.text,
      users: template.users
    }, { merge: true });
    console.log(`✅ Vorlage "${template.title}" (${template.id}) hinzugefügt/aktualisiert.`);
  }

  console.log("\n🎉 Fertig! Die neuen Vorlagen sind jetzt in der App verfügbar.");
  process.exit(0);
}

addTemplates().catch(error => {
  console.error("❌ Fehler:", error);
  process.exit(1);
});






