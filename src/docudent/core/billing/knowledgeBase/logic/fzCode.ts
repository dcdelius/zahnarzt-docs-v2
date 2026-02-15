/**
 * FZ Code Parser Utility
 * 
 * Centralized parsing of Festzuschuss codes (FZ_...).
 * Single source of truth for BK extraction and format validation.
 */

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Valid FZ code pattern:
 * - Starts with FZ_
 * - Followed by one or more digits
 * - Optionally followed by any number of .digits groups
 * - Optionally ends with a single lowercase letter
 * 
 * Examples: FZ_1.1, FZ_6.8.1, FZ_3.2a, FZ_7.2
 */
export const FZ_CODE_PATTERN = /^FZ_\d+(\.\d+)*[a-z]?$/;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FzParse {
    /** Original raw input */
    raw: string;
    /** Whether the format is valid */
    isValid: boolean;
    /** Befundklasse (first digit after FZ_), e.g. "1", "6", "7" */
    bk: string | null;
    /** Full code without FZ_ prefix, e.g. "6.8.1", "3.2a" */
    code: string | null;
}

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Parses an FZ code string into its components.
 * 
 * @param raw - The raw FZ code string (e.g. "FZ_6.8.1")
 * @returns FzParse object with isValid, bk, and code
 * 
 * @example
 * parseFzCode("FZ_6.8.1") // { raw: "FZ_6.8.1", isValid: true, bk: "6", code: "6.8.1" }
 * parseFzCode("FZ_3.2a")  // { raw: "FZ_3.2a", isValid: true, bk: "3", code: "3.2a" }
 * parseFzCode("invalid")  // { raw: "invalid", isValid: false, bk: null, code: null }
 */
export function parseFzCode(raw: string): FzParse {
    const base = { raw };

    if (!FZ_CODE_PATTERN.test(raw)) {
        return { ...base, isValid: false, bk: null, code: null };
    }

    // Extract code without FZ_ prefix
    const code = raw.slice(3); // Remove "FZ_"

    // Extract BK (first digit)
    const bk = code.charAt(0);

    return {
        ...base,
        isValid: true,
        bk,
        code,
    };
}

/**
 * Extracts Befundklasse from an FZ code.
 * Convenience function that returns just the BK or null if invalid.
 * 
 * @param raw - The raw FZ code string
 * @returns The Befundklasse ("1"-"9") or null if invalid
 * 
 * @example
 * extractBk("FZ_6.8") // "6"
 * extractBk("FZ_1.1") // "1"
 * extractBk("invalid") // null
 */
export function extractBk(raw: string): string | null {
    return parseFzCode(raw).bk;
}

/**
 * Checks if a string is a valid FZ code format.
 * 
 * @param raw - The string to check
 * @returns true if valid FZ format, false otherwise
 */
export function isValidFzCode(raw: string): boolean {
    return FZ_CODE_PATTERN.test(raw);
}
