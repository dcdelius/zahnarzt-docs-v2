/**
 * Utility function to build GPT prompts for dental documentation
 * Consolidates duplicate prompt building logic from Dashboard.jsx
 */

/**
 * Builds system and user prompts for GPT-5-mini based on template, input, and configuration
 * @param {Object} params - Configuration object
 * @param {Object} params.template - Template object from Firebase
 * @param {string} params.inputText - User input text or transcribed dictation
 * @param {Array} params.bausteine - Array of active building blocks
 * @param {Array} params.allBausteine - Array of all available building blocks
 * @returns {Object} { systemPrompt, userPrompt }
 */
export function buildGPTPrompts({ template, inputText, bausteine, allBausteine }) {
  if (!template) {
    throw new Error('Template is required');
  }
  
  if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
    throw new Error('Input text is required and must be a non-empty string');
  }
  
  if (!Array.isArray(bausteine)) {
    console.warn('bausteine is not an array, using empty array');
    bausteine = [];
  }
  
  if (!Array.isArray(allBausteine)) {
    console.warn('allBausteine is not an array, using empty array');
    allBausteine = [];
  }

  // Extract template fields (handle both lowercase and uppercase keys)
  const templatePrompt = template.prompt || template.Prompt || "";
  const templateText = template.Text || template.text || "";
  const templateMaterial = template.Material || template.material || "";
  const templateName = template.id || "";
  const templateCategory = template.Kategorie || "";
  const systemInstructions = template.systemInstructions || "";
  const exampleOutput = template.exampleOutput || "";

  // Standard fallbacks
  const defaultExampleOutput = `**1) Leistungsübersicht (Abrechnung)**

Füllung Zahn 37 - OD - 2-flächig - 90,00 €
Intraligamentäre Anästhesie
Isolation mittels Kofferdamm
Matrize und Keil
Mehrschichttechnik bei Kompositfüllung
Politur der Füllung

**2) Behandlungsdokumentation (Praxisakte)**

Patient kommt zur Füllung an Zahn 37, Flächen: OD, 2-flächig.
Klinische Untersuchung zeigt kariöse Läsion an Zahn 37 OD.
Vitalitätsprüfung mit Kältespray positiv.
Röntgenologisch zeigt sich kariöse Läsion im Dentin.
Vor- und Nachteile der Kompositfüllung besprochen, Patient einverstanden.
Kosten: 90,00 € pro Zahn, Farbe: A2.
Intraligamentäre Anästhesie mit 1 Amp. Ultracain DS 1,7 ml durchgeführt.
Die Behandlung erfolgte unter Kofferdamm.
Zur Füllung wurde eine Matrize angelegt.
Keil und Spannring gesetzt.
Karies vollständig exkaviert.
Kavität mit Adhäsivtechnik vorbereitet.
Trockenlegung in SÄT durchgeführt.
Die Füllung wurde in Mehrschichttechnik gelegt.
Füllung mit Gaenial Flow A2 und Tetric EvoCeram A2 schichtweise gelegt und lichthärtend polymerisiert.
Anatomische Ausformung hergestellt, Kontaktpunkt wiederhergestellt.
Überschüsse entfernt, Okklusion mit Artikulationspapier geprüft und eingeschliffen.
Abschließend wurde die Füllung poliert.
Duraphat auf Füllung und umliegende Zähne appliziert.
Postoperative Hinweise gegeben: 2 Stunden Nahrungspause, keine harten Speisen heute.
Kontrolltermin in 4 Wochen vereinbart.
Patient verließ die Praxis in stabilem Zustand.`;

  const defaultSystemInstructions = `FORMAT-STRUKTUR (IMMER EINHALTEN):
Die Dokumentation MUSS in zwei Teile unterteilt sein:

1) Leistungsübersicht (Abrechnung)
- Verwende die KOMPLETTE Struktur aus der Vorlage
- Relevant für die Abrechnung
- Kompakt, sachlich, ohne Fließtext
- Format: "Leistung" pro Zeile (ohne Kosten)
- NUR die Füllungstherapie hat Kosten: "Füllung Zahn X - Flächen - Kosten"
- Einzelleistungen wie Anästhesie, Kofferdamm etc. werden OHNE Kosten aufgeführt (werden von Krankenkasse übernommen)
- Gesamtbetrag nur bei mehreren Füllungen
- Fülle Platzhalter mit diktierte Informationen

2) Behandlungsdokumentation (Praxisakte)
- Verwende die KOMPLETTE Struktur aus der Vorlage
- Detaillierter Ablauf mit einzelnen Punkten oder Sätzen
- Forensisch wasserdicht
- Jede Zeile = eine abgeschlossene Handlung
- Chronologische Reihenfolge
- Vollständige Sätze, aber kompakt
- Fülle Platzhalter mit diktierte Informationen

KRITISCHE REGELN:
1. Verwende die KOMPLETTE Vorlagen-Struktur
2. Fülle Platzhalter ([ZAHL], [ja/nein], [BETRAG], [MATERIAL], etc.) mit diktierte Informationen
3. Wenn ein Platzhalter nicht im Diktat steht, lasse ihn WEG oder verwende Standard-Informationen
4. Verwende IMMER die exakt gleichen Formulierungen aus den Bausteinen
5. Keine Synonyme oder alternative Formulierungen
6. Gleiche Satzstruktur und Reihenfolge bei jeder Dokumentation
7. Gleiche Fachbegriffe und Terminologie
8. Keine kreativen Variationen - nur exakte Wiederholung der Formulierungen
9. IMMER die zweiteilige Struktur einhalten (Leistungsübersicht + Behandlungsdokumentation)
10. KEINE Halluzinationen - nur diktierte Informationen in Platzhalter einsetzen
11. ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt (z.B. "27" statt "2.7", "36" statt "3.6", "11" statt "1.1")`;

  const defaultPrompt = `WICHTIG - VORLAGE VOLLSTÄNDIG VERWENDEN:
- Verwende die KOMPLETTE Vorlagen-Struktur
- Fülle Platzhalter ([ZAHL], [ja/nein], [BETRAG], [MATERIAL], etc.) mit Informationen aus dem Diktat
- Wenn ein Platzhalter im Diktat nicht erwähnt wird, lasse den Platzhalter WEG oder verwende die Standard-Informationen aus der Vorlage
- Verwende die Materialien aus der Vorlage automatisch
- KEINE Halluzinationen: Nur Platzhalter mit diktierte Informationen füllen, nichts erfinden
- Die gesamte Vorlagen-Struktur muss erhalten bleiben
- ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt (z.B. "27" statt "2.7", "36" statt "3.6", "11" statt "1.1")`;

  // Build system prompt
  const systemPrompt = (templatePrompt || defaultPrompt)
    ? `Du bist ein zahnärztlicher Dokumentationsassistent. WICHTIG: Verwende die KOMPLETTE Vorlagen-Struktur und fülle Platzhalter mit diktierte Informationen. KEINE Halluzinationen - nur diktierte Informationen verwenden.

Vorlage: "${templateName}" (${templateCategory})
Template-Anweisungen:
${templatePrompt || defaultPrompt}

${systemInstructions || defaultSystemInstructions}

${exampleOutput || defaultExampleOutput ? `BEISPIEL-FORMAT (als Referenz für die Struktur):
${exampleOutput || defaultExampleOutput}` : ''}`
    : `Du bist ein zahnärztlicher Dokumentationsassistent. Verwende die KOMPLETTE Vorlagen-Struktur und fülle Platzhalter mit diktierte Informationen.

Erstelle eine konsistente Dokumentation für "${templateName}" (${templateCategory}). 

${systemInstructions || defaultSystemInstructions}

Verwende IMMER die gleichen Formulierungen und Strukturen aus der Vorlage.`;

  // Build baustein texts
  const aktiveBausteineData = bausteine
    .map(id => allBausteine.find(b => b.id === id))
    .filter(Boolean);
  const bausteinTexte = aktiveBausteineData
    .map(b => typeof b.standardText === 'string' ? b.standardText : '')
    .filter(Boolean)
    .join("\n");

  // Build user prompt
  const userPrompt = `WICHTIG - VORLAGE VOLLSTÄNDIG VERWENDEN:
- Verwende die KOMPLETTE Vorlagen-Struktur
- Fülle Platzhalter mit diktierte Informationen
- KEINE Halluzinationen - nur diktierte Informationen verwenden

${templateText ? `VORLAGEN-STRUKTUR (verwende diese KOMPLETTE Struktur und fülle Platzhalter mit diktierte Informationen):
${templateText}

WICHTIG: 
- Verwende die KOMPLETTE Vorlagen-Struktur - ALLE Teile der Vorlage müssen verwendet werden
- Fülle Platzhalter wie [ZAHL], [ja/nein], [BETRAG], [MATERIAL], [FLÄCHEN], [FARBE] etc. mit Informationen aus dem Diktat
- Wenn ein Platzhalter im Diktat nicht erwähnt wird, lasse nur den Platzhalter WEG, aber behalte ALLEN anderen Text aus der Vorlage
- Verwende ALLEN Text aus der Vorlage, auch Abschnitte ohne Platzhalter
- Die gesamte Struktur der Vorlage muss erhalten bleiben - NICHTS weglassen

` : ''}${templateMaterial ? `VERWENDETES MATERIAL (aus Vorlage - automatisch verwenden):
${templateMaterial}

WICHTIG - SMART MATERIAL-VERWENDUNG:
- Verwende die Materialien aus der Vorlage automatisch und intelligent
- Wenn [MATERIAL] in der Vorlage steht, ersetze es mit "${templateMaterial}"
- Wenn im Diktat andere Materialien genannt werden, verwende diese stattdessen
- Materialien SMART verwenden:
  * In "Leistungsübersicht": Materialien in der richtigen Form erwähnen (z.B. "Mehrschichttechnik bei Komposit-Füllung")
  * In "Behandlungsdokumentation": Materialien im richtigen Kontext verwenden (z.B. "Füllung mit ${templateMaterial.split(',')[0].trim()} schichtweise gelegt")
  * Erkenne automatisch, zu welchem Teil der Vorlage das Material gehört und verwende es entsprechend
  * Wenn Materialien im Diktat erwähnt werden, verwende diese mit vollständigen Produktnamen (z.B. "Gaenial Flow A3, Tetric EvoCeram A3")

` : ''}${bausteinTexte ? `VERFÜGBARE FORMULIERUNGEN (verwende diese exakten Formulierungen):
${bausteinTexte}

WICHTIG: Verwende diese exakten Formulierungen aus den Bausteinen, wenn sie zur Vorlage passen.

` : ''}DIKTIERTER TEXT (verwende diese Informationen zum Füllen der Platzhalter):
${inputText}

KRITISCHE REGELN:
1. Verwende die KOMPLETTE Vorlagen-Struktur - ALLE Teile der Vorlage müssen verwendet werden
2. Fülle Platzhalter mit diktierte Informationen
3. Wenn Platzhalter nicht im Diktat stehen, lasse nur den Platzhalter WEG, aber behalte ALLEN anderen Text aus der Vorlage
4. Verwende ALLEN Text aus der Vorlage, auch Abschnitte ohne Platzhalter
5. Exakt die gleichen Formulierungen aus Bausteinen verwenden
6. Gleiche Struktur und Reihenfolge wie in der Vorlage - NICHTS weglassen
7. Gleiche Fachbegriffe
8. KEINE Synonyme
9. KEINE Halluzinationen - nur diktierte Informationen in Platzhalter einsetzen
10. ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt (z.B. "27" statt "2.7", "36" statt "3.6", "11" statt "1.1")

Erstelle die Dokumentation für "${templateName}" mit:
- KOMPLETTER Struktur wie in der Vorlage - ALLE Teile der Vorlage müssen verwendet werden
- Platzhalter ([ZAHL], [ja/nein], [BETRAG], [MATERIAL], etc.) mit Diktat-Informationen füllen
- ALLEN Text aus der Vorlage verwenden, auch wenn Platzhalter nicht gefüllt werden können
- Exakte Formulierungen aus Bausteinen
- Gleiche Fachbegriffe
- KEINE Synonyme
- KEINE zusätzlichen Informationen, die nicht im Diktat stehen (nur Platzhalter füllen)
- WICHTIG: Wenn ein Platzhalter nicht gefüllt werden kann, lasse nur den Platzhalter weg, aber behalte ALLEN anderen Text aus der Vorlage`;

  return { systemPrompt, userPrompt };
}

