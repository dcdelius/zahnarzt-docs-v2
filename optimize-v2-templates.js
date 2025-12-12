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

const templatesToOptimize = [
  // 1. CHECK-UP
  {
    id: "V2_01_Checkup",
    title: "Check-up / 01",
    Kategorie: "1. Check-up",
    dictationInstructions: "Zahnstatus, Befunde (Karies), PSI/Taschen, Röntgen, Therapieplan, Kosten (PZR/IP) geklärt",
    gptPrompt: `KONTEXT: Routine-Kontrolle (01) / Eingehende Untersuchung.
ZIEL: Status erheben & Behandlungsbedarf identifizieren.

LOGIK & WEICHEN:
- NEGATIV-DOKU (Wichtig!): Wenn keine pathologischen Befunde diktiert werden, MUSS stehen: "Gebiss saniert/kariesfrei, Schleimhaut o.B., Vitalität stichprobenartig positiv, Lnn. nicht palpabel."
- Wenn Befunde -> Dokumentiere präzise (Karies, Insuffizienz, PSI).

FORENSIK & AUFKLÄRUNG:
- "Eingehende Untersuchung von Zähnen, Mundschleimhaut und Kiefergelenken."
- Bei Befund: "Patient über Diagnose (z.B. Karies, Parodontitis) und die Konsequenzen der Nichtbehandlung (Progression, Schmerzen, Zahnverlust) aufgeklärt."
- ABLEHNUNG: Falls Patient Röntgen/Therapie ablehnt -> "Patient wünscht trotz Aufklärung über Risiken aktuell keine Therapie/Diagnostik."
- "Beratung über Optimierung der häuslichen Mundhygiene und Risikofaktoren."`
  },

  // 2. KONS
  {
    id: "V2_Kons_Fuellung",
    title: "Füllungstherapie",
    Kategorie: "2. Kons",
    dictationInstructions: "Zahn/Flächen, Tiefe/Vitalität, Anästhesie, bMF/Matrize, Material, Kosten (€) genannt, MKV unterschrieben",
    gptPrompt: `KONTEXT: Füllungstherapie (Kons).
ZIEL: Exakte Dokumentation von Flächen, Material und Schwierigkeit.

LOGIK:
- Flächen konvertieren (mod -> 3-flächig).
- Trigger "bMF": Blutung, tief, Klemme, Mundboden verdrängen.

ABLAUF:
1. Vit-Probe (+)
2. Anästhesie (wenn genannt)
3. Exkavation (kariesfrei)
4. Adhäsivtechnik & Mehrschicht
5. Okklusion & Politur

FORENSIK & RISIKEN (CRITICAL):
- "Aufklärung über Diagnose (Karies), Therapie (Füllung) und Alternativen (Inlay, Nichtbehandlung)."
- SPEZIFISCHES RISIKO: "Aufklärung über Gefahr der Pulpaeröffnung (c.p.) bei tiefer Karies und mögliche Notwendigkeit einer Wurzelkanalbehandlung (Endo), sowie mögliche postoperative Überempfindlichkeit."
- ANÄSTHESIE: "Aufklärung über Risiken (Bissverletzung, Hämatom, Nervirritation) und Verhalten (Nahrungskarenz)."
- KOSTEN: "Aufklärung über Mehrkosten für hochwertige Kompositversorgung erfolgt. Schriftliche Mehrkostenvereinbarung (MKV) liegt vor."
- "Einverständnis liegt vor."`
  },

  // 3. ENDO (A - Trepanation)
  {
    id: "V2_Endo_A_Trepanation",
    title: "Endo A - Trepanation",
    Kategorie: "3. Endo",
    dictationInstructions: "Zahn, Diagnose, Anästhesie, Kanäle/Blutung, Längenmessung, Medikament, Kostenaufklärung (Privat/Zusatz) erfolgt, Prognose besprochen",
    practiceDefaults: {
        standardLeistungen: "Kofferdam, elektrometrische Längenbestimmung"
    },
    gptPrompt: `KONTEXT: Endo-Start (Trepanation / Notdienst).
ZIEL: Schmerzausschaltung & Diagnostik.

LOGIK:
- Vital vs. Devital (Gangrän) unterscheiden.
- Röntgenpflichtig!

FORENSIK & RISIKEN (EXTENDED):
- "Aufklärung über Diagnose und Alternativen (Ex vs. Erhalt)."
- ENDO-RISIKEN: "Ausführliche Aufklärung über: Instrumentenfraktur, Perforation, Via Falsa, Überpressen von Material, Spülunfall (NaOCl), Verfärbung, Misserfolg."
- "Aufklärung über erhöhte Frakturgefahr des Zahnes und Notwendigkeit der späteren Überkronung."
- KOSTEN: "Aufklärung über mögliche private Zusatzkosten (elektrometrische Längenbestimmung, PUI, Mikroskop) und Prognoseverbesserung dadurch erfolgt."
- ANÄSTHESIE: "Aufklärung Risiken & Verhalten."
- "Patient wünscht explizit den Zahnerhalt."`
  },
  
  // 3. ENDO (B - Aufbereitung)
  {
    id: "V2_Endo_B_Aufbereitung",
    title: "Endo B - Aufbereitung",
    Kategorie: "3. Endo",
    dictationInstructions: "Zahn, Kanäle/ISO, Längen (mm), Spülung, Medikament, Zusatzleistungen (Laser/PUI) berechnet, Kosten aktualisiert",
    gptPrompt: `KONTEXT: Endo-Zwischensitzung.
ZIEL: Längenbestimmung & Desinfektion.

LOGIK:
- Längen/ISO dokumentieren.
- Messmethode unterscheiden (Röntgen vs. Endo).

FORENSIK:
- "Zwischenaufklärung über Verlauf."
- "Patient darauf hingewiesen, dass Zahn noch provisorisch verschlossen ist (Vorsicht beim Kauen, Bruchgefahr)."
- Bei Medikamentenwechsel: "Erneute Desinfektion zur Keimreduktion."`
  },

  // 3. ENDO (C - WF)
  {
    id: "V2_Endo_C_WF",
    title: "Endo C - Wurzelfüllung",
    Kategorie: "3. Endo",
    dictationInstructions: "Zahn, Kanal trocken, Masterpoint, Technik/Sealer, Deckfüllung, Röntgen, Kosten (Adhäsiv/Stift) geklärt, Rechnungshinweis erfolgt",
    gptPrompt: `KONTEXT: Endo-Abschluss (Wurzelfüllung).
ZIEL: Definitive Abfüllung.

FORENSIK & PROGNOSE:
- "Röntgenkontrolle zur Qualitätssicherung: WF wandständig und bis zum Apex."
- "Abschlussgespräch: Aufklärung über Notwendigkeit der zeitnahen definitiven Versorgung (z.B. Krone/Teilkrone) zur Stabilisierung gegen Fraktur."
- "Aufklärung über mögliches Wiederauftreten von Beschwerden (Exazerbation)."
- "Patient über Verhalten nach Behandlung (Druckschmerz möglich) aufgeklärt."`
  },

  // 4. CHIRURGIE
  {
    id: "V2_Chirurgie_Ex",
    title: "Zahnentfernung (Ex)",
    Kategorie: "4. Chirurgie",
    dictationInstructions: "Zahn, Indikation, Anästhesie, Technik/Osteotomie, Kieferhöhle/Naht, Alternativen/Kosten besprochen",
    gptPrompt: `KONTEXT: Zahnentfernung.
ZIEL: Indikation & Durchführung.

FORENSIK & OP-RISIKEN (MAXIMUM SECURITY):
- "Aufklärung über Diagnose (nicht erhaltungswürdig) und Alternativen (Brücke, Implantat, Lücke)."
- CHIRURGISCHE RISIKEN: "Nervschädigung (Taubheit/Paresthesie), Eröffnung der Kieferhöhle (MAV), Beschädigung von Nachbarzähnen, Fraktur, Wundheilungsstörungen."
- ANÄSTHESIE: "Aufklärung über Injektionsrisiken und eingeschränkte Verkehrstüchtigkeit."
- POST-OP: "Verhalten instruiert: Kühlen, Aufbisstupfer 30min, 24h kein Nikotin/Koffein/Sport."
- "Patient ist aufgeklärt, Fragen beantwortet, Einverständnis liegt vor."`
  },

  // 5. ZE - FEST (A - Präp)
  {
    id: "V2_ZE_Fest_A_Praep",
    title: "Krone/Brücke - Präparation",
    Kategorie: "5. ZE-Fest",
    dictationInstructions: "Zahn, Art (Hohlkehle), Anästhesie, Abdruck (Scan/Konv.), Provisorium, Farbe, HKP/Kosten unterschrieben",
    gptPrompt: `KONTEXT: Präparation für festsitzenden Zahnersatz.
FORENSIK:
- "Aufklärung über Notwendigkeit der Überkronung (Substanzdefekt/Frakturgefahr)."
- RISIKEN: "Aufklärung über Risiko des Pulpaschadens (Nerventzündung) durch das Schleifen, sowie Temperaturempfindlichkeit."
- KOSTEN: "Heil- und Kostenplan (HKP) besprochen und unterschrieben. Eigenanteil geklärt."`
  },

  // 5. ZE - FEST (B - Einsetzen)
  {
    id: "V2_ZE_Fest_B_Einsetzen",
    title: "Krone/Brücke - Eingliederung",
    Kategorie: "5. ZE-Fest",
    dictationInstructions: "Passung, Rand, Zement (Temp/Def), Okklusion, Pflege, Garantie/Rechnung besprochen",
    gptPrompt: `KONTEXT: Eingliederung ZE fest.
FORENSIK:
- "Kontrolle auf Randschluss, Kontaktpunkte und Okklusion: Mängelfrei."
- "Patient über Pflege (Zahnseide/Interdentalbürsten) und Recall instruiert."
- "Hinweis auf Gewährleistung und Rechnung."`
  },

  // 6. ZE - MOBIL (A - Abdruck)
  {
    id: "V2_ZE_Mobil_A_Abdruck",
    title: "Prothese - Abformung",
    Kategorie: "6. ZE-Mobil",
    dictationInstructions: "Befund, Planung (Teleskop/Modellguss), Löffel individ., Bissnahme, HKP genehmigt",
    gptPrompt: `KONTEXT: Prothetik Start.
FORENSIK:
- "Aufklärung über Diagnose (Lückengebiss) und Therapieoptionen (festsitzend vs. herausnehmbar)."
- "HKP und Eigenanteil besprochen."`
  },

  // 6. ZE - MOBIL (B - Einsetzen)
  {
    id: "V2_ZE_Mobil_B_Einsetzen",
    title: "Prothese - Eingliederung",
    Kategorie: "6. ZE-Mobil",
    dictationInstructions: "Halt, Druckstellen, Okklusion, Ästhetik, Handhabung gezeigt, Pflegehinweise",
    gptPrompt: `KONTEXT: Prothetik Ende.
FORENSIK:
- "Funktions- und Ästhetikkontrolle: Patient zufrieden."
- "Einweisung in Handhabung (Ein-/Ausgliedern) und Pflege."
- "Aufklärung über mögliche Druckstellen und Eingewöhnungszeit."`
  },

  // 7. FUNKTION (A - Scan)
  {
    id: "V2_Funktion_A_Scan",
    title: "Schiene - Scan/Planung",
    Kategorie: "7. Funktion",
    dictationInstructions: "Befund (CMD), Muskulatur, Abformung, Bissnahme, HKP/Eigenanteil besprochen",
    gptPrompt: `KONTEXT: Schienen-Therapie Start.
FORENSIK:
- "Aufklärung über funktionelle Zusammenhänge (CMD, Bruxismus) und Folgen."
- "Therapieziel: Entlastung der Gelenke/Muskulatur, Substanzschutz."
- "Aufklärung über Kosten (Eigenanteile/Labor) und HKP erfolgt."`
  },

  // 7. FUNKTION (B - Einsetzen)
  {
    id: "V2_Funktion_B_Einsetzen",
    title: "Schiene - Eingliederung",
    Kategorie: "7. Funktion",
    dictationInstructions: "Passung, Okklusion/Führung, Instruktion/Pflege, Rechnung/Faktor besprochen",
    gptPrompt: `KONTEXT: Schienen-Abgabe.
FORENSIK:
- "Kontrolle auf spannungsfreien Sitz und gleichmäßige Kontakte."
- "Patient instruiert: Tragedauer, Pflege, Aufbewahrung."
- "Bei anhaltenden Beschwerden oder Passungenauigkeit sofortige Wiedervorstellung."`
  },

  // 8. AKUT / REP
  {
    id: "V2_Akut_Rep",
    title: "Akut / Reparatur",
    Kategorie: "8. Akut/Rep",
    dictationInstructions: "Zahn, Problem, Befund, Maßnahme, Haltbarkeit/Kosten (Rep) geklärt",
    gptPrompt: `KONTEXT: Akutbehandlung / Reparatur.
FORENSIK:
- "Symptombezogene Untersuchung und Diagnose."
- REPARATUR: "Aufklärung, dass Reparaturen an altem Zahnersatz nur begrenzter Haltbarkeit unterliegen (keine Gewährleistung) und Kosten anfallen."
- "Patient über Ursache (z.B. Prothesenstomatitis) aufgeklärt."`
  }
];

async function optimizeV2Templates() {
  console.log("🚀 Optimiere V2 Vorlagen (BEAUTIFUL TITLES)...");

  for (const t of templatesToOptimize) {
    const ref = doc(db, "Praxen", "1", "Vorlagen", t.id);
    await setDoc(ref, {
      GPTPrompt: t.gptPrompt,
      Kategorie: t.Kategorie,
      dictationInstructions: t.dictationInstructions,
      practiceDefaults: t.practiceDefaults || {}, // <--- NEU
      title: t.title,
      systemVersion: "v2"
    }, { merge: true });
    console.log(`✨ Updated: ${t.id} as "${t.title}"`);
  }

  console.log("\n🎉 V2 Vorlagen sind bereit als neuer Standard.");
  process.exit(0);
}

optimizeV2Templates().catch(console.error);
