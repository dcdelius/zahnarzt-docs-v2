/**
 * SSOT KB Renderer — Strict Rendering from KB Chips Only
 *
 * NO TEXT WITHOUT CHIP: All output text comes from KB textSnippets.
 * NO CHIP WITHOUT KB: Every emitted chip must exist in treatment unified.json.
 *
 * @module v7/output/renderFromKbChips
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RenderInput {
    /** KB chip IDs to render */
    chips: string[];
    /** Treatment ID for KB lookup */
    treatmentId: string;
    /** Insurance type for billing lookup */
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    /** Text length for textSnippets lookup */
    textLength: 'kurz' | 'mittel' | 'lang';
    /** Optional context for variable substitution */
    context?: {
        tooth?: string;
        surfaces?: string[];
        material?: string;
        [key: string]: unknown;
    };
    /**
     * Optional: Injected treatment KB (M13).
     * When provided, skips loadTreatmentKb() call.
     * V10 uses this to pass pre-loaded KB from provider.
     */
    treatmentKb?: {
        _meta: { id: string; version: string };
        chips: Array<{
            id: string;
            label: string;
            phase?: string;
            category?: string;
            textSnippets?: { kurz?: string; mittel?: string; lang?: string };
            billingRef?: { GKV?: string; PKV?: string } | null;
            variablen?: Record<string, { required?: boolean; default?: unknown; options?: unknown[] }>;
        }>;
    };
}

export interface RenderOutput {
    /** Full rendered text (all chip texts joined) */
    fullText: string;
    /** Billing codes extracted from chips */
    billingCodes: string[];
    /** Individual text segments (one per chip) */
    segments: Array<{
        chipId: string;
        text: string;
        billingCode?: string;
    }>;
    /** Metadata for debugging/auditing */
    meta: {
        /** Chips that were requested but not found in KB */
        missingChips: string[];
        /** Chips that have text but no billing (should be TEXT_ONLY) */
        textOnlyChips: string[];
        /** Chips with billing for different insurance type */
        missingBillingRefs: string[];
    };
}

// ═══════════════════════════════════════════════════════════════
// KB CHIP INTERFACE (mirrors unified.json structure)
// ═══════════════════════════════════════════════════════════════

interface KbChip {
    id: string;
    label: string;
    phase?: string;
    category?: string;
    textSnippets?: {
        kurz?: string;
        mittel?: string;
        lang?: string;
    };
    billingRef?: {
        GKV?: string;
        PKV?: string;
    } | null;
    variablen?: Record<string, {
        required?: boolean;
        default?: unknown;
        options?: unknown[];
    }>;
}

interface TreatmentKb {
    _meta: {
        id: string;
        version: string;
    };
    chips: KbChip[];
}

// ═══════════════════════════════════════════════════════════════
// KB LOADER
// ═══════════════════════════════════════════════════════════════

const kbCache: Map<string, TreatmentKb> = new Map();

function loadTreatmentKb(treatmentId: string): TreatmentKb | null {
    if (kbCache.has(treatmentId)) {
        return kbCache.get(treatmentId)!;
    }

    try {
        let kb: TreatmentKb;
        switch (treatmentId) {
            case 'fuellung':
                kb = require('../../core/billing/knowledgeBase/treatments/fuellung/unified.json');
                break;
            case 'endo':
                kb = require('../../core/billing/knowledgeBase/treatments/endo/unified.json');
                break;
            default:
                return null;
        }
        kbCache.set(treatmentId, kb);
        return kb;
    } catch (e) {
        console.warn(`Failed to load KB for ${treatmentId}:`, e);
        return null;
    }
}

/**
 * Get a chip definition from treatment KB.
 */
export function getChipFromKb(treatmentId: string, chipId: string): KbChip | null {
    const kb = loadTreatmentKb(treatmentId);
    if (!kb) return null;
    return kb.chips.find(c => c.id === chipId) ?? null;
}

/**
 * Check if a chip exists in treatment KB.
 */
export function hasChipInKb(treatmentId: string, chipId: string): boolean {
    return getChipFromKb(treatmentId, chipId) !== null;
}

/**
 * Get all chip IDs from treatment KB.
 */
export function getAllChipIds(treatmentId: string): string[] {
    const kb = loadTreatmentKb(treatmentId);
    if (!kb) return [];
    return kb.chips.map(c => c.id);
}

// ═══════════════════════════════════════════════════════════════
// TEXT RENDERING
// ═══════════════════════════════════════════════════════════════

/**
 * Substitute variables in text template.
 * @example "{material}" + context.material → "Ca(OH)₂"
 */
function substituteVariables(
    text: string,
    chip: KbChip,
    context: RenderInput['context']
): string {
    let result = text;

    // Find all {varName} patterns
    const varPattern = /\{(\w+)\}/g;
    let match;
    while ((match = varPattern.exec(text)) !== null) {
        const varName = match[1];
        const varDef = chip.variablen?.[varName];

        let value: string;
        if (context?.[varName] !== undefined) {
            value = String(context[varName]);
        } else if (varDef?.default !== undefined) {
            value = String(varDef.default);
        } else {
            value = `[${varName}]`; // Placeholder for missing required var
        }

        result = result.replace(match[0], value);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════

/**
 * Render output from KB chips only.
 *
 * HARD RULES:
 * - Missing chip in KB → throw in DEV, meta.missingChips in PROD
 * - No billingRef for insurance type → meta.missingBillingRefs (unless TEXT_ONLY)
 * - No text outside KB textSnippets
 *
 * M13: When treatmentKb is provided, uses injected KB instead of loader.
 */
export function renderFromKbChips(input: RenderInput): RenderOutput {
    const { chips, treatmentId, insuranceType, textLength, context, treatmentKb } = input;

    const segments: RenderOutput['segments'] = [];
    const billingCodes: string[] = [];
    const meta: RenderOutput['meta'] = {
        missingChips: [],
        textOnlyChips: [],
        missingBillingRefs: [],
    };

    // Normalize insurance type for billingRef lookup
    const billingKey = insuranceType === 'MKV' ? 'GKV' : insuranceType;

    // Helper to get chip - from injected KB or loader
    const getChip = (chipId: string): KbChip | null => {
        if (treatmentKb) {
            // Use injected KB (M13 path - no loader call)
            return treatmentKb.chips.find(c => c.id === chipId) ?? null;
        }
        // Legacy path - use loader
        return getChipFromKb(treatmentId, chipId);
    };

    for (const chipId of chips) {
        const chip = getChip(chipId);

        if (!chip) {
            meta.missingChips.push(chipId);
            if (process.env.NODE_ENV !== 'production') {
                throw new Error(
                    `[SSOT RENDERER] Chip "${chipId}" not found in KB for treatment "${treatmentId}". ` +
                    `NO CHIP WITHOUT KB: Every emitted chip must exist in unified.json.`
                );
            }
            continue;
        }

        // Get text from KB textSnippets
        let text = chip.textSnippets?.[textLength] ??
            chip.textSnippets?.mittel ??
            chip.textSnippets?.kurz ??
            '';

        // Substitute variables
        text = substituteVariables(text, chip, context);

        // Get billing code
        let billingCode: string | undefined;
        if (chip.billingRef === null) {
            // TEXT_ONLY chip (billingRef explicitly null)
            meta.textOnlyChips.push(chipId);
        } else if (chip.billingRef) {
            billingCode = chip.billingRef[billingKey as 'GKV' | 'PKV'];
            if (!billingCode && chip.billingRef.GKV) {
                // Fall back to GKV if PKV not specified
                billingCode = chip.billingRef.GKV;
            }
            if (!billingCode) {
                meta.missingBillingRefs.push(chipId);
            }
        } else {
            // billingRef undefined (should be null for TEXT_ONLY)
            meta.textOnlyChips.push(chipId);
        }

        if (billingCode) {
            billingCodes.push(billingCode);
        }

        segments.push({
            chipId,
            text,
            billingCode,
        });
    }

    // Build full text from segments
    const fullText = segments
        .map(s => s.text)
        .filter(t => t.length > 0)
        .join(' ');

    return {
        fullText,
        billingCodes,
        segments,
        meta,
    };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate that all chips from medical KB exist in treatment KB.
 * Used by gate tests to ensure NO CHIP WITHOUT KB.
 */
export function validateMedicalChipsExistInKb(
    medicalChipIds: string[],
    treatmentId: string
): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const chipId of medicalChipIds) {
        if (!hasChipInKb(treatmentId, chipId)) {
            missing.push(chipId);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}
