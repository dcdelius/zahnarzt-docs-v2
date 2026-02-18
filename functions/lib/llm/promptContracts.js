"use strict";
/**
 * Cloud Functions LLM Prompt Contracts
 *
 * Keep this file aligned with app-side prompt contracts.
 * Runtime-local copy is used to avoid cross-workspace import coupling in Firebase functions build.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREANALYSIS_UNCERTAINTY_CODES_V1 = exports.PREANALYSIS_TREATMENT_IDS_V1 = exports.PREANALYSIS_PROMPT_CONTRACT_VERSION = void 0;
exports.buildPreanalysisPromptV1 = buildPreanalysisPromptV1;
exports.buildExtractionPromptV1 = buildExtractionPromptV1;
exports.PREANALYSIS_PROMPT_CONTRACT_VERSION = '1.0.0';
exports.PREANALYSIS_TREATMENT_IDS_V1 = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
];
exports.PREANALYSIS_UNCERTAINTY_CODES_V1 = [
    'classifier_low_confidence',
    'llm_low_confidence',
    'llm_ambiguous_mapping',
    'inferred_tooth_from_context',
    'missing_tooth_reference',
];
function toPipeList(values) {
    return values.join('|');
}
function buildPreanalysisPromptV1() {
    return `Du strukturierst zahnmedizinische Fliesstext-Diktate in Behandlungs-Intents.
Antworte NUR als JSON mit diesem Schema:
{
  "version": "${exports.PREANALYSIS_PROMPT_CONTRACT_VERSION}",
  "dictation": "<original>",
  "needsConfirmation": true|false,
  "intents": [
    {
      "intentId": "string",
      "treatmentId": "${toPipeList(exports.PREANALYSIS_TREATMENT_IDS_V1)}",
      "tooth": "string optional",
      "phase": "string optional",
      "step": "string optional",
      "confidence": 0..1,
      "evidenceSpans": [{ "start": number, "end": number, "text": "string" }],
      "uncertainty": "${toPipeList(exports.PREANALYSIS_UNCERTAINTY_CODES_V1)} optional"
    }
  ]
}
Regeln:
- Keine Erfindungen.
- Jeder Intent braucht mindestens einen evidenceSpan.
- Wenn unsicher: needsConfirmation=true.
- Wenn uncertainty gesetzt ist, muss needsConfirmation=true sein.
- Wenn tooth fehlt, uncertainty setzen (z.B. missing_tooth_reference).
- Keine Billing-Codes/Felder ausgeben (z.B. BEMA/GOZ/GOAE/GOAe/BEL, billingCodes, billingRefs).
- Nur treatmentIds verwenden, die im Schema stehen.`;
}
function buildExtractionPromptV1() {
    return `Du bist ein Extraktions-Assistent fuer zahnaerztliche Diktate.

Extrahiere aus dem folgenden Diktat die strukturierten Daten.
Antworte NUR mit einem JSON-Objekt, keine Erklaerungen.

Felder zum Extrahieren:
- tooth: Zahnnummer (z.B. "36", "15") oder null
- surfaces: Array von Flaechen ["m", "o", "d", "b", "l", "i"] oder []
- diagnosis: Diagnose (z.B. "Caries profunda", "Caries media") oder null
- costs: Kosten in Euro als Zahl oder null
- klinischeZusatzinfos: Array kurzer Stichpunkte zu medizinischen Zusatzinfos oder []
- patientenangaben: Array kurzer Stichpunkte zu psychosozialen/patientenseitigen Angaben oder []
- zusatzinfos: (legacy) Array kurzer Stichpunkte, falls keine klare Zuordnung moeglich
- mentioned.anesthesia: { type: "infiltr"|"leitung"|"keine", confidence: 0-1 } oder undefined
- mentioned.kofferdam: true/false oder undefined
- mentioned.capping: { type: "cp"|"p"|"none" } oder undefined
- mentioned.material: String oder undefined
- mentioned.vitality: "+"| "-" oder undefined
- mentioned.percussion: "+"| "-" oder undefined

Regeln:
1. Extrahiere NUR was explizit erwaehnt wurde
2. Bei "tief" oder "profunda" -> diagnosis: "Caries profunda"
3. "mod" = ["m", "o", "d"], "ob" = ["o", "b"], etc.
4. klinischeZusatzinfos nur bei expliziter, medizinisch relevanter Zusatzinfo (kurz, neutral, keine Mutmassungen)
5. patientenangaben nur bei expliziter Patientenangabe (kurz, neutral, keine Mutmassungen)
6. zusatzinfos nur wenn keine klare Zuordnung moeglich ist
7. KEINE Annahmen ueber nicht erwaehnte Felder

JSON-Antwort:`;
}
//# sourceMappingURL=promptContracts.js.map