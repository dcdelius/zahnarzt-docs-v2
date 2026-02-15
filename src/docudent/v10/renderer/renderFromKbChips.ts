/**
 * V10 SSOT KB Renderer — Strict Rendering from KB Chips Only
 *
 * NO TEXT WITHOUT CHIP: All output text comes from KB textSnippets.
 * NO CHIP WITHOUT KB: Every emitted chip must exist in treatment unified.json.
 */

import { resolveSurfaceBilling, chipUsesSurfaceMapping, type SurfaceMapping } from '../billing/surfaceBillingResolver';
import { defaultTreatmentKbProvider } from '../kb/treatment';
import { jsonTreatmentKbProvider } from '../kb/treatment/providers/jsonProvider';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RenderInput {
    chips: string[];
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    context?: {
        tooth?: string;
        surfaces?: string[];
        material?: string;
        [key: string]: unknown;
    };
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
    fullText: string;
    billingCodes: string[];
    segments: Array<{
        chipId: string;
        text: string;
        billingCode?: string;
    }>;
    meta: {
        missingChips: string[];
        textOnlyChips: string[];
        missingBillingRefs: string[];
    };
}

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
    hinweis?: string;
}

interface TreatmentKb {
    _meta: { id: string; version: string };
    chips: KbChip[];
    surface_mapping?: SurfaceMapping;
}

export function getChipFromKb(treatmentId: string, chipId: string): KbChip | null {
    const kb = defaultTreatmentKbProvider.getTreatmentKb(treatmentId) as TreatmentKb | null;
    if (!kb) return null;
    return kb.chips.find(c => c.id === chipId) ?? null;
}

export function hasChipInKb(treatmentId: string, chipId: string): boolean {
    return getChipFromKb(treatmentId, chipId) !== null;
}

export function getAllChipIds(treatmentId: string): string[] {
    const kb = defaultTreatmentKbProvider.getTreatmentKb(treatmentId) as TreatmentKb | null;
    if (!kb) return [];
    return kb.chips.map(c => c.id);
}

// ═══════════════════════════════════════════════════════════════
// TEXT RENDERING
// ═══════════════════════════════════════════════════════════════

function substituteVariables(
    text: string,
    chip: KbChip,
    context: RenderInput['context']
): string {
    let result = text;
    const varPattern = /\{(\w+)\}/g;
    let match;
    while ((match = varPattern.exec(text)) !== null) {
        const varName = match[1];
        const varDef = chip.variablen?.[varName];

        let value: string;
        const rawValue = context?.[varName];

        if (rawValue !== undefined) {
            // GUARD: Never print raw booleans - format appropriately
            if (typeof rawValue === 'boolean') {
                // Boolean should be mapped to a proper string by now
                // If we get here with a boolean, it's likely a bug in answer wiring
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(`[RENDERER] Boolean value for "${varName}" - expected string/enum. Got: ${rawValue}`);
                }
                // Fallback: use default or show formatted version
                if (varDef?.default !== undefined) {
                    value = String(varDef.default);
                } else {
                    // Skip the variable entirely for booleans
                    value = '';
                }
            } else {
                value = String(rawValue);
            }
        } else if (varDef?.default !== undefined) {
            value = String(varDef.default);
        } else {
            value = `[${varName}]`;
        }

        result = result.replace(match[0], value);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════

export function renderFromKbChips(input: RenderInput): RenderOutput {
    const { chips, treatmentId, insuranceType, textLength, context, treatmentKb } = input;
    const uniqueChips = Array.from(new Set(chips));

    const segments: RenderOutput['segments'] = [];
    const billingCodes: string[] = [];
    const meta: RenderOutput['meta'] = {
        missingChips: [],
        textOnlyChips: [],
        missingBillingRefs: [],
    };

    // MKV Two-Channel: base from GKV, addon from PKV if mehrkostenConfirmed
    const mehrkostenConfirmed = context?.mehrkostenConfirmed === true;

    const getChip = (chipId: string): KbChip | null => {
        if (treatmentKb) {
            const found = treatmentKb.chips.find(c => c.id === chipId);
            if (found) return found;
        }

        // Fallback to JSON KB when Firestore KB is missing a chip
        const jsonKb = jsonTreatmentKbProvider.getTreatmentKb(treatmentId);
        const jsonFound = jsonKb?.chips.find(c => c.id === chipId);
        if (jsonFound) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[KB FALLBACK] Missing chip in active KB, using JSON fallback', {
                    treatmentId,
                    chipId,
                });
            }
            return jsonFound;
        }

        return getChipFromKb(treatmentId, chipId);
    };

    for (const chipId of uniqueChips) {
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

        let text = chip.textSnippets?.[textLength] ??
            chip.textSnippets?.mittel ??
            chip.textSnippets?.kurz ??
            '';

        text = substituteVariables(text, chip, context);

        let billingCode: string | undefined;
        let addonCode: string | undefined;

        if (chip.billingRef === null) {
            // Check if this chip uses surface_mapping for billing
            if (chipUsesSurfaceMapping(chip)) {
                const kb = treatmentKb ?? (defaultTreatmentKbProvider.getTreatmentKb(treatmentId) as TreatmentKb | null);
                const surfaceResult = resolveSurfaceBilling(
                    (kb as { surface_mapping?: SurfaceMapping })?.surface_mapping,
                    context as { surfaces?: string[]; surfaceCount?: number },
                    insuranceType
                );
                if (surfaceResult?.billingCode) {
                    billingCode = surfaceResult.billingCode;
                    // MKV addon from surface_mapping
                    if (insuranceType === 'MKV' && mehrkostenConfirmed && surfaceResult.addonCode) {
                        addonCode = surfaceResult.addonCode;
                    }
                } else {
                    meta.textOnlyChips.push(chipId);
                }
            } else {
                meta.textOnlyChips.push(chipId);
            }
        } else if (chip.billingRef) {
            // MKV Two-Channel: base = GKV, addon = PKV (if mehrkostenConfirmed)
            if (insuranceType === 'MKV') {
                // GIGAPROMPT FIX: Base chips (LA, Kofferdam) have GKV branch
                // and should ONLY use BEMA. Only addon chips (chips WITHOUT GKV branch
                // or with explicit MKV branch) get GOZ addon.
                const hasGkvBranch = !!chip.billingRef.GKV;
                const hasMkvBranch = !!(chip.billingRef as { MKV?: string }).MKV;

                if (hasMkvBranch && mehrkostenConfirmed) {
                    // Explicit MKV branch (e.g., mehrschicht) - use it ONLY when mehrkostenConfirmed
                    // CRITICAL: Do NOT use MKV branch when nurKasse=true or mehrkostenConfirmed=false
                    billingCode = (chip.billingRef as { MKV?: string }).MKV;
                } else if (hasGkvBranch) {
                    // Base chip with GKV branch - BEMA only, NO GOZ addon
                    // Also fallback for MKV chips when mehrkostenConfirmed=false
                    billingCode = chip.billingRef.GKV;
                } else if (chip.billingRef.PKV && mehrkostenConfirmed) {
                    // PKV-only chip - use PKV only when mehrkostenConfirmed (very rare case)
                    billingCode = chip.billingRef.PKV;
                }
                // If no GKV branch and mehrkostenConfirmed=false → chip produces no billing
                // This is correct: addon-only chips should not produce BEMA
            } else {
                // GKV or PKV: direct lookup
                billingCode = chip.billingRef[insuranceType as 'GKV' | 'PKV'];
            }
            if (!billingCode) {
                meta.missingBillingRefs.push(chipId);
            }
        } else {
            meta.textOnlyChips.push(chipId);
        }

        if (billingCode) {
            billingCodes.push(billingCode);
        }
        if (addonCode) {
            billingCodes.push(addonCode);
        }

        segments.push({
            chipId,
            text,
            billingCode,
        });
    }

    const fullText = segments
        .map(s => s.text)
        .filter(t => t.length > 0)
        .join(' ');

    const uniqueBillingCodes = Array.from(new Set(billingCodes));

    return {
        fullText,
        billingCodes: uniqueBillingCodes,
        segments,
        meta,
    };
}

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
