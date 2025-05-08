import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

// Beispiel-Bausteine
const bausteine = [
  {
    id: "anaesthesie",
    titel: "Anästhesie",
    standardText: "Es wurde eine Leitungsanästhesie durchgeführt.",
    abrechnung: ["GOZ 0090"],
    kategorie: "Füllung",
    platzhalter: ["Art der Anästhesie", "Menge"],
    favoritenVon: []
  },
  {
    id: "kofferdamm",
    titel: "Kofferdamm",
    standardText: "Die Behandlung erfolgte unter Kofferdamm.",
    abrechnung: ["GOZ 2040"],
    kategorie: "Füllung",
    platzhalter: [],
    favoritenVon: []
  },
  {
    id: "matrize",
    titel: "Matrize",
    standardText: "Zur Füllung wurde eine Matrize angelegt.",
    abrechnung: ["GOZ 2080"],
    kategorie: "Füllung",
    platzhalter: [],
    favoritenVon: []
  },
  {
    id: "mehrschichttechnik",
    titel: "Mehrschichttechnik",
    standardText: "Die Füllung wurde in Mehrschichttechnik gelegt.",
    abrechnung: ["GOZ 2100"],
    kategorie: "Füllung",
    platzhalter: [],
    favoritenVon: []
  },
  {
    id: "politur",
    titel: "Politur",
    standardText: "Abschließend wurde die Füllung poliert.",
    abrechnung: ["GOZ 2130"],
    kategorie: "Füllung",
    platzhalter: [],
    favoritenVon: []
  }
];

// Beispiel-Vorlagen
const vorlagen = [
  {
    id: "fuellung_komposit",
    kategorie: "Füllung",
    titel: "Füllung Komposit",
    bausteine: ["anaesthesie", "kofferdamm", "matrize", "mehrschichttechnik", "politur"],
    prompt: "Erstelle eine strukturierte Dokumentation für eine Füllung anhand der gewählten Bausteine und des eingegebenen Textes. Berücksichtige dabei die Reihenfolge der Behandlungsschritte."
  }
];

// Import-Funktion
export async function importBausteineUndVorlagen() {
  try {
    // Bausteine importieren
    for (const baustein of bausteine) {
      await setDoc(doc(db, "Praxen", "1", "Bausteine", baustein.id), baustein);
    }
    
    // Vorlagen importieren
    for (const vorlage of vorlagen) {
      await setDoc(doc(db, "Praxen", "1", "Vorlagen", vorlage.id), vorlage);
    }
    
    console.log("Import erfolgreich!");
    return true;
  } catch (error) {
    console.error("Fehler beim Import:", error);
    return false;
  }
} 