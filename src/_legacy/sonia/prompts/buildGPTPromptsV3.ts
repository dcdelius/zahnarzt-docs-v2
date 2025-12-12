import { CaseState } from '../types';
import { ValidationResult } from '../../types/templateV3';
import { getBlockLabel } from '../knowledge/blocks/blockRegistry';

export function buildGPTPromptsV3({
  template,
  caseState,
  validation,
  textLength = "standard",
  forensicLevel = "standard",
  outputMode = "modern_xml",
  showBillingCodes = true,
  includeRisks = false,
}: {
  template: any;
  caseState: CaseState;
  validation: ValidationResult;
  textLength?: string;
  forensicLevel?: string;
  outputMode?: string;
  showBillingCodes?: boolean;
  includeRisks?: boolean;
}) {
  // 1. Construct System Prompt
  // This should include the persona, the output schema, and general rules.
  // We can reuse logic from V2 but simplified.

  // Check for empty input
  const rawDictation = caseState.data._rawDictation;
  const hasDictation = rawDictation && rawDictation.trim().length > 0;
  const isOnlyDefaults = Object.values(caseState.sources).every(s => s === 'default');

  if (!hasDictation && isOnlyDefaults) {
    throw new Error("No user input provided (only defaults).");
  }

  const systemPrompt = `
SYSTEM-ROLLE: High-Performance Dental-AI (Sonia V3).
ZIEL: Kompakte, klinische Dokumentation basierend auf strukturierten Daten.

KONTEXT:
- VERSICHERUNGS-STATUS: ${caseState.meta.insuranceType}
- Template: ${template.title}
- Nummern anzeigen: ${showBillingCodes ? 'JA' : 'NEIN'}
-Risiken einbauen: ${includeRisks ? 'JA' : 'NEIN'}

INPUT-STRUKTUR:
Du erhältst ein JSON-Objekt mit:
- "dictation": Der ursprüngliche Diktat-Text (falls vorhanden).
- "truth": Die "Single Source of Truth" (bereinigte Daten aus Diktat, Chips und Defaults).
- "acceptedSuggestions": Liste von Smart-Vorschlägen, die der Nutzer explizit akzeptiert hat.
- "injectedText": Vorgefertigte Sätze aus den akzeptierten Vorschlägen.
- "conflicts": Konflikte, die automatisch gelöst wurden (zur Info).
- "issues": Validierungs-Probleme (Fehler/Warnungen).

ANWEISUNG:
1. Nutze primär die Daten unter "truth".
2. INTEGRIERE UNBEDINGT alle Sätze aus "injectedText" WÖRTLICH in den Fließtext-Abschnitt! Diese sind vom Nutzer bestätigt.
3. Wenn "issues" vorhanden sind, versuche diese zu adressieren oder zu erklären.
4. Ignoriere "conflicts" für das Ergebnis, vertraue der "truth".

OUTPUT-FORMAT:
Wichtig: Antworte NICHT im JSON-Format! Verwende folgendes **Hybrid-Format**:

${(template.renderSpec?.sections || []).map((section: any) => {
    if (!section.required) return '';
    const title = section.title || section.id.toUpperCase();

    let contentInstruction = '';
    switch (section.id) {
      case 'summary':
        contentInstruction = `
- Zahn/Region: [z.B. "16 mod"]
- Diagnose: [z.B. "Karies profunda"]
- Behandlung: [z.B. "Kompositfüllung"]
- Material: [z.B. "Tetric EvoCeram A3"]`;
        break;
      case 'billing':
        if (!showBillingCodes) return ''; // Skip if disabled
        contentInstruction = `- Abrechnung:
${((caseState.meta.acceptedSuggestions || []) as any[])
            .flatMap(s => s.billingItems || [])
            .map((b: any) => `  - ${b.code}: ${b.label}`)
            .join('\n')}`;
        break;
      case 'procedure':
        contentInstruction = `[Hier einen kompakten Fließtext-Absatz generieren, der die Behandlung chronologisch beschreibt.
WICHTIG: Alle Sätze aus "injectedText" MÜSSEN wörtlich eingebaut werden!
Verbinde sie flüssig mit den restlichen Informationen aus "truth".
Halte den Text präzise, medizinisch korrekt und kompakt (max. 4-5 Sätze).]`;
        break;
      case 'forensic':
        contentInstruction = `[Hier forensisch relevante Details auflisten: Aufklärung, Risiken, Komplikationen (falls aufgetreten), Verhaltensempfehlungen.]`;
        break;
    }

    return `=== ${title} ===\n${contentInstruction}`;
  }).join('\n\n')}

ABSOLUTE REGELN:
1. Erfinde KEINE PREISE.
2. Erfinde KEIN RÖNTGENBILD (nur erwähnen, wenn im Input).
3. ${caseState.meta.insuranceType === 'PKV' ? 'KEINE BEMA-Positionen (nur GOZ/Analog).' : 'BEMA primär, GOZ nur bei Mehrkosten.'}
4. Halte dich strikt an die Fakten in "truth", "acceptedSuggestions" und "injectedText".
5. Der Fließtext muss alle Sätze aus "injectedText" enthalten - keine Ausnahmen!
6. Übernimm die Abrechnungspositionen (billingCode) aus "acceptedSuggestions" in die Zusammenfassung.
7. Sei präzise aber kompakt - keine Prosa!
8. Alles aus dem Diktat, was eine Maßnahme/Leistung/Diagnose ist, muss irgendwo in summary/procedure/forensic auftauchen.
`.trim();

  // 2. Construct User Prompt (JSON)
  const userPrompt = JSON.stringify({
    dictation: caseState.data._rawDictation,
    truth: caseState.data,
    acceptedSuggestions: caseState.meta.acceptedSuggestions || [], // Now contains full objects with billingCode
    injectedText: caseState.data._injectedText || [], // Pass injected text snippets
    conflicts: caseState.conflicts,
    issues: validation.issues,
  }, null, 2);

  return { systemPrompt, userPrompt };
}
