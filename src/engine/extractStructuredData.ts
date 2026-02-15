import { TemplateV3, TemplateField, ExtractionResult } from '../types/templateV3';
import { runLLMProcessing } from '../utils/llmService';
import { getToothClass, detectMultiTooth } from './toothHelpers';

export type FieldKey = string;

/**
 * Robustly parses JSON from a string that might contain Markdown or other text.
 */
/**
 * Robustly parses JSON from a string that might contain Markdown or other text.
 */
export const parseModelJson = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback: Find first '{' and last '}'
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            const jsonCandidate = text.substring(start, end + 1);
            try {
                return JSON.parse(jsonCandidate);
            } catch (e2) {
                throw new Error("Failed to parse JSON even after extraction attempt.");
            }
        }
        throw new Error("No JSON object found in response.");
    }
};

/**
 * Normalizes specific fields (Tooth, Surfaces).
 */
/**
 * Normalizes specific fields (Tooth, Surfaces).
 */
const normalizeValue = (key: string, value: any, allData: any, warnings: { code: string, message: string }[]): any => {
    if (value === null || value === undefined) return null;

    // Normalize Surfaces
    if (key === 'surfaces' && Array.isArray(value)) {
        const map: Record<string, string> = {
            'vestibulär': 'b', 'vestibulaer': 'b',
            'buccal': 'b', 'bukkal': 'b',
            'palatinal': 'p',
            'lingual': 'l',
            'inzisal': 'i', 'incisal': 'i',
            'okklusal': 'o', 'occlusal': 'o',
            'mesial': 'm',
            'distal': 'd',
            'zentral': 'z' // rare but possible
        };

        let normalized = value.map(v => {
            const s = String(v).toLowerCase().trim();
            return map[s] || s; // Map synonym or keep original if 1 char
        });

        // Front Tooth Logic: 'o' -> 'i' for Anterior
        const tooth = allData['tooth'];
        if (tooth && getToothClass(tooth) === 'anterior') {
            const hasOcclusal = normalized.includes('o');
            normalized = normalized.map(s => s === 'o' ? 'i' : s);
            if (hasOcclusal) {
                warnings.push({
                    code: 'FRONT_TOOTH_OCCLUSAL',
                    message: `Frontzahn (${tooth}): 'okklusal' wurde zu 'inzisal' normalisiert.`
                });
            }
        }

        // Filter valid chars only? For MVP let's trust map + basic chars
        // Sort canonically: m, o, d, b, l, p, i
        const order = ['m', 'o', 'd', 'b', 'l', 'p', 'i', 'z'];
        return normalized.sort((a, b) => {
            return order.indexOf(a) - order.indexOf(b);
        });
    }

    // Normalize Tooth (remove "Zahn " prefix if present, though LLM should handle it)
    if (key === 'tooth' && typeof value === 'string') {
        return value.replace(/Zahn\s+/i, '').trim();
    }

    return value;
};

export const extractStructuredData = async (
    template: TemplateV3,
    dictationText: string
): Promise<ExtractionResult> => {

    // 0. Pre-Check: Multi-Tooth
    const detectedTeeth = detectMultiTooth(dictationText);
    const warnings: { code: string, message: string }[] = [];

    if (detectedTeeth.length > 1) {
        warnings.push({
            code: 'MULTI_TOOTH_DETECTED',
            message: `Mehrere Zähne erkannt (${detectedTeeth.join(', ')}). Bitte getrennt diktieren.`
        });
    }

    // 1. Construct System Prompt
    const fieldsSchema = template.fields.map(f => ({
        key: f.id,
        label: f.label,
        type: f.type,
        options: f.options,
        description: f.description
    }));

    const systemPrompt = `
You are a strict data extraction engine. You do NOT write reports.
Your job is to extract structured data from a dental dictation based on a provided schema.

SCHEMA:
${JSON.stringify(fieldsSchema, null, 2)}

RULES:
1. Return ONLY valid JSON. No Markdown. No comments.
2. Structure your response exactly like this:
{
  "data": { "fieldId": value, ... },
  "meta": {
    "confidenceByField": { "fieldId": 0.9, ... },
    "evidenceByField": { "fieldId": "exact quote", ... }
  }
}
3. "unknown" or "not mentioned" MUST be null. NEVER guess.
4. If a field is set to a value (not null), you MUST provide:
   - "confidenceByField": a number between 0.0 and 1.0
   - "evidenceByField": a verbatim text snippet from the dictation proving this value.
5. Do NOT set defaults (e.g. do not assume "polished" is true). Only extract what is explicitly said.
6. For 'multiselect' fields (e.g. surfaces), return an array of strings.
7. For 'enum' fields, map closely to the provided options.

DICTATION:
"${dictationText}"
`;

    // 2. Call LLM
    let rawResponse = "";
    try {
        rawResponse = await runLLMProcessing({
            systemPrompt,
            userPrompt: "Extract data now.", // The dictation is in system prompt to enforce context
            model: "gpt-4o-mini" // Optimized: GPT-4o-mini is sufficient for structured extraction and 10x cheaper
        });
    } catch (error) {
        throw new Error(`LLM Call Failed: ${error}`);
    }

    // 3. Parse & Post-Process
    let parsed: any;
    try {
        parsed = parseModelJson(rawResponse);
    } catch (error) {
        return {
            data: {},
            meta: {
                confidenceByField: {},
                evidenceByField: {},
                warnings: [{ code: 'JSON_PARSE_ERROR', message: "JSON Parsing Failed" }]
            },
            rawModelOutput: rawResponse,
            model: "gpt-4o-mini"
        };
    }

    const result: ExtractionResult = {
        data: {},
        meta: {
            confidenceByField: {},
            evidenceByField: {},
            warnings: warnings // Start with pre-check warnings
        },
        rawModelOutput: rawResponse,
        model: "gpt-4o-mini"
    };

    // 4. Enforce Schema & Rules
    template.fields.forEach(field => {
        const key = field.id;
        let value = parsed.data?.[key] ?? null;
        let confidence = parsed.meta?.confidenceByField?.[key];
        let evidence = parsed.meta?.evidenceByField?.[key];

        // Normalization
        // Pass allData (parsed.data) and warnings array
        value = normalizeValue(key, value, parsed.data, result.meta.warnings || []);

        // Rule: Evidence & Confidence Mandatory if value is present
        if (value !== null) {
            if (!evidence || typeof evidence !== 'string' || evidence.trim() === '') {
                // Soft correction: Reset to null if evidence missing
                result.meta.warnings?.push({
                    code: 'MISSING_EVIDENCE',
                    message: `Field '${key}' reset to null because evidence was missing.`
                });
                value = null;
            } else if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
                // Soft correction: Reset to null if confidence invalid
                result.meta.warnings?.push({
                    code: 'INVALID_CONFIDENCE',
                    message: `Field '${key}' reset to null because confidence was invalid.`
                });
                value = null;
            }
        }

        // Assign final values
        if (value !== null) {
            result.data[key] = value;
            result.meta.confidenceByField[key] = confidence;
            result.meta.evidenceByField[key] = evidence;
        } else {
            result.data[key] = null;
            // No meta needed for null fields
        }
    });

    return result;
};
