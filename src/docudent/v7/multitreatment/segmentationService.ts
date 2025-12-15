/**
 * Segmentation Service — Deterministic Dictation Segmenter
 * 
 * Converts a raw dictation string into a MultiTreatmentPlan.
 * Uses simple keyword matching (no LLM).
 * 
 * Safety: If uncertain, produces 1 segment with treatmentId='fuellung' (fallback).
 */

import type {
    MultiTreatmentPlan,
    TreatmentSegment,
    CrossTreatmentContext,
} from './types';

// ═══════════════════════════════════════════════════════════════
// INPUT TYPE
// ═══════════════════════════════════════════════════════════════

export interface SegmentDictationInput {
    /** Raw dictation text */
    dictation: string;
    /** Insurance type */
    insuranceType: 'GKV' | 'PKV';
    /** Text length preference */
    textLength: 'kurz' | 'mittel' | 'lang';
    /** Has MKV agreement */
    hasMKV: boolean;
    /** User defaults for pre-filling answers */
    userDefaults?: Record<string, Record<string, unknown>>;
    /** Session identifier (optional, generated if not provided) */
    sessionId?: string;
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD PATTERNS
// ═══════════════════════════════════════════════════════════════

const ENDO_PATTERN = /endo|wurzel|wurzelbehandlung|kanal/i;
// Surface abbreviations need word boundaries to avoid matching within words (e.g., "Endo" matching "do")
const FUELLUNG_PATTERN = /füllung|fuellung|komposit|kavität|kavitaet|\bmod\b|\bod\b|\bmo\b|\bdo\b/i;
const TOOTH_PATTERN = /(1[1-8]|2[1-8]|3[1-8]|4[1-8])/g;

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Segment a dictation into a MultiTreatmentPlan.
 * 
 * Rules (order matters):
 * 1. If dictation contains endo keywords => create endo segment
 * 2. If dictation contains fuellung keywords => create fuellung segment
 * 3. If both => create 2 segments [endo, fuellung]
 * 4. If neither => fallback to 1 segment fuellung
 */
export function segmentDictation(input: SegmentDictationInput): MultiTreatmentPlan {
    const {
        dictation,
        insuranceType,
        textLength,
        hasMKV,
        userDefaults,
        sessionId,
    } = input;

    // Detect treatment types
    const hasEndo = ENDO_PATTERN.test(dictation);
    const hasFuellung = FUELLUNG_PATTERN.test(dictation);

    // Extract teeth
    const toothScope = extractTeeth(dictation);

    // Build segments based on detection
    const segments: TreatmentSegment[] = [];
    let segmentIndex = 1;

    if (hasEndo) {
        segments.push(createSegment(
            `seg-${segmentIndex++}`,
            'endo',
            dictation,
            toothScope
        ));
    }

    if (hasFuellung) {
        segments.push(createSegment(
            `seg-${segmentIndex++}`,
            'fuellung',
            dictation,
            toothScope
        ));
    }

    // Safety fallback: if no treatments detected, default to fuellung
    if (segments.length === 0) {
        segments.push(createSegment(
            'seg-1',
            'fuellung',
            dictation,
            toothScope
        ));
    }

    // Build context
    const context: CrossTreatmentContext = {
        sessionId: sessionId || `session-${Date.now()}`,
        insuranceType,
        textLength,
        hasMKV,
        userDefaults,
    };

    return {
        segments,
        executionOrder: 'sequential',
        context,
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract tooth numbers from dictation.
 */
function extractTeeth(dictation: string): string[] {
    const matches = dictation.match(TOOTH_PATTERN);
    if (!matches) return [];
    // Deduplicate
    return [...new Set(matches)];
}

/**
 * Create a treatment segment with stub extracted data.
 */
function createSegment(
    id: string,
    treatmentId: string,
    dictationSlice: string,
    toothScope: string[]
): TreatmentSegment {
    return {
        id,
        treatmentId,
        dictationSlice,
        extracted: {
            tooth: toothScope.length === 1 ? toothScope[0] : null,
            surfaces: [],
            diagnosis: null,
            mentioned: {},
        },
        answers: new Map(),
        toothScope,
    };
}

export default { segmentDictation };
