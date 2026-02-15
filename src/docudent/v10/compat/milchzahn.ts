/**
 * V10 Milchzahn Detection
 *
 * Detects deciduous teeth (FDI 51-85) and checks if they're supported.
 * Respects the VITE_V7_MILCHZAHN_FUELLUNG feature flag.
 */

// ═══════════════════════════════════════════════════════════════
// MILCHZAHN DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a tooth number is a deciduous (milk) tooth.
 * FDI notation: quadrants 5-8, positions 1-5
 */
export function isMilchzahn(tooth: string | null | undefined): boolean {
    if (!tooth || !/^\d{2}$/.test(tooth)) return false;

    const quadrant = parseInt(tooth[0], 10);
    const position = parseInt(tooth[1], 10);

    // Deciduous teeth: quadrants 5-8, positions 1-5
    return quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
}

/**
 * Check if milchzahn support is enabled for a treatment.
 *
 * Currently only fuellung has a feature flag (VITE_V7_MILCHZAHN_FUELLUNG).
 */
export function isMilchzahnSupported(treatmentId: string): boolean {
    // Check feature flag
    const flagEnabled = checkMilchzahnFlag();

    // Currently only fuellung is gated by the flag
    if (treatmentId === 'fuellung') {
        return flagEnabled;
    }

    // Other treatments: milchzahn is not supported (yet)
    return false;
}

/**
 * Check the milchzahn feature flag.
 */
function checkMilchzahnFlag(): boolean {
    // Node/test environment
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.VITE_V7_MILCHZAHN_FUELLUNG === '1') return true;
    }
    // Browser environment
    if (typeof window !== 'undefined') {
        try {
            if ((import.meta as any)?.env?.VITE_V7_MILCHZAHN_FUELLUNG === '1') return true;
        } catch {
            // Ignore
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════
// V10 INTEGRATION
// ═══════════════════════════════════════════════════════════════

export interface MilchzahnCheckResult {
    /** Whether the case is unsupported due to milchzahn */
    unsupported: boolean;
    /** Reason for being unsupported */
    reason?: string;
    /** List of detected milchzahn teeth */
    milchzahnTeeth: string[];
}

/**
 * Check if any teeth in the input are unsupported milchzahn.
 *
 * @param teeth - List of teeth to check
 * @param treatmentId - Treatment type
 * @returns Check result with unsupported flag and reason
 */
export function checkMilchzahnSupport(
    teeth: (string | null | undefined)[],
    treatmentId: string
): MilchzahnCheckResult {
    // Find all milchzahn teeth
    const milchzahnTeeth = teeth.filter((t): t is string => isMilchzahn(t));

    if (milchzahnTeeth.length === 0) {
        return {
            unsupported: false,
            milchzahnTeeth: [],
        };
    }

    // Check if milchzahn is supported for this treatment
    const supported = isMilchzahnSupported(treatmentId);

    if (supported) {
        return {
            unsupported: false,
            milchzahnTeeth,
        };
    }

    // Milchzahn detected but not supported
    return {
        unsupported: true,
        reason: `Milchzahn (${milchzahnTeeth.join(', ')}) nicht unterstützt für ${treatmentId}`,
        milchzahnTeeth,
    };
}
