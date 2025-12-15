/**
 * MergedFacts — Single Source of Truth for Output
 * 
 * Deterministic merge of extracted data + translated answers.
 * Used by outputComposer for warnings and header facts.
 * 
 * Rules:
 * - tooth: extracted wins (no user question currently)
 * - surfaces: extracted wins (no user question currently)
 * - mkvBetrag: answers.mkv_betrag > extracted.costs
 * - hasMKV: mkv_vereinbarung === 'yes' AND mkvBetrag exists
 * - depth: answers.cavity_depth > extracted.mentioned.tiefe
 * - capping_material: from translated answers
 * - anesthesia: extracted.mentioned.anesthesia
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MergedFacts {
    // Core identifiers
    tooth: string | null;
    surfaces: string[];
    diagnosis: string | null;

    // Clinical findings - uses +/- format for finding map compatibility
    vitality: '+' | '-' | null | undefined;
    percussion: '+' | '-' | null | undefined;
    anesthesiaType: 'infiltr' | 'leitung' | null;

    // Depth & capping
    tiefe: 'normal' | 'deep' | null;
    cappingMaterial: 'mta' | 'caoh' | 'biodentine' | 'none' | null;

    // Isolation
    isolation: 'yes' | 'no' | null;

    // MKV
    hasMKV: boolean;
    mkvBetrag: number | null;
    mehrschicht: boolean;

    // Insurance
    insuranceType: 'GKV' | 'PKV';

    // German aliases for finding map compatibility
    zahn?: string | null;        // alias for tooth
    flaechen?: string;           // alias for surfaces (joined)
    diagnose?: string | null;    // alias for diagnosis
}

export interface ExtractedDataInput {
    tooth: string | null;
    surfaces: string[];
    diagnosis?: string | null;
    costs?: number | null;
    mentioned?: {
        anesthesia?: { type?: string };
        tiefe?: string;
        isolation?: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// MERGE FUNCTION — PURE, DETERMINISTIC
// ═══════════════════════════════════════════════════════════════

/**
 * Merge extracted data with translated answers to create SSOT.
 * 
 * Priority:
 * 1. User answers (translated) take precedence for clinical decisions
 * 2. Extracted data provides facts (tooth, surfaces)
 * 3. No guessing — if data is missing, field is null
 */
export function mergeFacts(
    extracted: ExtractedDataInput,
    translatedAnswers: Map<string, unknown>,
    rawAnswers: Map<string, unknown>,
    insuranceType: 'GKV' | 'PKV' = 'GKV'
): MergedFacts {

    // ─── Tooth & Surfaces (from extraction, no user override) ───
    const tooth = extracted.tooth || null;
    const surfaces = extracted.surfaces || [];
    const diagnosis = extracted.diagnosis || null;

    // ─── Anesthesia (from extraction) ───
    const anesthesiaRaw = extracted.mentioned?.anesthesia?.type;
    const anesthesiaType = anesthesiaRaw === 'infiltr' ? 'infiltr'
        : anesthesiaRaw === 'leitung' ? 'leitung'
            : null;

    // ─── Vitality & Percussion (from answers) ───
    const vitalityRaw = translatedAnswers.get('vitality') || rawAnswers.get('vitality');
    const vitality = vitalityRaw === 'pos' ? 'positive'
        : vitalityRaw === 'neg' ? 'negative'
            : null;

    const percussionRaw = translatedAnswers.get('percussion') || rawAnswers.get('percussion');
    const percussion = percussionRaw === 'pos' ? 'positive'
        : percussionRaw === 'neg' ? 'negative'
            : null;

    // ─── Depth (answers > extraction) ───
    const depthFromAnswers = translatedAnswers.get('cavity_depth') || translatedAnswers.get('tiefe');
    const depthFromExtraction = extracted.mentioned?.tiefe;
    const tiefeRaw = depthFromAnswers || depthFromExtraction;
    const tiefe = tiefeRaw === 'deep' || tiefeRaw === 'tief' || tiefeRaw === 'pulpanah' ? 'deep'
        : tiefeRaw === 'normal' || tiefeRaw === 'flach' ? 'normal'
            : null;

    // ─── Capping Material (from translated answers) ───
    const cappingMaterialRaw = translatedAnswers.get('capping_material') || rawAnswers.get('material');
    const cappingMaterial = typeof cappingMaterialRaw === 'string'
        ? (cappingMaterialRaw.toLowerCase() as 'mta' | 'caoh' | 'biodentine' | 'none')
        : null;

    // ─── Isolation (from answers) ───
    const isolationRaw = translatedAnswers.get('kofferdam') || rawAnswers.get('isolation');
    const isolation = isolationRaw === 'yes' || isolationRaw === 'kofferdam' ? 'yes'
        : isolationRaw === 'no' || isolationRaw === 'relativ' ? 'no'
            : null;

    // ─── MKV (strict: must have vereinbarung=yes AND amount) ───
    const mkvVereinbarungRaw = rawAnswers.get('mkv_vereinbarung');
    const mkvBetragRaw = rawAnswers.get('mkv_betrag') ?? extracted.costs;
    const mkvBetrag = typeof mkvBetragRaw === 'number' ? mkvBetragRaw : null;
    const hasMKV = (mkvVereinbarungRaw === 'yes' || mkvVereinbarungRaw === true) && mkvBetrag !== null;

    // ─── Mehrschicht (from answers, requires MKV) ───
    const mehrschichtRaw = rawAnswers.get('mehrschicht');
    const mehrschicht = hasMKV && (mehrschichtRaw === 'yes' || mehrschichtRaw === true);

    // ─── German aliases for finding map compatibility ───
    // renderBefundFromMapping looks for 'zahn', 'flaechen', 'diagnose', and +/- vitality
    const vitalitySign = vitality === 'positive' ? '+' : vitality === 'negative' ? '-' : undefined;
    const percussionSign = percussion === 'positive' ? '+' : percussion === 'negative' ? '-' : undefined;

    return {
        tooth,
        surfaces,
        diagnosis,
        // Use +/- format for finding map compatibility (it expects '+'/'-' not 'positive'/'negative')
        vitality: vitalitySign,
        percussion: percussionSign,
        anesthesiaType,
        tiefe,
        cappingMaterial,
        isolation,
        hasMKV,
        mkvBetrag,
        mehrschicht,
        insuranceType,
        // German aliases for finding map
        zahn: tooth,
        flaechen: surfaces.length > 0 ? surfaces.join(', ') : undefined,
        diagnose: diagnosis,
    };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION — For Warnings
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
}

/**
 * Validate merged facts and return missing fields.
 * Used for warning generation.
 */
export function validateMergedFacts(facts: MergedFacts): ValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!facts.tooth) {
        missingFields.push('tooth');
        warnings.push('Zahnangabe fehlt');
    }

    if (facts.surfaces.length === 0) {
        missingFields.push('surfaces');
        warnings.push('Flächenangabe fehlt');
    }

    // Optional warnings (not blocking)
    if (!facts.diagnosis) {
        // Don't add warning - diagnosis is often inferred
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
        warnings,
    };
}
