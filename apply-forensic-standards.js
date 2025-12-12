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

const forensicUpdates = [
  // 1. CHECK-UP: Krebsvorsorge & Status
  {
    id: "V2_01_Checkup",
    text: `**BEFUND & STATUS:**
• Schleimhaut: [SCHLEIMHAUT_BEFUND] (Standard: o.B. / blande)
• Lymphknoten: [LYMPHKNOTEN] (Standard: nicht palpabel)
• Zähne: [ZAHNSTATUS_KURZ] (konservierend/prothetisch versorgt, kariesfrei)
• PSI/Parodont: [PSI_CODES]

**DIAGNOSE & BERATUNG:**
• Diagnose: [DIAGNOSE_HAUPT]
• Beratung: [BERATUNG_INHALT] (Mundhygiene, Therapiebedarf)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• BEMA/GOZ: 01 / Ä1
• Zusatz: [PSI_04]`,
    gptPrompt: `KONTEXT: Routine-Kontrolle (01).
FORENSIK-MODUS: Defensiv dokumentieren.

IMPLIZITE STANDARDS (Wenn NICHTS diktiert wird):
- Schleimhaut -> "Schleimhaut und Weichgewebe ohne pathologischen Befund."
- Lymphknoten -> "Extraorale Lymphknoten unauffällig."
- Zähne -> "Gebiss saniert, keine akute Karies erkennbar."

LOGIK:
- Nur wenn "Auffälligkeit" diktiert wird, weiche vom Standard ab.
- PSI Werte eintragen wenn diktiert.`
  },

  // 2. KONS: Vitalität & Aufklärung
  {
    id: "V2_Kons_Fuellung",
    text: `**INDIKATION:**
• Zahn: [ZAHN]
• Diagnose: [DIAGNOSE] (z.B. Karies Dentinprofunda)
• Sensibilität: [VIPR] (Standard: positiv)
• Aufklärung: [AUFKLAERUNG] (Risiken, Kosten, Alternativen)

**THERAPIE:**
• Anästhesie: [ANAESTHESIE]
• Exkavation: [EXKAVATION_ART] (Karies vollständig entfernt)
• Vorbereitung: [TROCKENLEGUNG], [MATRIZE]
• Füllung: [MATERIAL_SYSTEM] (Adhäsivtechnik, Mehrschicht)
• Ausarbeitung: [POLITUR], [OKKLUSION]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Positionen: [FUELLUNG_FLAECHEN], [BMF], [ANAESTHESIE]`,
    gptPrompt: `KONTEXT: Füllungstherapie.
FORENSIK-MODUS: Risiken minimieren.

IMPLIZITE STANDARDS (Zwingend setzen):
1. VITALITÄT: "Sensibilitätsprüfung (Kälte) vor Anästhesie: positiv." (außer Zahn ist WF).
2. AUFKLÄRUNG: "Aufklärung über Behandlungsablauf, mögliche Risiken (Pulpanähe) und Kostenalternativen erfolgt."
3. EXKAVATION: "Karies vollständig exkaviert, Sondierung hart."
4. KONTROLLE: "Okklusion und Kontaktpunkte geprüft und für gut befunden."

LOGIK:
- Wenn "tief" diktiert -> Erwähne "Cp / Caries profunda Behandlung".`
  },

  // 3. ENDO A (Start): Indikation
  {
    id: "V2_Endo_A_Trepanation",
    text: `**DIAGNOSE (AKUT):**
• Zahn: [ZAHN]
• Anamnese: [SCHMERZ_ART]
• Befund: [VIPR_PERKUSSION]
• Röntgen: [ROENTGEN_BEFUND] (Indikation zur WKB)
• Aufklärung: [AUFKLAERUNG_WKB]

**THERAPIE:**
• Anästhesie: [ANAESTHESIE]
• Trepanation: [ZUGANG], [PULPA_ZUSTAND] (vital/devital/eitrig)
• Maßnahme: [VITALEXSTIRPATION_ODER_MORTAL]
• Spülung/Einlage: [SPUELUNG], [MEDIKAMENT]
• Verschluss: [PROV_VERSCHLUSS] (dicht)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Trepanation, VitE/Dev, Röntgen`,
    gptPrompt: `KONTEXT: Endo-Start.
FORENSIK-MODUS: Indikation rechtfertigen.

IMPLIZITE STANDARDS:
1. RÖNTGEN: "Röntgenbild zeigt apikale Aufhellung/tiefe Karies -> Indikation zur WKB gestellt."
2. AUFKLÄRUNG: "Umfassende Aufklärung über Zahnerhalt vs. Extraktion, Risiken (Fraktur, Misserfolg) und Kosten."
3. ZUGANG: "Darstellung aller Kanaleingänge."`
  },

  // 3. ENDO C (WF): Trockenheit & Kontrolle
  {
    id: "V2_Endo_C_WF",
    text: `**VERLAUF:**
• Zahn: [ZAHN]
• Symptomatik: [BESCHWERDENFREIHEIT_CHECK] (Standard: beschwerdefrei)
• Kanalzustand: [KANAL_CHECK] (Standard: trocken, geruchlos)

**THERAPIE:**
• Vorbereitung: [SPUELUNG_ABSCHLUSS]
• Wurzelfüllung: [METHODE_MATERIAL] (wandständig, bis Apex)
• Verschluss: [ADHAESIVER_VERSCHLUSS_CHECK]
• Röntgen: [KONTROLLAUFNAHME] (WF-Kontrolle)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: WF, Rö-Kontrolle`,
    gptPrompt: `KONTEXT: Wurzelfüllung.
FORENSIK-MODUS: Qualitätssicherung.

IMPLIZITE STANDARDS (Vorraussetzung für WF):
1. SYMPTOME: "Patient ist beschwerdefrei."
2. KANÄLE: "Kanäle sind trocken und geruchlos." (MUSS stehen!).
3. QUALITÄT: "Wurzelfüllung wandständig und blasenfrei bis zur physiologischen Apikalregion."
4. RÖNTGEN: "Röntgenkontrolle zeigt korrekte Länge und Homogenität."`
  },

  // 4. CHIRURGIE: Vollständigkeit & Verhalten
  {
    id: "V2_Chirurgie_Ex",
    text: `**INDIKATION:**
• Zahn: [ZAHN]
• Grund: [INDIKATION] (z.B. nicht erhaltungsfähig)
• Aufklärung: [RISIKO_AUFKLAERUNG]

**OP-BERICHT:**
• Anästhesie: [ANAESTHESIE]
• Luxation: [INSTRUMENTE]
• Alveole: [CURETTAGE_CHECK] (Standard: curettiert, kontrolliert)
• Vollständigkeit: [WURZEL_CHECK] (Standard: vollständig entfernt)
• Versorgung: [NAHT_SCHWAMM]

**NACHSORGE:**
• [VERHALTENSREGELN] (Standard: aufgeklärt, Merkblatt)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Ex / Ost`,
    gptPrompt: `KONTEXT: Extraktion.
FORENSIK-MODUS: Komplikationen ausschließen.

IMPLIZITE STANDARDS:
1. WURZEL: "Zahn und Wurzeln auf Vollständigkeit überprüft: vollständig entfernt." (Kritisch!).
2. ALVEOLE: "Alveole curettiert, scharfe Knochenkanten geglättet."
3. AUFKLÄRUNG POST-OP: "Aufklärung über Verhalten (kein Spülen, Kühlen, Schmerzmittel) erfolgt."`
  },

  // 5. ZE-FEST B (Einsetzen): Zementreste
  {
    id: "V2_ZE_Fest_B_Einsetzen",
    text: `**EINPROBE:**
• [STUMPF_ZUSTAND]
• [PASSUNG_CHECK] (Randschluss, Kontakt, Okklusion)

**BEFESTIGUNG:**
• Methode: [BEFESTIGUNGS_ART]
• Ausarbeitung: [ZEMENTRESTE_CHECK] (Standard: vollständig entfernt)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistung: Eingliederung`,
    gptPrompt: `KONTEXT: ZE Einsetzen.
FORENSIK-MODUS: Reizfreiheit garantieren.

IMPLIZITE STANDARDS:
1. RANDSCHLUSS: "Randschluss mit Sonde zirkulär geprüft: spaltfrei."
2. ZEMENTRESTE: "Sorgfältige Entfernung aller Zementüberschüsse (insb. approximal/subgingival) durchgeführt."
3. OKKLUSION: "Okklusion in Statik und Dynamik geprüft."`
  }
];

async function applyForensicStandards() {
  console.log("🚀 Wende forensische Standards auf Vorlagen an...");

  for (const t of forensicUpdates) {
    const ref = doc(db, "Praxen", "1", "Vorlagen", t.id);
    // Wir aktualisieren Text und Prompt, behalten aber andere Felder bei
    await setDoc(ref, {
      Text: t.text,
      GPTPrompt: t.gptPrompt,
      systemVersion: "v2"
    }, { merge: true });
    console.log(`⚖️ Forensik-Upgrade: ${t.id}`);
  }

  console.log("\n🎉 Alle kritischen Vorlagen sind nun forensisch abgesichert.");
  process.exit(0);
}

applyForensicStandards().catch(console.error);






