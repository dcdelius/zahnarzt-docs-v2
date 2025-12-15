/**
 * Analog Justification Service
 * 
 * Manages persistence of user-entered justifications for analog billing.
 * 
 * DESIGN NOTES:
 * - v5 flow has no persistent caseId; uses local React state
 * - Runtime: justifications stored in controller state (survives navigation)
 * - Tests: in-memory store for deterministic testing
 * - Production: ready for Firestore swap via adapter pattern
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnalogJustification {
    /** Analog code (e.g., "ANALOG_Kons_04") */
    analogCode: string;

    /** User-entered justification text (30..500 chars) */
    justificationText: string;

    /** Selected comparison code (e.g., "GOZ_2010") */
    selectedComparisonCode?: string;

    /** Multiple selected codes (optional) */
    selectedComparisonCodes?: string[];

    /** ISO timestamp of creation */
    createdAtISO: string;

    /** ISO timestamp of last update */
    updatedAtISO: string;
}

export type AnalogJustificationMap = Record<string, AnalogJustification>;

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

export const JUSTIFICATION_MIN_LENGTH = 30;
export const JUSTIFICATION_MAX_LENGTH = 500;

export function isValidJustification(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length >= JUSTIFICATION_MIN_LENGTH &&
        trimmed.length <= JUSTIFICATION_MAX_LENGTH;
}

export function getJustificationStatus(
    justification: AnalogJustification | undefined
): 'missing' | 'saved' {
    if (!justification) return 'missing';
    return isValidJustification(justification.justificationText) ? 'saved' : 'missing';
}

// ═══════════════════════════════════════════════════════════════
// ADAPTER INTERFACE (for Firestore swap later)
// ═══════════════════════════════════════════════════════════════

export interface JustificationStorageAdapter {
    save(caseId: string, justification: AnalogJustification): Promise<void>;
    load(caseId: string): Promise<AnalogJustificationMap>;
    clear(): void;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY ADAPTER (for tests ONLY)
// ═══════════════════════════════════════════════════════════════

const testStore = new Map<string, AnalogJustificationMap>();

export const inMemoryAdapter: JustificationStorageAdapter = {
    async save(caseId: string, justification: AnalogJustification): Promise<void> {
        if (!testStore.has(caseId)) {
            testStore.set(caseId, {});
        }
        testStore.get(caseId)![justification.analogCode] = justification;
    },
    async load(caseId: string): Promise<AnalogJustificationMap> {
        return testStore.get(caseId) || {};
    },
    clear(): void {
        testStore.clear();
    }
};

// ═══════════════════════════════════════════════════════════════
// RUNTIME ADAPTER (uses controller state, not global)
// ═══════════════════════════════════════════════════════════════

/**
 * Factory for creating a state-based adapter.
 * The adapter writes directly into the provided state setter.
 */
export function createStateAdapter(
    getState: () => AnalogJustificationMap,
    setState: (map: AnalogJustificationMap) => void
): JustificationStorageAdapter {
    return {
        async save(_caseId: string, justification: AnalogJustification): Promise<void> {
            const current = getState();
            setState({
                ...current,
                [justification.analogCode]: justification
            });
        },
        async load(_caseId: string): Promise<AnalogJustificationMap> {
            return getState();
        },
        clear(): void {
            setState({});
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT ADAPTER (switches based on environment)
// ═══════════════════════════════════════════════════════════════

let activeAdapter: JustificationStorageAdapter = inMemoryAdapter;

export function setAdapter(adapter: JustificationStorageAdapter): void {
    activeAdapter = adapter;
}

export function getAdapter(): JustificationStorageAdapter {
    return activeAdapter;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Save an analog justification.
 * 
 * @param caseId - Session/case identifier (can be generated if none exists)
 * @param justification - The justification data
 */
export async function saveAnalogJustification(
    caseId: string,
    justification: AnalogJustification
): Promise<void> {
    if (!isValidJustification(justification.justificationText)) {
        throw new Error(`Justification must be ${JUSTIFICATION_MIN_LENGTH}-${JUSTIFICATION_MAX_LENGTH} chars`);
    }
    await activeAdapter.save(caseId, justification);
}

/**
 * Load all analog justifications for a case.
 */
export async function loadAnalogJustifications(
    caseId: string
): Promise<AnalogJustificationMap> {
    return activeAdapter.load(caseId);
}

/**
 * Clear the test store (for test cleanup only).
 */
export function clearAnalogJustificationStoreForTests(): void {
    inMemoryAdapter.clear();
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Create justification object
// ═══════════════════════════════════════════════════════════════

export function createAnalogJustification(
    analogCode: string,
    justificationText: string,
    selectedComparisonCode?: string,
    selectedComparisonCodes?: string[]
): AnalogJustification {
    const now = new Date().toISOString();
    return {
        analogCode,
        justificationText: justificationText.trim(),
        selectedComparisonCode,
        selectedComparisonCodes,
        createdAtISO: now,
        updatedAtISO: now
    };
}
