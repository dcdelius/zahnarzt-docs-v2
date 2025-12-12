/**
 * V6 Extraction Service
 * 
 * MASTERPLAN V3 COMPLIANT:
 * - Extracts structured data from dictation
 * - Does NOT apply billing rules (that's TreatmentEngine's job)
 * - Does NOT generate questions (that's questionService's job)
 * - Normalizes tooth numbers BEFORE any extraction
 */

import type { ExtractedData } from '../hooks/useDocudentV6';
import { normalizeToothInText, extractToothNumber, requiresLeitungsanaesthesie } from './toothNormalizer';

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
4. KEINE Annahmen über nicht erwähnte Felder

JSON-Antwort:`;

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function extractFromDictation(dictation: string): Promise<ExtractedData> {
    // STEP 1: Normalize tooth numbers BEFORE extraction
    const normalizedText = normalizeToothInText(dictation);
    console.log('[V6 Extract] Original:', dictation);
    console.log('[V6 Extract] Normalized:', normalizedText);

    // STEP 2: Extract structured data
    let result: Partial<ExtractedData>;

    try {
        const llmResult = await extractViaLLM(normalizedText);
        if (llmResult) {
            console.log('[V6 Extract] LLM result:', llmResult);
            result = llmResult;
        } else {
            result = extractViaRegex(normalizedText);
        }
    } catch (e) {
        console.warn('[V6 Extract] LLM failed, using fallback:', e);
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

    // STEP 5: Return with gaps for questionService
    return addGaps(result);
}

// ═══════════════════════════════════════════════════════════════
// LLM EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractViaLLM(dictation: string): Promise<Partial<ExtractedData> | null> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('[V6 Extract] No OpenAI API key, using fallback');
        return null;
    }

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

    return JSON.parse(jsonMatch[0]);
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

    // Surfaces
    const surfacePatterns: Record<string, string[]> = {
        'mod': ['m', 'o', 'd'],
        'mo ': ['m', 'o'],
        'do ': ['d', 'o'],
        'od ': ['o', 'd'],
        'ob': ['o', 'b'],
        'iob': ['i', 'o', 'b'],
        'mol': ['m', 'o', 'l'],
        'dol': ['d', 'o', 'l'],
        'okklusal': ['o'],
        'approximal': ['m', 'd']
    };

    for (const [pattern, surfaces] of Object.entries(surfacePatterns)) {
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
            result.mentioned!.anesthesia = { type: 'leitung', confidence: 0.85 };
        } else {
            result.mentioned!.anesthesia = { type: 'infiltr', confidence: 0.85 };
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

function addGaps(partial: Partial<ExtractedData>): ExtractedData {
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
        tooth: partial.tooth || null,
        surfaces: partial.surfaces || [],
        diagnosis: partial.diagnosis || null,
        costs: partial.costs || null,
        mentioned: partial.mentioned || {},
        gaps
    };
}
