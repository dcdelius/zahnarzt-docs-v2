/**
 * SHARED CONTRACTS — ValidationWarning
 *
 * This is the SINGLE SOURCE OF TRUTH for validation warnings.
 * All modules (backend AND frontend) MUST import from here.
 *
 * ❌ No inline copies allowed
 * ❌ No string[] warnings anywhere
 */

export interface ValidationWarning {
    /** Unique identifier for this warning */
    id: string;

    /** Warning severity */
    type: 'regress' | 'warning' | 'info';

    /** Short title for display */
    title: string;

    /** Full description */
    description: string;

    /** Affected billing codes */
    affectedCodes: string[];

    /** Optional action hint */
    action?: string;
}

/**
 * Create a warning from a simple string (for migration).
 * This should ONLY be used in backend code during migration.
 */
export function createWarningFromString(
    message: string,
    index: number = 0
): ValidationWarning {
    return {
        id: `warn-${index}`,
        type: 'warning',
        title: 'Hinweis',
        description: message,
        affectedCodes: []
    };
}

/**
 * Create a regress warning (high priority).
 */
export function createRegressWarning(
    id: string,
    title: string,
    description: string,
    affectedCodes: string[] = []
): ValidationWarning {
    return {
        id,
        type: 'regress',
        title,
        description,
        affectedCodes
    };
}

/**
 * Create an info warning (low priority).
 */
export function createInfoWarning(
    id: string,
    title: string,
    description: string,
    affectedCodes: string[] = []
): ValidationWarning {
    return {
        id,
        type: 'info',
        title,
        description,
        affectedCodes
    };
}
