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

const templatesToUpdate = [
  // --- ZE FEST (Kronen/Brücken) ---
  {
    id: "V2_ZE_Fest_A_Praep",
    text: `**INDIKATION & PLAN:**
• Zähne: [ZAEHNE]
• Versorgung: [ART_DES_ZE] (z.B. VMK-Krone, Zirkon-Brücke, Teilkrone)
• Anästhesie: [ANAESTHESIE]

**PRÄPARATION:**
• Vorbehandlung: [AUFBAU_DETAILS] (z.B. Karies entfernt, adhäsiver Stumpfaufbau, Stift)
• Beschliff: [PRAEP_ART] (z.B. Hohlkehle, Stufe, subgingival)
• Abformung: [ABFORMUNG_DETAILS] (z.B. 2-Faden-Technik, Scan, Impregum, Alginat-Gegenkiefer)
• Farbnahme: [FARBE]

**PROVISORIUM:**
• Art: [PROVI_MATERIAL] (direkt/Labor)
• Befestigung: [PROVI_ZEMENT]
• Okklusion: [OKKLUSION_CHECK] (Kontaktpunkte frei, gleitet)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Hauptleistung: BEMA 20 / GOZ 2200/2210/5000
• Zusatz (WICHTIG): [AUFBAUFUELLUNG], [INDIV_LOEFFEL], [IST_MODELLE]`,
    gptPrompt: `KONTEXT: Du bist ein Experte für Kronen- und Brückenpräparationen.
ZIEL: Dokumentiere forensisch sauber und hebe abrechnungsrelevante Details hervor.

LOGIK & WEICHEN:
1. AUFBAUFUELLUNG (Revenue Booster):
   - Wenn "Füllung", "Aufbau", "Plastisch", "Komposit" erwähnt -> Schreibe IMMER: "Präendodontische/Adhäsive Aufbaufüllung in Dentinadhäsivtechnik" (Wichtig für BEMA 13 / GOZ 2180).
   - Wenn "Stift" -> Dokumentiere "Glasfaserstift adhäsiv befestigt".

2. ABFORMUNG:
   - Wenn "Faden" oder "Paste" -> Dokumentiere "Sulcusmanagement mittels Retraktionsfaden/Paste" (Wichtig für GOZ).
   - Wenn "Scan" -> "Digitale Abformung (Intraoralscan)".

3. PROVISORIUM:
   - Standard: "Direktes Provisorium ausgearbeitet, poliert und temporär zementiert."
   - Wichtig: "Zementreste im Sulcus vollständig entfernt."

IMPLIZITE STANDARDS:
- "Präparationsgrenze klar dargestellt."
- "Ausreichend Platz für Keramik/Metall geschaffen."
- "Vitalität der Pfeilerzähne geprüft."`
  },
  {
    id: "V2_ZE_Fest_B_Einsetzen",
    text: `**EINPROBE:**
• Provi entfernt: [STUMPF_ZUSTAND] (gesäubert, reizlos)
• Einprobe ZE: [PASSUNG_CHECK] (Randschluss, Kontaktpunkte, Farbe)
• Röntgen: [ROENTGEN_KONTROLLE] (optional bei Zementrest-Gefahr)

**BEFESTIGUNG ([BEFESTIGUNGS_ART]):**
• Vorbehandlung Zahn: [VORBEHANDLUNG_ZAHN] (z.B. Reinigung, Ätzen/Bonding)
• Vorbehandlung ZE: [VORBEHANDLUNG_ZE] (z.B. Sandstrahlen, Silan, Primer)
• Zementierung: [MATERIAL_ZEMENT]
• Ausarbeitung: [UEBERSCHUESSE_ENTFERNT]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistung: Eingliederung (BEMA 24/95 / GOZ 2230/50xx)
• Kleben: [ADHAESIVE_BEFESTIGUNG_2197]`,
    gptPrompt: `KONTEXT: Einsetzen von festsitzendem Zahnersatz.
ZIEL: Unterscheide präzise zwischen Zementieren und Kleben (Adhäsiv).

LOGIK-WEICHE (Befestigung):
1. SZENARIO "ADHÄSIV / KLEBEN" (Keramik, E-Max, Veneer):
   - Trigger: "Variolink", "Panavia", "Multilink", "Säure", "Ätzen", "Bonding", "Kleben".
   - Output: Beschreibe detailliert: "Absolute Trockenlegung (Kofferdam/Relative), Schmelzätzung, Adhäsivsystem, Silanisierung des Werkstücks."
   - Abrechnung: Füge zwingend "Adhäsive Befestigung (GOZ 2197)" zum Check hinzu.

2. SZENARIO "ZEMENTIEREN" (Gold, Zirkon, Metall):
   - Trigger: "Zement", "Ketac", "Fuji", "Harvard", "Phosphat".
   - Output: "Konventionelle Zementierung nach Reinigung der Stümpfe."

FORENSIK:
- IMMER: "Randschlusskontrolle mit Sonde: spaltfrei."
- IMMER: "Okklusion und Artikulation geprüft (Shimstock)."
- IMMER: "Sorgfältige Entfernung aller Zementüberschüsse (Zahnseide/Sonde)."`
  },

  // --- ZE MOBIL (Prothesen) ---
  {
    id: "V2_ZE_Mobil_A_Start",
    text: `**BEFUND & PLANUNG:**
• Kiefer: [KIEFER_BEREICH] (OK/UK)
• Versorgung: [PROTHESEN_ART] (z.B. Teleskopprothese, Totalprothese, Modellguss)
• Planung: [PLANUNGS_DETAILS]

**PRÄPARATION / ABFORMUNG:**
• Maßnahmen: [PRAEP_DETAILS] (z.B. Einschleifen, Auflagen, Teleskop-Präp)
• Abformung 1: [ABFORMUNG_SITU] (Alginat für Gegenkiefer/Planung)
• Abformung 2: [ABFORMUNG_FUNKTION] (Indiv. Löffel / Funktionsrand)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Situ-Modelle, Abformung, Planungsmodelle`,
    gptPrompt: `KONTEXT: Start einer herausnehmbaren Versorgung.
ZIEL: Dokumentiere die Planungsgrundlage und erste Maßnahmen.

LOGIK:
- Wenn "Teleskop" -> Fokus auf "Primärpräparation" und "Parallelisierung".
- Wenn "Totalprothese" -> Fokus auf "Funktionsrand" und "Anatomische Abformung".
- Wenn "Klammer/Modellguss" -> Fokus auf "Auflagen einschleifen".

STANDARDS:
- "Aufklärung über Alternativen (Implantate vs. Klammer vs. Teleskop) erfolgt."`
  },
  {
    id: "V2_ZE_Mobil_B_Funktion",
    text: `**ZWISCHENEINPROBE:**
• Schritt: [EINPROBE_TYP] (Gerüst / Wachs / Biss)

**DETAILS ZUR SITZUNG:**
• Passung (Gerüst): [GERUEST_CHECK] (Randschluss, Kippeln, Friktion)
• Funktion (Biss): [BISS_CHECK] (Höhe, Zentrik, Verschlüsselung)
• Ästhetik (Wachs): [AESTHETIK_CHECK] (Zahnform, Farbe, Phonetik, Mittellinie)

**WEITERE MASSNAHMEN:**
• Abformung: [UEBERABFORMUNG] (falls erfolgt)
• Labor: [ANWEISUNG_LABOR] (z.B. Fertigstellung)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: [LEISTUNGEN_AUTO] (z.B. Stützstift, Funktionsabformung, Bissnahme)`,
    gptPrompt: `KONTEXT: Du dokumentierst einen Zwischenschritt bei herausnehmbarem Zahnersatz (ZE-Mobil).
ZIEL: Erkenne automatisch, welche Einprobe stattgefunden hat und dokumentiere nur das Relevante.

LOGIK-WEICHE (Trigger-Analyse):

1. SZENARIO "GERÜST / KÄPPCHEN / PRIMÄRTEILE":
   - Trigger: "Gerüst", "Metall", "Modellguss", "Käppchen", "Primärteil", "Teleskop".
   - Output-Fokus: Passung, Randschluss (Sonde), Kippeln, Friktion.
   - Wenn "Überabformung" erwähnt -> "Fixationsabformung mit individuellem Löffel".

2. SZENARIO "WACHS / ZÄHNE / ÄSTHETIK":
   - Trigger: "Wachs", "Aufstellung", "Zähne", "Ästhetik", "Farbe", "Phonetik", "Mittellinie".
   - Output-Fokus: Ästhetische Einprobe. "Phonetik, Ästhetik und Biss überprüft und für gut befunden."
   - Wenn Änderungen diktiert -> Dokumentiere diese präzise.

3. SZENARIO "BISS / REGISTRAT":
   - Trigger: "Biss", "Registrat", "Verschlüsselung", "Stützstift", "Pfeilwinkel".
   - Output-Fokus: Kieferrelationsbestimmung. "Verschlüsselung in RKP/Zentrik."

FORENSISCHE STANDARDS:
- "Patient ist mit dem Ergebnis zufrieden." (außer bei Mängeln).
- "Spannungsfreier Sitz geprüft."`
  },
  {
    id: "V2_ZE_Mobil_C_Fertig",
    text: `**EINGLIEDERUNG:**
• Prothese: [PROTHESEN_BESCHREIBUNG] (OK/UK)
• Passung: [SITZ_HALT] (Saugkraft, Friktion, Lagestabilität)
• Okklusion: [OKKLUSION_KONTROLLE] (Statik/Dynamik eingeschliffen)

**NACHSORGE:**
• Druckstellen: [DRUCKSTELLEN_ENTFERNT]
• Instruktion: [HANDHABUNG_PFLEGE] (Einsetzen/Herausnehmen geübt)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistung: Eingliederung (BEMA 96/97/98 / GOZ 5200ff)`,
    gptPrompt: `KONTEXT: Fertigstellung / Abgabe ZE-Mobil.
FOKUS: Patientenzufriedenheit und Funktion.

IMPLIZITE STANDARDS:
- "Prothesenbasis auf scharfe Kanten geprüft und poliert."
- "Okklusion mittels Artikulationspapier fein eingeschliffen."
- "Patient in Handhabung und Pflege (Reinigungstabs vermeiden!) unterwiesen."
- "Kontrolltermin vereinbart."

LOGIK:
- Teleskope: Erwähne "Friktion" (Halt der Primär- in Sekundärteilen).
- Totalprothese: Erwähne "Saugkraft" und "Ventilrand".`
  }
];

async function updateProstheticTemplates() {
  console.log("🚀 Aktualisiere Prothetik-Vorlagen mit scharfen Prompts...");

  for (const t of templatesToUpdate) {
    // Wir laden zuerst das bestehende Dokument, um Kategorie und andere Felder zu behalten
    // und nur Text und Prompt zu aktualisieren.
    const ref = doc(db, "Praxen", "1", "Vorlagen", t.id);
    
    await setDoc(ref, {
      Text: t.text,
      GPTPrompt: t.gptPrompt,
      // Wir stellen sicher, dass die Version gesetzt ist, falls es noch nicht war
      systemVersion: "v2"
    }, { merge: true });
    
    console.log(`✅ Updated: ${t.id}`);
  }

  console.log("\n🎉 Fertig! Prothetik-Vorlagen sind jetzt intelligent.");
  process.exit(0);
}

updateProstheticTemplates().catch(console.error);






