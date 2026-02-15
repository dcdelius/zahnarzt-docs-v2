/**
 * Tooth Region Detection — Utility for determining anesthesia settings group
 * 
 * Parses FDI tooth notation and determines:
 * - Jaw (upper/lower)
 * - Region (anterior/posterior)
 * 
 * Used to select the correct anesthesia settings group key.
 */

export type ToothRegion = 'uk-posterior' | 'ok-posterior' | 'front' | 'unknown';

/**
 * Parse FDI tooth number (e.g., "36", "15", "21")
 */
export function parseToothFDI(tooth: string | null | undefined): { quadrant: number; position: number } | null {
    if (!tooth) return null;

    // Clean the string
    const cleaned = tooth.replace(/[.\s]/g, '');
    const num = parseInt(cleaned, 10);

    // Valid range: 11-48 (permanent), 51-85 (deciduous)
    if (isNaN(num) || num < 11 || num > 85) return null;

    const quadrant = Math.floor(num / 10);
    const position = num % 10;

    return { quadrant, position };
}

/**
 * Determine tooth region for anesthesia settings
 * 
 * Quadrants:
 * - 1, 2 = Upper jaw (OK)
 * - 3, 4 = Lower jaw (UK)
 * - 5, 6 = Deciduous upper
 * - 7, 8 = Deciduous lower
 * 
 * Positions:
 * - 1-3 = Anterior (Frontzähne)
 * - 4-8 = Posterior (Seitenzähne)
 */
export function getToothRegion(tooth: string | null | undefined): ToothRegion {
    const parsed = parseToothFDI(tooth);
    if (!parsed) return 'unknown';

    const { quadrant, position } = parsed;

    // Determine jaw
    const isUpperJaw = [1, 2, 5, 6].includes(quadrant);
    const isLowerJaw = [3, 4, 7, 8].includes(quadrant);

    // Determine anterior/posterior (position 1-3 = anterior, 4+ = posterior)
    const isAnterior = position >= 1 && position <= 3;

    if (isAnterior) {
        return 'front';
    }

    if (isUpperJaw) {
        return 'ok-posterior';
    }

    if (isLowerJaw) {
        return 'uk-posterior';
    }

    return 'unknown';
}

/**
 * Get the settings registry group key for anesthesia based on tooth region
 */
export function getAnesthesiaGroupKey(tooth: string | null | undefined): string {
    const region = getToothRegion(tooth);

    switch (region) {
        case 'uk-posterior':
            return 'anesthesia.ukPosteriorMode';
        case 'ok-posterior':
            return 'anesthesia.okPosteriorMode';
        case 'front':
            return 'anesthesia.frontMode';
        default:
            // Default to UK posterior (most complex case)
            return 'anesthesia.ukPosteriorMode';
    }
}

/**
 * Get the settings path for a given anesthesia group key
 */
export function getAnesthesiaSettingsPath(groupKey: string): 'ukPosteriorMode' | 'okPosteriorMode' | 'frontMode' {
    switch (groupKey) {
        case 'anesthesia.ukPosteriorMode':
            return 'ukPosteriorMode';
        case 'anesthesia.okPosteriorMode':
            return 'okPosteriorMode';
        case 'anesthesia.frontMode':
            return 'frontMode';
        default:
            return 'ukPosteriorMode';
    }
}

/**
 * Check if surfaces include approximal surfaces (mesial/distal)
 */
export function hasApproximalSurfaces(surfaces: string[] | null | undefined): boolean {
    if (!surfaces || surfaces.length === 0) return false;

    const approximalLetters = ['m', 'd', 'M', 'D'];
    return surfaces.some(s =>
        approximalLetters.some(letter => s.includes(letter))
    );
}
