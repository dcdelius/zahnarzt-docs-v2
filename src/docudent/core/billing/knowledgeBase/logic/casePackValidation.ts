/**
 * Case Pack Validation Logic (Shared)
 * 
 * Centralized validation rules for CASE_13+ clinical fields.
 * Used by both validate_case_pack_v2.ts and import_case_pack_v2.ts.
 * 
 * LEGACY EXEMPTION: CASE_01-12 are never subject to v2 clinical field validation.
 */

import { extractBk } from './fzCode';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const V2_CASE_START = 13;

// BK codes where bonusStatus IS required
const BONUS_REQUIRED_BK = ['1', '2', '7'];

// BK codes for Repair-only exemption (no bonusStatus required)
const REPAIR_NO_BONUS_BK = ['6'];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ClinicalFieldValidation {
    isValid: boolean;
    missingFields: string[];
    errors: string[];
}

export interface CaseData {
    id: string;
    category?: string;
    befundklasse?: string;
    kiefer?: string;
    teeth?: string[];
    zahnlos?: boolean;
    bonusStatus?: string;
    festzuschuss?: { fzCodes?: string[] };
    [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Parses case ID to extract numeric part.
 * Returns null if parsing fails (legacy-safe).
 */
export function parseCaseNumber(caseId: string): number | null {
    const match = caseId.match(/^CASE_(\d+)$/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
}

/**
 * Returns true if case requires v2 clinical field validation.
 * CASE_01-12 are exempt (legacy).
 */
export function isV2ClinicalRequired(caseId: string): boolean {
    const num = parseCaseNumber(caseId);
    return num !== null && num >= V2_CASE_START;
}

function hasBonusRelevantFzCodes(fzCodes: string[]): boolean {
    for (const code of fzCodes) {
        const bk = extractBk(code);
        if (bk && BONUS_REQUIRED_BK.includes(bk)) {
            return true;
        }
    }
    return false;
}

function isRepairOnlyCase(c: CaseData): boolean {
    if (c.category !== 'REPAIR') return false;

    const fzCodes = c.festzuschuss?.fzCodes ?? [];
    for (const code of fzCodes) {
        const bk = extractBk(code);
        if (bk && !REPAIR_NO_BONUS_BK.includes(bk)) {
            return false; // Has FZ from bonus-relevant BK
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Validates clinical fields for CASE_13+ cases.
 * 
 * LEGACY EXEMPTION: CASE_01-12 always return isValid=true.
 * 
 * Returns validation result with specific errors.
 */
export function validateClinicalFields(c: CaseData): ClinicalFieldValidation {
    // Legacy exemption: CASE_01-12 are always valid
    if (!isV2ClinicalRequired(c.id)) {
        return { isValid: true, missingFields: [], errors: [] };
    }

    const missingFields: string[] = [];
    const errors: string[] = [];

    // Rule 1: kiefer is always required for v2 cases
    if (c.kiefer === undefined) {
        missingFields.push('kiefer');
        errors.push('missingField: kiefer');
    }

    // Rule 2: teeth (non-empty array) OR zahnlos === true
    const hasTeeth = Array.isArray(c.teeth) && c.teeth.length > 0;
    const isZahnlos = c.zahnlos === true;

    if (!hasTeeth && !isZahnlos) {
        missingFields.push('teethOrZahnlos');
        errors.push('missingField: teethOrZahnlos');
    }

    // Rule 3: bonusStatus required if category=ZE or has bonus-relevant FZ codes
    // Rule 4: Repair-only cases (REPAIR + only BK6 codes) exempted
    const fzCodes = c.festzuschuss?.fzCodes ?? [];
    const needsBonus = (c.category === 'ZE') || hasBonusRelevantFzCodes(fzCodes);
    const isRepairOnly = isRepairOnlyCase(c);

    if (needsBonus && !isRepairOnly) {
        if (c.bonusStatus === undefined) {
            missingFields.push('bonusStatus');
            errors.push('missingField: bonusStatus');
        }
    }

    return {
        isValid: errors.length === 0,
        missingFields,
        errors,
    };
}
