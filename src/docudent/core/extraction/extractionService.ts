/**
 * Core Extraction Service — Ported from V6
 *
 * ═══════════════════════════════════════════════════════════════
 * PORTED FROM: v6/services/extractionService.ts
 * PURPOSE: Extract structured data from dictation
 * ═══════════════════════════════════════════════════════════════
 *
 * MASTERPLAN V3 COMPLIANT:
 * - Extracts structured data from dictation
 * - Does NOT apply billing rules (that's TreatmentEngine's job)
 * - Does NOT generate questions (that's questionService's job)
 * - Normalizes tooth numbers BEFORE any extraction
 */

import type { ExtractedDataV6, ExtractedData } from '../../contracts/extractionV6';
import { EXTRACTION_VERSION_V6 } from '../../contracts/extractionV6';
import { normalizeToothInText, extractToothNumber, requiresLeitungsanaesthesie } from './toothNormalizer';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════

const EXTRACTION_PROMPT = `Du bist ein Extraktions-Assistent für zahnärztliche Diktate.

Extrahiere aus dem folgenden Diktat die strukturierten Daten.
Antworte NUR mit einem JSON-Objekt, keine Erklärungen.

Felder zum Extrahieren:
- tooth: Zahnnummer (z.B. "36", "15") oder null
- surfaces: Array von Flächen ["m", "o", "d", "b", "l", "i"] oder []
- diagnosis: Diagnose (z.B. "Caries profunda", "Caries media") oder null
- costs: Kosten in Euro als Zahl oder null
- klinischeZusatzinfos: Array kurzer Stichpunkte zu medizinischen Zusatzinfos oder []
- patientenangaben: Array kurzer Stichpunkte zu psychosozialen/patientenseitigen Angaben oder []
- zusatzinfos: (legacy) Array kurzer Stichpunkte, falls keine klare Zuordnung möglich
- mentioned.anesthesia: { type: "infiltr"|"leitung"|"keine", confidence: 0-1 } oder undefined
- mentioned.kofferdam: true/false oder undefined  
- mentioned.capping: { type: "cp"|"p"|"none" } oder undefined
- mentioned.material: String oder undefined
- mentioned.vitality: "+"| "-" oder undefined
- mentioned.percussion: "+"| "-" oder undefined

Regeln:
1. Extrahiere NUR was explizit erwähnt wurde
2. Bei "tief" oder "profunda" → diagnosis: "Caries profunda"
3. "mod" = ["m", "o", "d"], "ob" = ["o", "b"], etc.
4. klinischeZusatzinfos nur bei expliziter, medizinisch relevanter Zusatzinfo (kurz, neutral, keine Mutmaßungen)
5. patientenangaben nur bei expliziter Patientenangabe (kurz, neutral, keine Mutmaßungen)
6. zusatzinfos nur wenn keine klare Zuordnung möglich ist
7. KEINE Annahmen über nicht erwähnte Felder

JSON-Antwort:`;

const ExtractedMentionedSchema = z.object({
    anesthesia: z.union([
        z.object({
            type: z.enum(['infiltr', 'leitung', 'keine']),
            confidence: z.number().optional(),
        }),
        z.string(),
    ]).nullable().optional(),
    kofferdam: z.boolean().nullable().optional(),
    capping: z.union([
        z.object({
            type: z.enum(['cp', 'p', 'none']),
        }),
        z.string()
    ]).nullable().optional(),
    material: z.string().nullable().optional(),
    vitality: z.enum(['+', '-']).nullable().optional(),
    percussion: z.enum(['+', '-']).nullable().optional(),
    fluoridation: z.boolean().nullable().optional(),
}).partial();

const ExtractedDataSchema = z.object({
    tooth: z.string().nullable().optional(),
    teeth: z.union([z.array(z.string()), z.string()]).optional(),
    surfaces: z.union([z.array(z.string()), z.string()]).optional(),
    diagnosis: z.string().nullable().optional(),
    costs: z.union([z.number(), z.string()]).nullable().optional(),
    klinischeZusatzinfos: z.union([z.array(z.string()), z.string()]).optional(),
    patientenangaben: z.union([z.array(z.string()), z.string()]).optional(),
    zusatzinfos: z.union([z.array(z.string()), z.string()]).optional(),
    mentioned: ExtractedMentionedSchema.optional(),
    gaps: z.array(z.string()).optional(),
}).partial();

// ═══════════════════════════════════════════════════════════════
// TOOTH EXTRACTION HELPERS (P14.X GIGAPROMPT 5)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract ALL teeth from dictation for multi-instance support.
 * Handles variants: Zahn 16, #16, Z16, FDI 16, standalone 16
 * Returns unique, numeric-sorted array.
 */
function extractAllTeeth(dictation: string): string[] {
    // Multiple patterns to match tooth numbers
    // - "Zahn 16" or "Zahn16"
    // - "Z16" or "Z 16"
    // - "#16"
    // - "FDI 16"
    // - Standalone two-digit FDI numbers at word boundaries
    const patterns = [
        /\bZahn\s*(\d{2})\b/gi,       // Zahn 16, Zahn16
        /\bZ\s*(\d{2})\b/gi,          // Z16, Z 16
        /#(\d{2})\b/g,                // #16
        /\bFDI\s*(\d{2})\b/gi,        // FDI 16
        /\b([1-8][1-8])\b/g,          // Standalone FDI (11-88)
    ];

    const allMatches: string[] = [];
    for (const pattern of patterns) {
        const matches = dictation.matchAll(pattern);
        for (const match of matches) {
            const tooth = match[1];
            if (tooth && isValidFDITooth(tooth)) {
                allMatches.push(tooth);
            }
        }
    }

    // Unique and sorted numerically
    return [...new Set(allMatches)].sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Validate FDI tooth number format.
 * Permanent: 11-18, 21-28, 31-38, 41-48
 * Deciduous: 51-55, 61-65, 71-75, 81-85
 */
function isValidFDITooth(tooth: string): boolean {
    if (!/^\d{2}$/.test(tooth)) return false;
    const quadrant = parseInt(tooth[0]);
    const position = parseInt(tooth[1]);

    // Permanent teeth: quadrants 1-4, positions 1-8
    if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) {
        return true;
    }
    // Deciduous teeth: quadrants 5-8, positions 1-5
    if (quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5) {
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function extractFromDictation(dictation: string): Promise<ExtractedDataV6> {
    // STEP 1: Normalize tooth numbers BEFORE extraction
    const normalizedText = normalizeToothInText(dictation);
    console.log('[Core Extract] Original:', dictation);
    console.log('[Core Extract] Normalized:', normalizedText);

    // STEP 2: Extract structured data
    let result: Partial<ExtractedData>;
    let llmUsed = false;
    let llmError: string | undefined;

    try {
        const llmResult = await extractViaLLM(normalizedText);
        if (llmResult) {
            console.log('[Core Extract] LLM result:', llmResult);
            result = llmResult;
            llmUsed = true;
        } else {
            llmError = 'llm_unavailable';
            result = extractViaRegex(normalizedText);
        }
    } catch (e) {
        console.warn('[Core Extract] LLM failed, using fallback:', e);
        llmError = e instanceof Error ? e.message : String(e);
        result = extractViaRegex(normalizedText);
    }

    // STEP 3: Ensure tooth is properly extracted (fallback)
    if (!result.tooth) {
        result.tooth = extractToothNumber(normalizedText);
    }

    // STEP 4: Smart anesthesia inference based on tooth position
    // This is extraction logic, NOT billing logic
    if (result.mentioned?.anesthesia && !result.mentioned.anesthesia.type && result.tooth) {
        if (requiresLeitungsanaesthesie(result.tooth)) {
            result.mentioned.anesthesia = { type: 'leitung', confidence: 0.85 };
        } else {
            result.mentioned.anesthesia = { type: 'infiltr', confidence: 0.85 };
        }
    }

    // STEP 4.5: Extract ALL teeth for multi-instance support (P14.X)
    const teeth = extractAllTeeth(normalizedText);
    // If teeth found but primary tooth not set, use first tooth
    if (teeth.length > 0 && !result.tooth) {
        result.tooth = teeth[0];
    }

    // STEP 4.6: Heuristic clinical extras (fallback if LLM missed)
    const lower = normalizedText.toLowerCase();
    const clinicalExtras: string[] = [];
    if (lower.includes('krone zu hoch')) {
        clinicalExtras.push('Krone zu hoch');
    }
    if (lower.includes('bisskontrolle')) {
        clinicalExtras.push('Bisskontrolle geplant');
    }
    if (clinicalExtras.length > 0) {
        const existing = coerceStringArray((result as Record<string, unknown>).klinischeZusatzinfos)
            ?.map(info => String(info).trim())
            .filter(Boolean) ?? [];
        const merged = Array.from(new Set([...existing, ...clinicalExtras]));
        if (merged.length > 0) {
            (result as Record<string, unknown>).klinischeZusatzinfos = merged;
        }
    }

    // STEP 5: Attach diagnostics + return with gaps
    (result as Record<string, unknown>)._extractionMethod = llmUsed ? 'llm' : 'regex';
    if (llmError) {
        (result as Record<string, unknown>)._llmError = llmError;
    }
    return addGaps(result, normalizedText, teeth);
}

// ═══════════════════════════════════════════════════════════════
// LLM EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractViaLLM(dictation: string): Promise<Partial<ExtractedData> | null> {
    if (typeof window !== 'undefined') {
        const { callExtractionGateway } = await import('./extractionGatewayClient');
        const gatewayContent = await callExtractionGateway(dictation);
        if (!gatewayContent) return null;
        const gatewayJsonMatch = gatewayContent.match(/\{[\s\S]*\}/);
        if (!gatewayJsonMatch) return null;
        return parseJsonLenient(gatewayJsonMatch[0]);
    }

    const envFromProcess = (typeof process !== 'undefined' && process.env) ? process.env : undefined;
    const apiKey = envFromProcess?.OPENAI_API_KEY;

    if (!apiKey) return null;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: EXTRACTION_PROMPT },
                { role: 'user', content: dictation }
            ],
            temperature: 0.1,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = parseJsonLenient(jsonMatch[0]);
    return parsed;
}

/**
 * Best-effort JSON parse for LLM output.
 * - Strips code fences
 * - Replaces undefined/NaN/Infinity with null
 * - Removes trailing commas
 */
function parseJsonLenient(raw: string): Partial<ExtractedData> | null {
    const withoutFences = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const cleaned = withoutFences
        // Replace undefined/NaN/Infinity with null
        .replace(/:\s*undefined\b/g, ': null')
        .replace(/:\s*NaN\b/g, ': null')
        .replace(/:\s*Infinity\b/g, ': null')
        // Remove trailing commas before } or ]
        .replace(/,\s*([}\]])/g, '$1');

    try {
        const parsed = JSON.parse(cleaned) as unknown;
        return validateExtractedData(parsed);
    } catch (e) {
        const isProd = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
        if (!isProd) {
            console.warn('[Core Extract] JSON parse failed after cleanup:', e);
        }
        return null;
    }
}

function coerceStringArray(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(/[\s,;]+/)
            .map(v => v.trim())
            .filter(Boolean);
    }
    return undefined;
}

function normalizeMentioned(mentioned: any): ExtractedData['mentioned'] | undefined {
    if (!mentioned) return undefined;
    const next = { ...mentioned };

    if (typeof next.anesthesia === 'string') {
        const normalized = (next.anesthesia as string).toLowerCase();
        const type = normalized.includes('leitung')
            ? 'leitung'
            : normalized.includes('keine')
                ? 'keine'
                : 'infiltr';
        next.anesthesia = { type, confidence: 0.7 };
    }

    if (typeof next.capping === 'string') {
        const normalized = (next.capping as string).toLowerCase();
        let type: 'cp' | 'p' | 'none' = 'none';

        if (normalized.includes('direkt') || normalized === 'p') {
            type = 'p';
        } else if (normalized.includes('indirekt') || normalized === 'cp') {
            type = 'cp';
        }

        next.capping = { type };
    }

    return next;
}

function validateExtractedData(input: unknown): Partial<ExtractedData> | null {
    const result = ExtractedDataSchema.safeParse(input);
    if (!result.success) {
        const isProd = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
        if (!isProd) {
            console.warn('[Core Extract] LLM output schema mismatch:', result.error.flatten().fieldErrors);
            console.log('[Core Extract] Raw invalid input:', JSON.stringify(input, null, 2));
        }
        return null;
    }

    const data = result.data;
    const teeth = coerceStringArray(data.teeth);
    const surfaces = coerceStringArray(data.surfaces);
    const costs = typeof data.costs === 'string' ? Number(data.costs.replace(',', '.')) : data.costs;
    const klinischeZusatzinfos = coerceStringArray((data as Record<string, unknown>).klinischeZusatzinfos)
        ?.map(info => String(info).trim())
        .filter(Boolean);
    const patientenangaben = coerceStringArray((data as Record<string, unknown>).patientenangaben)
        ?.map(info => String(info).trim())
        .filter(Boolean);
    const zusatzinfos = coerceStringArray(data.zusatzinfos)
        ?.map(info => String(info).trim())
        .filter(Boolean);

    return {
        tooth: data.tooth ?? null,
        teeth: teeth,
        surfaces: surfaces ?? [],
        diagnosis: data.diagnosis ?? null,
        costs: typeof costs === 'number' && !Number.isNaN(costs) ? costs : null,
        klinischeZusatzinfos: klinischeZusatzinfos?.length ? klinischeZusatzinfos : undefined,
        patientenangaben: patientenangaben?.length ? patientenangaben : undefined,
        zusatzinfos: zusatzinfos?.length ? zusatzinfos : undefined,
        mentioned: normalizeMentioned(data.mentioned),
        gaps: data.gaps ?? [],
    };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: REGEX EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractViaRegex(dictation: string): Partial<ExtractedData> {
    const lower = dictation.toLowerCase();
    const result: Partial<ExtractedData> = {
        tooth: null,
        surfaces: [],
        diagnosis: null,
        costs: null,
        mentioned: {}
    };

    // Tooth number
    const toothMatch = dictation.match(/\b([1-4][1-8])\b/);
    if (toothMatch) {
        result.tooth = toothMatch[1];
    }

    // Surfaces - improved pattern detection
    // Patterns sorted by length (longest first) to avoid substring conflicts
    const surfacePatterns: Array<[string, string[]]> = [
        // Compound patterns (3+ surfaces) - longest first
        ['okklusal-distal', ['o', 'd']],
        ['okklusal-mesial', ['o', 'm']],
        ['okklusaldistal', ['o', 'd']],
        ['okklusalmesial', ['o', 'm']],
        ['mesial-okklusal', ['m', 'o']],
        ['distal-okklusal', ['d', 'o']],
        ['approximal', ['m', 'd']],
        ['palatinal', ['l']],
        ['okklusal', ['o']],
        ['inzisal', ['i']],
        ['lingual', ['l']],
        ['buccal', ['b']],
        ['bukkal', ['b']],
        ['mesial', ['m']],
        ['distal', ['d']],
        // 4+ surface combos (must come BEFORE shorter patterns!)
        ['modbl', ['m', 'o', 'd', 'b', 'l']],
        ['modb', ['m', 'o', 'd', 'b']],
        ['modl', ['m', 'o', 'd', 'l']],
        // 3 surface combos  
        ['mod', ['m', 'o', 'd']],
        ['iob', ['i', 'o', 'b']],
        ['mol', ['m', 'o', 'l']],
        ['dol', ['d', 'o', 'l']],
        ['mob', ['m', 'o', 'b']],
        ['dob', ['d', 'o', 'b']],
        // Two-letter combos
        ['od', ['o', 'd']],
        ['mo', ['m', 'o']],
        ['do', ['d', 'o']],
        ['ob', ['o', 'b']],
        ['ol', ['o', 'l']],
        ['mb', ['m', 'b']],
        ['db', ['d', 'b']],
        ['ml', ['m', 'l']],
        ['dl', ['d', 'l']],
    ];

    for (const [pattern, surfaces] of surfacePatterns) {
        if (lower.includes(pattern)) {
            result.surfaces = surfaces;
            break;
        }
    }

    // Diagnosis
    if (lower.includes('profunda') || lower.includes('tief')) {
        result.diagnosis = 'Caries profunda';
    } else if (lower.includes('media') || lower.includes('karies')) {
        result.diagnosis = 'Caries media';
    } else if (lower.includes('superficialis')) {
        result.diagnosis = 'Caries superficialis';
    }

    // Costs
    const costMatch = dictation.match(/(\d+)\s*€|(\d+)\s*euro/i);
    if (costMatch) {
        result.costs = parseInt(costMatch[1] || costMatch[2], 10);
    }

    // Anesthesia
    if (lower.includes('anästhesie') || lower.includes('la ') || lower.includes('betäubung')) {
        const toothNum = result.tooth ? parseInt(result.tooth, 10) : 0;
        const isUKMolar = [36, 37, 38, 46, 47, 48].includes(toothNum);

        if (lower.includes('ohne') && (lower.includes('anästhesie') || lower.includes('la'))) {
            result.mentioned!.anesthesia = { type: 'keine', confidence: 0.9 };
        } else if (lower.includes('leitung')) {
            result.mentioned!.anesthesia = { type: 'leitung', confidence: 0.95 };
        } else if (lower.includes('infiltr')) {
            result.mentioned!.anesthesia = { type: 'infiltr', confidence: 0.95 };
        } else if (isUKMolar) {
            // Generic LA mention without explicit type → mark as unknown (askback required)
            result.mentioned!.anesthesia = { type: 'unknown', confidence: 0.6 };
        } else {
            // Generic LA mention without explicit type → mark as unknown (askback required)
            result.mentioned!.anesthesia = { type: 'unknown', confidence: 0.6 };
        }
    }

    // Kofferdam
    if (lower.includes('kofferdam') || lower.includes('absolut')) {
        result.mentioned!.kofferdam = true;
    } else if (lower.includes('relativ') || lower.includes('watteroll')) {
        result.mentioned!.kofferdam = false;
    }

    // Capping
    if (lower.includes('cp') || lower.includes('indirekt') && lower.includes('überkapp')) {
        result.mentioned!.capping = { type: 'cp' };
    } else if (lower.includes(' p ') || lower.includes('direkt') && lower.includes('überkapp')) {
        result.mentioned!.capping = { type: 'p' };
    }

    // Vitality - recognize various ways to express positive/negative
    if (lower.match(/vipr?\s*\+/) || lower.match(/vipr?\s+plus/) || lower.match(/vipr?\s+pos/) ||
        (lower.includes('vital') && !lower.includes('devital') && !lower.includes('avital'))) {
        result.mentioned!.vitality = '+';
    } else if (lower.match(/vipr?\s*-/) || lower.match(/vipr?\s+minus/) || lower.match(/vipr?\s+neg/) ||
        lower.includes('devital') || lower.includes('avital')) {
        result.mentioned!.vitality = '-';
    }

    // Percussion - recognize various ways to express positive/negative
    if (lower.match(/perk\s*-/) || lower.match(/perk\s+minus/) || lower.match(/perk\s+neg/) ||
        lower.includes('perkussionsnegativ') || lower.includes('perkussion negativ')) {
        result.mentioned!.percussion = '-';
    } else if (lower.match(/perk\s*\+/) || lower.match(/perk\s+plus/) || lower.match(/perk\s+pos/) ||
        lower.includes('perkussionspositiv') || lower.includes('perkussion positiv')) {
        result.mentioned!.percussion = '+';
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// GAP DETECTION
// ═══════════════════════════════════════════════════════════════

function addGaps(partial: Partial<ExtractedData>, rawDictation: string = '', teeth: string[] = []): ExtractedDataV6 {
    const gaps: string[] = [];

    // Forensic required fields
    if (!partial.mentioned?.vitality) gaps.push('vitality');
    if (!partial.mentioned?.percussion) gaps.push('percussion');

    // Upsell opportunities
    if (partial.mentioned?.kofferdam === undefined) gaps.push('kofferdam');
    if (!partial.mentioned?.capping && partial.diagnosis?.includes('profunda')) {
        gaps.push('capping');
    }

    return {
        ...partial,
        tooth: partial.tooth || null,
        teeth: teeth.length > 0 ? teeth : (partial.tooth ? [partial.tooth] : []),  // P14.X: Multi-tooth SSOT
        surfaces: partial.surfaces || [],
        diagnosis: partial.diagnosis || null,
        costs: partial.costs || null,
        mentioned: partial.mentioned || {},
        gaps,
        rawDictation,
        extractionVersion: EXTRACTION_VERSION_V6,  // A2: Version tag
    };
}
