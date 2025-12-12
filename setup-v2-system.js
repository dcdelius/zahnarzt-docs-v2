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

// Definition der neuen V2 Vorlagen Struktur
const v2Templates = [
  // 1. CHECK-UP
  {
    id: "V2_01_Checkup",
    title: "01 Check-up & Beratung",
    category: "1. Check-up",
    systemVersion: "v2",
    text: `**BEFUND & STATUS:**
• Schleimhaut: [SCHLEIMHAUT_BEFUND] (o.B. / Auffälligkeiten)
• Zähne: [ZAHNSTATUS_KURZ] (konservierend/prothetisch versorgt)
• PSI/Parodont: [PSI_CODES], [PARO_BEFUND]

**DIAGNOSE & BERATUNG:**
• Diagnose: [DIAGNOSE_HAUPT] (z.B. Kariesfrei / Karies an...)
• Beratung: [BERATUNG_INHALT] (z.B. HKP, PZR, Füllungen)
• Therapieplan: [THERAPIE_PLANUNG]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• BEMA/GOZ: 01 / Ä1
• Zusatz: [PSI / Mu / VIPR]`,
    gptPrompt: `KONTEXT: Routine-Kontrolle (01).
ZIEL: Defizite erkennen & Folgetermine generieren.

IMPLIZITE STANDARDS:
- "Schleimhaut/Weichgewebe o.B." (wenn nicht anders diktiert)
- "Eingehende Beratung über Mundhygiene und Sanierungsbedarf."

TRIGGER:
- Bei "Zahnstein" oder "Beläge" -> PZR/Zst empfehlen.
- Bei "Karies" -> Füllungstherapie planen.`
  },

  // 2. KONS
  {
    id: "V2_Kons_Fuellung",
    title: "Füllungstherapie",
    category: "2. Kons",
    systemVersion: "v2",
    text: `**INDIKATION:**
• Zahn: [ZAHN]
• Diagnose: [DIAGNOSE] (z.B. Karies profunda, Fraktur)
• Vitalität: [VIPR]

**THERAPIE:**
• Anästhesie: [ANAESTHESIE]
• Exkavation: [EXKAVATION_ART] (komplett/cp), [KARIESDETEKTOR]
• Vorbereitung: [TROCKENLEGUNG], [MATRIZE]
• Füllung: [MATERIAL_SYSTEM] (Adhäsiv, Flow, Composite), [SCHICHTTECHNIK]
• Ausarbeitung: [POLITUR], [OKKLUSION]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Positionen: [FUELLUNG_FLAECHEN], [BMF], [ANAESTHESIE]
• Faktoren: [ERSCHWERNISSE]`,
    gptPrompt: `KONTEXT: Füllungstherapie (Kons).

IMPLIZITE STANDARDS:
- "Kariesexkavation vollständig, kariesfrei."
- "Adhäsivtechnik lege artis (Ätzen, Primen, Bonden)."
- "Okklusions- & Kontaktpunktkontrolle."

LOGIK:
- Flächenerkennung (mod, od, ...) -> korrekte Flächenzahl.
- "Tief" oder "Blutung" -> bMF / Faktor.`
  },

  // 3. ENDO (A, B, C)
  {
    id: "V2_Endo_A_Trepanation",
    title: "A) Trepanation (Start)",
    category: "3. Endo",
    systemVersion: "v2",
    text: `**DIAGNOSE (AKUT):**
• Zahn: [ZAHN]
• Symptomatik: [SCHMERZ_ART] (pochend, Aufbiss, heiß/kalt)
• Befund: [VIPR_PERKUSSION], [ROENTGEN_BEFUND]
• Diagnose: [DIAGNOSE_ENDO] (z.B. Pulpitis irreversibel, apikale Parodontitis)

**THERAPIE (NOTERÖFFNUNG):**
• Anästhesie: [ANAESTHESIE]
• Trepanation: [ZUGANG], [BLUTUNG_PUS]
• Kanal-Eingänge: [DARSTELLUNG], [SONDIERUNG]
• Maßnahme: [VITALEXSTIRPATION_ODER_MORTAL], [SPUELUNG]
• Einlage: [MEDIKAMENT]
• Verschluss: [PROV_VERSCHLUSS]

**AUFKLÄRUNG:**
• [AUFKLAERUNG_WKB] (Erhaltunswürdigkeit, Risiken, Alternativen)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Trepanation, VitE/Dev, bMF, Anästhesie, Rö
• Zuschläge: [NOTDIENST_ETC]`,
    gptPrompt: `KONTEXT: Endo-Start (Trepanation).
FOKUS: Schmerzbeseitigung & Diagnostik.

IMPLIZITE STANDARDS:
- "Aufklärung über Wurzelkanalbehandlung als Zahnerhaltungsversuch."
- "Kofferdam/Trockenlegung."

LOGIK:
- Wenn "Vital" -> VitE (Vitalexstirpation).
- Wenn "Tot/Gangrän" -> Gangränbehandlung / Trepanation.`
  },
  {
    id: "V2_Endo_B_Aufbereitung",
    title: "B) Aufbereitung (Med)",
    category: "3. Endo",
    systemVersion: "v2",
    text: `**VERLAUF:**
• Zahn: [ZAHN]
• Symptomatik: [BESCHWERDEN_SEIT_LETZTEM_MAL]

**THERAPIE (AUFBEREITUNG):**
• Anästhesie: [ANAESTHESIE_OPTIONAL]
• Zugang: [PROV_ENTFERNT], [TROCKENLEGUNG]
• Längenmessung: [MESSUNG_METHODE] (Röntgen/Apex) -> [LAENGEN_WERTE]
• Aufbereitung: [FEILENSYSTEM], [ISO_GROESSE], [SPUELPROTOKOLL]
• Einlage: [MEDIKAMENT_NEU]
• Verschluss: [PROV_VERSCHLUSS]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: WK (Aufbereitung), Med (Einlage), Längenmessung (Phys/Rö)`,
    gptPrompt: `KONTEXT: Endo-Zwischensitzung (Aufbereitung).
FOKUS: Längenmessung & Desinfektion.

IMPLIZITE STANDARDS:
- "Reichlich Spülung mit NaOCl/EDTA/CHX."
- "Gängigkeit aller Kanäle geprüft."

LOGIK:
- Erfasse Kanal-Längen (z.B. "mb 21mm, db 20mm").
- Wenn "Apex-Locator" -> Längenmessung (Phys).`
  },
  {
    id: "V2_Endo_C_WF",
    title: "C) Wurzelfüllung (Ende)",
    category: "3. Endo",
    systemVersion: "v2",
    text: `**VERLAUF:**
• Zahn: [ZAHN]
• Symptomatik: [BESCHWERDENFREIHEIT_CHECK]
• Kanalzustand: [TROCKEN_GERUCHSLOS]

**THERAPIE (FÜLLUNG):**
• Anästhesie: [ANAESTHESIE_OPTIONAL]
• Vorbereitung: [SPUELUNG_ABSCHLUSS], [TROCKNUNG]
• Masterpoint: [MASTERPOINT_CHECK], [ROENTGEN_MESS]
• Wurzelfüllung: [METHODE] (z.B. lat. Kondensation), [SEALER], [GUTTAPERCHA]
• Verschluss: [ADHAESIVER_VERSCHLUSS_CHECK]
• Röntgen: [KONTROLLAUFNAHME]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: WF (Wurzelfüllung), Rö-Kontrolle, Adhäsiver Verschluss
• Faktor: [SCHWIERIGKEITEN]`,
    gptPrompt: `KONTEXT: Endo-Abschluss (WF).
FOKUS: Dichtigkeit & Dokumentation.

IMPLIZITE STANDARDS:
- "Kanäle trocken und geruchlos."
- "Wandständige Wurzelfüllung bis apikale Konstriktion."
- "Röntgenkontrolle zeigt ordnungsgemäße WF."`
  },

  // 4. CHIRURGIE
  {
    id: "V2_Chirurgie_Ex",
    title: "Extraktion / Ost",
    category: "4. Chirurgie",
    systemVersion: "v2",
    text: `**INDIKATION:**
• Zahn: [ZAHN]
• Grund: [DIAGNOSE] (z.B. nicht erhaltungsfähig, frakturiert)
• Röntgen: [ROENTGEN_CHECK]

**THERAPIE (OP):**
• Anästhesie: [ANAESTHESIE]
• Luxation: [INSTRUMENTE] (Hebel, Zange, Periotom)
• Osteotomie: [OST_NOTWENDIGKEIT] (Aufklappung, Knochenfräsen, Trennen)
• Wundversorgung: [CURETTAGE], [NAHT], [SCHWAMM]
• Kontrolle: [KOAGEL], [VOLLSTAENDIGKEIT]

**NACHSORGE:**
• [VERHALTENSREGELN] (Kühlen, nicht spülen)
• [REZEPT] (IBU/Antibiotika)

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Ex / Ost-1 / Ost-2
• Zuschläge: [OP_ZUSCHLAG]`,
    gptPrompt: `KONTEXT: Chirurgie (Extraktion).
FOKUS: Forensik & Schwierigkeitsgrad.

LOGIK:
- Wenn "gehebelt/Zange" -> Einfache Ex (X1/X2).
- Wenn "aufgeklappt", "Knochen wegnehmen", "trennen" -> Osteotomie (Ost1/Ost2).
- "Scharfer Löffel" -> Curettage (Zy1 wenn Zyste).

IMPLIZITE STANDARDS:
- "Wurzel auf Vollständigkeit geprüft."
- "Alveole curettiert, blutgefüllt."
- "Aufklärung und Verhaltensempfehlungen erfolgt."`
  },

  // 5. ZE-FEST (A, B)
  {
    id: "V2_ZE_Fest_A_Praep",
    title: "A) Präparation (Krone/Brücke)",
    category: "5. ZE-Fest",
    systemVersion: "v2",
    text: `**STATUS & PLAN:**
• Zähne: [ZAEHNE]
• Versorgung: [ART_DES_ZE] (Krone/Brücke/Veneer)

**PRÄPARATION:**
• Anästhesie: [ANAESTHESIE]
• Aufbau: [AUFBAUFUELLUNG_STIFT] (Exkavation, Adhäsiv, Stumpfaufbau)
• Beschliff: [PRAEP_FORM] (Hohlkehle/Stufe), [SUBGINGIVAL_CHECK]
• Abformung: [RETRAKTION], [ABFORMUNG_ART] (Scan/Abdruck)
• Provisorium: [PROVI_ART], [ZEMENT], [OKKLUSION]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Stumpfaufbau, Präparation (BEMA 20/GOZ 2200/5000), Provi, Abformung`,
    gptPrompt: `KONTEXT: ZE-Präparation.
FOKUS: Aufbaufüllung & Präparationsform.

LOGIK:
- Suche immer nach "Aufbaufüllung" (BEMA 13/GOZ 2180) -> Revenue Booster!
- "Retraktionsfaden" -> wichtig für GOZ.
- "Scan" -> Digitale Abformung.`
  },
  {
    id: "V2_ZE_Fest_B_Einsetzen",
    title: "B) Einsetzen (Krone/Brücke)",
    category: "5. ZE-Fest",
    systemVersion: "v2",
    text: `**EINPROBE:**
• Provi entfernt: [ZUSTAND_STUMPF] (gesäubert)
• Einprobe ZE: [RANDS_KONT_OKKL] (Randschluss, Kontaktpunkt, Okklusion)

**BEFESTIGUNG:**
• Vorbehandlung: [KONDITIONIERUNG] (Zahn & ZE)
• Zementierung: [MATERIAL] (adhäsiv/konventionell)
• Ausarbeitung: [UEBERSCHUESSE], [FINIERUNG]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Eingliederung, Adhäsive Befestigung (2197)`,
    gptPrompt: `KONTEXT: ZE-Einsetzen.
FOKUS: Befestigungsart.

LOGIK:
- Material-Check: "Panavia/Variolink" -> Adhäsiv (2197).
- Material-Check: "Ketac/Zement" -> Konventionell.`
  },

  // 6. ZE-MOBIL (A, B, C)
  {
    id: "V2_ZE_Mobil_A_Start",
    title: "A) Abdruck/Präp (Start)",
    category: "6. ZE-Mobil",
    systemVersion: "v2",
    text: `**PLANUNG:**
• Art: [PROTHESEN_ART] (Total/Teleskop/Modellguss)
• Kiefer: [KIEFER]

**MASSNAHMEN:**
• Vorbereitung: [PRAEP_TELESKOPE_ODER_ANKER]
• Abformung: [ABFORMUNG_ART] (Situ/Funktion/Überabformung)
• Bissnahme: [BISSNAHME_GROB]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Abformung, Bissnahme, Planungsmodelle`,
    gptPrompt: `KONTEXT: ZE-Herausnehmbar Start.
FOKUS: Planung & Erstabformung.`
  },
  {
    id: "V2_ZE_Mobil_B_Funktion",
    title: "B) Biss/Wachs/Gerüst",
    category: "6. ZE-Mobil",
    systemVersion: "v2",
    text: `**EINPROBE:**
• Art: [EINPROBE_ART] (Wachswall/Zähne/Gerüst)
• Funktion: [BISS_CHECK], [PHONETIK], [AESTHETIK]
• Korrekturen: [AENDERUNGEN] (z.B. Farbe, Mittellinie)
• Weiteres Vorgehen: [NEUE_BISSNAHME_ODER_FERTIGSTELLUNG]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Funktionsabformung, Stützstift, Zwischeneinprobe`,
    gptPrompt: `KONTEXT: ZE-Herausnehmbar Zwischenschritt.
FOKUS: Funktion & Ästhetik.`
  },
  {
    id: "V2_ZE_Mobil_C_Fertig",
    title: "C) Fertigstellung",
    category: "6. ZE-Mobil",
    systemVersion: "v2",
    text: `**EINGLIEDERUNG:**
• Kontrolle: [PASSUNG_BASIS], [HALT], [OKKLUSION]
• Druckstellen: [KORREKTUREN]
• Instruktion: [HANDHABUNG_PFLEGE]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Eingliederung Prothese`,
    gptPrompt: `KONTEXT: ZE-Herausnehmbar Ende.
FOKUS: Passung & Patientenzufriedenheit.`
  },

  // 7. FUNKTION (A, B)
  {
    id: "V2_Funktion_A_Scan",
    title: "A) Scan/Abdruck (Schiene/Aligner)",
    category: "7. Funktion",
    systemVersion: "v2",
    text: `**INDIKATION:**
• Befund: [CMD_BEFUND] (Knacken, Abrasion, Schmerzen)
• Plan: [SCHIENE_ODER_ALIGNER]

**MASSNAHMEN:**
• Abformung: [SCAN_ODER_ALGINAT] (OK/UK)
• Bissnahme: [BISSREGISTRAT]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Modelle, Bissnahme, FAL`,
    gptPrompt: `KONTEXT: Funktion Start.
FOKUS: Diagnostik & Modelle.`
  },
  {
    id: "V2_Funktion_B_Einsetzen",
    title: "B) Einsetzen (Schiene/Aligner)",
    category: "7. Funktion",
    systemVersion: "v2",
    text: `**EINGLIEDERUNG:**
• Apparatur: [SCHIENE_ALIGNER]
• Passung: [SITZ], [SPANNUNG]
• Okklusion: [EINSCHLEIFEN] (Eckzahnführung/Frontzahnführung)
• Instruktion: [TRAGEZEIT_PFLEGE]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: Eingliederung Aufbissbehelf`,
    gptPrompt: `KONTEXT: Funktion Ende.
FOKUS: Einschleifen & Führung.`
  },

  // 8. AKUT / REP
  {
    id: "V2_Akut_Rep",
    title: "Akut / Reparatur / Sonstiges",
    category: "8. Akut/Rep",
    systemVersion: "v2",
    text: `**ANLASS:**
• Beschwerde/Grund: [GRUND] (z.B. Druckstelle, Schmerzen, Krone locker, Prothese gebrochen)
• Befund: [LOKALBEFUND]

**MASSNAHMEN:**
• Therapie: [MASSNAHME] (z.B. Einschleifen, Rezementieren, Medikament, Unterfütterung)
• Ergebnis: [ZUSTAND_NACH_BEHANDLUNG]

---------------------------------------------------
**ABRECHNUNGS-CHECK:**
• Leistungen: [SK_REZEPT], [WIEDERBEFESTIGUNG], [REPARATUR], [DRUCKSTELLE]`,
    gptPrompt: `KONTEXT: Akut & Reparaturen.
FOKUS: Problem & Lösung.

LOGIK:
- "Krone locker" -> Rezementieren (Wiederbefestigung).
- "Druckstelle" -> sK (Beseitigung Prothesendruckstelle).
- "Schmerzen" -> Symptomatische Behandlung / Med.`
  }
];

async function setupV2Templates() {
  console.log("🚀 Starte V2 Vorlagen Setup...");
  
  // 1. Kategorien definieren (mit Farben)
  const categories = [
    { id: "1. Check-up", name: "1. Check-up", color: "blue" },
    { id: "2. Kons", name: "2. Kons", color: "green" },
    { id: "3. Endo", name: "3. Endo", color: "purple" },
    { id: "4. Chirurgie", name: "4. Chirurgie", color: "red" },
    { id: "5. ZE-Fest", name: "5. ZE-Fest", color: "yellow" },
    { id: "6. ZE-Mobil", name: "6. ZE-Mobil", color: "orange" },
    { id: "7. Funktion", name: "7. Funktion", color: "cyan" },
    { id: "8. Akut_Rep", name: "8. Akut/Rep", color: "gray" }
  ];

  console.log("📁 Lege Kategorien an...");
  for (const cat of categories) {
    await setDoc(doc(db, "Praxen", "1", "Kategorien", cat.id), cat, { merge: true });
  }

  console.log("📄 Lege V2 Vorlagen an...");
  for (const t of v2Templates) {
    // Fix category ID reference for Akut/Rep
    const catId = t.category === "8. Akut/Rep" ? "8. Akut_Rep" : t.category;
    
    await setDoc(doc(db, "Praxen", "1", "Vorlagen", t.id), {
      Kategorie: t.category, // Display Name behalten wir so, oder wollen wir konsistent die ID nutzen? 
      // Besser wir nutzen die ID auch als Kategorie-Feld, damit das Filtern klappt.
      // Aber im Frontend nutzen wir den Namen.
      // Warte, das Frontend nutzt t.Kategorie zum Filtern. 
      // Wenn wir die ID ändern, müssen wir auch das Feld im Dokument anpassen, 
      // damit es zur Kategorie-ID passt ODER das Frontend muss mappen.
      // Einfachste Lösung: Wir speichern den String "8. Akut/Rep" als Kategorie-Feld, 
      // aber die ID des Kategorie-Dokuments ist "8. Akut_Rep".
      // Das Frontend lädt Kategorien und Vorlagen getrennt.
      
      Kategorie: t.category, 
      GPTPrompt: t.gptPrompt,
      Text: t.text,
      systemVersion: "v2",
      users: ["all"]
    }, { merge: true });
    console.log(`✅ ${t.title}`);
  }

  console.log("\n🎉 Fertig! V2 System ist initialisiert.");
  process.exit(0);
}

setupV2Templates().catch(console.error);

