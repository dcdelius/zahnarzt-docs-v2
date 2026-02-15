import { TemplateV3 } from '../../../types/templateV3';
import { normalizeExtractedData, NormalizationWarning } from './normalizeExtractedData';
import { safeJsonParseStrict, JSONParseError } from './safeJsonParse';

export interface FieldMeta {
    confidence?: number;         // 0-1
    evidence?: string;           // Verbatim snippet from dictation
    negated?: boolean;           // Explicit negation detected
    reason?: string;             // Why this value (or why null)
}

export interface ExtractionMeta {
    model: string;
    fieldMeta?: Record<string, FieldMeta>;
    warnings?: string[];
    normalizationWarnings?: NormalizationWarning[];
    rawModelOutput?: string;
}

export interface ExtractionResult {
    extracted: Record<string, any>;  // Normalized, structured data
    meta: ExtractionMeta;
}

/**
 * Builds field specification with examples for LLM extraction prompt
 */
function buildFieldSpecs(template: TemplateV3): string {
    return template.fields.map(field => {
        let spec = `- ${field.id}: ${field.type}`;

        if (field.options && field.options.length > 0) {
            spec += ` [${field.options.join(', ')}]`;
        }

        if (field.description) {
            spec += ` // ${field.description}`;
        }

        // Add examples for common field types
        if (field.type === 'multiselect' && (field.id === 'surfaces' || field.id.includes('fläch'))) {
            spec += `\n    Example: "16 mod" → ["m", "o", "d"]`;
        } else if (field.type === 'enum' && field.id.toLowerCase().includes('anesth')) {
            spec += `\n    Example: "ILA" → "Infiltration", "ohne Spritze" → "Keine"`;
        } else if (field.type === 'boolean' && field.id.toLowerCase().includes('matrix')) {
            spec += `\n    Example: "Matrize angelegt" → true, "ohne Matrize" → false + negated`;
        } else if (field.id === 'tooth' || field.id.toLowerCase().includes('zahn')) {
            spec += `\n    Example: "16", "24" (FDI notation, no dots)`;
        }

        return spec;
    }).join('\n');
}

/**
 * Extracts structured data from raw dictation using LLM
 * Returns normalized data with per-field metadata
 */
export async function extractDictationV3({
    template,
    rawText,
    model = 'gpt-4o-mini'
}: {
    template: TemplateV3 | null | undefined;
    rawText: string;
    model?: string;
}): Promise<ExtractionResult> {
    if (!rawText || !rawText.trim()) {
        throw new Error('Raw text is required for extraction');
    }

    if (!template) {
        throw new Error('Template is required for extraction but was not provided.');
    }

    // 1. Build System Prompt with field specs and examples
    const fieldSpecs = buildFieldSpecs(template);

    const systemPrompt = `
ROLLE: Dental Data Extractor (Sonia V3) - Billing-Optimiert
AUFGABE: Extrahiere strukturierte Daten aus Diktat. Inferiere kontextuelle Infos für Abrechnung!

OUTPUT-FORMAT: Strict JSON (KEIN Markdown, keine zusätzlichen Texte)
{
  "data": {
    "tooth": "16",
    "surfaces": ["m", "o", "d"],
    "diagnosis": "Caries profunda",
    "anesthesia": "Infiltration",
    "material": "Tetric",
    "costs": "120",
    "dictationExtras": ["Mundsperrer verwendet", "Patient sehr ängstlich"],
    
    // NEU: Kontextuelle Inferenz für Billing
    "inferred": {
      "deepCavity": true,           // Erkannt wenn: tief, profunda, pulpanah, cp
      "ukMolar": true,              // UK 36-38, 46-48 → Leitungsanästhesie wahrscheinlicher!
      "multiSurface": true,         // 2+ Flächen → Matrize wahrscheinlich
      "approximal": true,           // m oder d vorhanden → Approximalfüllung
      "cappingLikely": true,        // Bei tiefer Karies → Cp/P wahrscheinlich
      "cappingMaterial": "Ca(OH)2", // Wenn erwähnt: MTA, Biodentine, TheraCal, Calxyl
      "kofferdamMentioned": false,  // Explizit erwähnt?
      "anesthesiaType": "leitung",  // Inferiert aus "Ultracain", "ILA", "Leitung"
      "fluorideMentioned": false    // Fluorid/Duraphat erwähnt?
    }
  },
  "meta": {
    "negationsFound": ["matrix"],
    "ambiguous": [],
    "billingHints": [
      "UK Molar erkannt (46) - Leitungsanästhesie prüfen!",
      "Tiefe Karies - Cp dokumentieren?"
    ],
    "fieldMeta": {
      "tooth": { "evidence": "Füllung 16", "confidence": 0.95 },
      "costs": { "evidence": "Kosten 120 Euro", "confidence": 0.9 },
      "matrix": { "evidence": "ohne Matrize", "negated": true }
    }
  }
}

STRENGE REGELN:
1. Nur Felder aus der erlaubten Liste extrahieren
2. Negation EXPLIZIT: "ohne X" / "keine X" → setze Wert + negated: true
3. Unsicher → null + meta.ambiguous[] + reason
4. KEINE erfundenen Werte
5. Enum-Felder: nur erlaubte Werte verwenden
6. Multiselect: immer als Array
7. Für JEDES extrahierte Feld: evidence (Textausschnitt) + confidence
8. ALLES, was medizinisch relevant ist aber in kein Feld passt, MUSS in "dictationExtras" (Array von Strings)!

ERLAUBTE FELDER:
${fieldSpecs}
- costs: string // Patientenkosten in Euro (z.B. "120", "80")
- dictationExtras: string[] // Alles was nicht gemappt werden konnte
- inferred: object // Kontextuelle Inferenzen für Billing

═══════════════════════════════════════════════════════════════
KONTEXTUELLE INFERENZ FÜR BILLING-OPTIMIERUNG:
═══════════════════════════════════════════════════════════════

1. UK-SEITENZÄHNE (36-38, 46-48):
   → IMMER inferred.ukMolar = true
   → billingHints: "UK Molar - Leitungsanästhesie prüfen (BEMA 41a statt 40 = +50%!)"

2. TIEFE KARIES erkennen bei:
   - "tief", "tiefe", "profunda", "cp", "pulpanah", "tiefgehend"
   → inferred.deepCavity = true
   → inferred.cappingLikely = true
   → billingHints: "Tiefe Karies → Cp (BEMA 25) oder P (BEMA 26) dokumentieren?"

3. ÜBERKAPPUNGSMATERIAL erkennen:
   - "Ca(OH)2", "Calciumhydroxid", "Calxyl" → "Ca(OH)2"
   - "MTA" → "MTA"
   - "Biodentine" → "Biodentine"
   - "TheraCal" → "TheraCal"
   → inferred.cappingMaterial = "..."

4. ANÄSTHESIE-TYP inferieren:
   - "Leitung", "LA", "Nervenbetäub" → "leitung"
   - "Infiltration", "Infil", "Depot" → "infiltration"
   - "ILA", "intraligament" → "ila"
   - "Ultracain", "Ubistesin", "Articain" → Medikament genannt, aber Typ unklar
   - Bei UK Molaren (36-38, 46-48) + keine Angabe → billingHints: "UK Molar ohne Anästhesie-Typ - Leitung wahrscheinlich?"

5. KOFFERDAM erkennen:
   - "Koff", "Kofferdam", "Spanngummi", "rubber dam" → inferred.kofferdamMentioned = true
   - "relativ", "Watterollen" → inferred.kofferdamMentioned = false (explizit NICHT)

6. APPROXIMALFÜLLUNG (für Matrizen-Rückfrage):
   - Flächen enthält "m" oder "d" → inferred.approximal = true
   - 2+ Flächen → inferred.multiSurface = true

7. FLUORIDIERUNG erkennen:
   - "Fluorid", "Duraphat", "Elmex", "fluor" → inferred.fluorideMentioned = true

═══════════════════════════════════════════════════════════════

WICHTIG:
- FDI-Zahnnotation OHNE Punkt (16, nicht 1.6)
- Flächen: einzelne Buchstaben ["m", "o", "d"], nicht "mod"
- Synonyme normalisieren: "ILA" → "Infiltration", "LA" → "Leitung"
- "tiefe Füllung" / "tief" / "profunda" / "tiefgehend" → setze "diagnosis": "Caries profunda"
- "cp" / "pulpana" / "pulpanah" → setze "diagnosis": "Caries profunda"
- "kariesfrei" / "sauber" → setze "excavation": "Vollständig"
- KOSTEN: "120 Euro", "Kosten 80", "kostet 50 Euro" → setze "costs": "120" (nur Zahl!)

BEISPIELE:
"tiefe füllung an 16, mundsperrer" -> { "tooth": "16", "diagnosis": "Caries profunda", "inferred": { "deepCavity": true, "cappingLikely": true }, "dictationExtras": ["Mundsperrer"] }
"46 mod leitung komposit" -> { "tooth": "46", "surfaces": ["m","o","d"], "anesthesia": "Leitung", "inferred": { "ukMolar": true, "multiSurface": true, "approximal": true, "anesthesiaType": "leitung" } }
"Füllung 36, tiefe karies, kofferdam, MTA" -> { "tooth": "36", "diagnosis": "Caries profunda", "inferred": { "ukMolar": true, "deepCavity": true, "cappingLikely": true, "cappingMaterial": "MTA", "kofferdamMentioned": true } }
`.trim();

    const userPrompt = `DIKTAT:\n${rawText}\n\nExtrahiere die Daten. Antworte NUR mit dem JSON-Objekt.`;

    // 2. Call LLM
    try {
        const { runLLMProcessing } = await import('@/utils/llmService');
        const response = await runLLMProcessing({
            systemPrompt,
            userPrompt,
            model,
            skipCleaning: true // Preserve JSON, don't apply regex cleanups
        });

        // 3. Parse JSON strictly
        let parsed;
        try {
            parsed = safeJsonParseStrict(response);
        } catch (e) {
            if (e instanceof JSONParseError) {
                throw new Error(`LLM returned invalid JSON: ${e.message}\n\nRaw response: ${e.rawResponse.substring(0, 500)}...`);
            }
            throw e;
        }

        // 4. Validate structure
        if (!parsed.data || typeof parsed.data !== 'object') {
            throw new Error('Extraction result missing "data" object');
        }

        // 5. Normalize extracted data
        const { normalized, warnings: normWarnings } = normalizeExtractedData(template, parsed.data);

        // 6. Build result with meta
        const meta: ExtractionMeta = {
            model,
            fieldMeta: parsed.meta?.fieldMeta || {},
            warnings: [],
            normalizationWarnings: normWarnings,
            rawModelOutput: response
        };

        // Collect warnings
        if (parsed.meta?.ambiguous && Array.isArray(parsed.meta.ambiguous)) {
            meta.warnings = parsed.meta.ambiguous;
        }

        // Add normalization warnings to general warnings
        if (normWarnings.length > 0) {
            const normWarningMessages = normWarnings.map(w =>
                `${w.field}: "${w.original}" → ${w.normalized === null ? 'null' : JSON.stringify(w.normalized)} (${w.reason})`
            );
            meta.warnings = [...(meta.warnings || []), ...normWarningMessages];
        }

        return {
            extracted: normalized,
            meta
        };

    } catch (error) {
        // Re-throw with context
        if (error instanceof Error) {
            throw new Error(`Extraction failed: ${error.message}`);
        }
        throw error;
    }
}
