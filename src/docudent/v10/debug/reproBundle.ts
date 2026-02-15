/**
 * M41: Repro Bundle Type
 * 
 * Serializable bundle for reproducible bug reports.
 */

// ═══════════════════════════════════════════════════════════════
// REPRO BUNDLE V1
// ═══════════════════════════════════════════════════════════════

export interface ReproBundleV1 {
    version: 'repro-v1';
    createdAt: string;
    pipelineInput: {
        dictation: string;
        treatmentId: string;
        insuranceType: string;
        textLength?: string;
    };
    settings?: {
        practice?: Record<string, unknown>;
        user?: Record<string, unknown>;
    };
    chipOverrides?: Record<string, Record<string, { mode: 'auto' | 'on' | 'off'; value?: unknown }>>;
    answersByInstance?: Record<string, Record<string, unknown>>;
    kbMeta?: {
        treatmentKbVersion?: string;
        treatmentKbHash?: string;
        medicalKbVersion?: string;
    };
    lastExplainHash?: string;
    testOnly?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a repro bundle from current state.
 */
export function createReproBundle(input: Omit<ReproBundleV1, 'version' | 'createdAt'>): ReproBundleV1 {
    return {
        version: 'repro-v1',
        createdAt: new Date().toISOString(),
        ...input,
    };
}

/**
 * Serialize bundle to stable JSON (deterministic).
 */
export function serializeReproBundle(bundle: ReproBundleV1): string {
    // Simple stringify - deterministic for same bundle
    return JSON.stringify(bundle, null, 2);
}

/**
 * Parse and validate repro bundle.
 */
export function parseReproBundle(json: string): ReproBundleV1 | null {
    try {
        const parsed = JSON.parse(json);
        if (parsed.version !== 'repro-v1') {
            console.warn('[ReproBundle] Invalid version:', parsed.version);
            return null;
        }
        if (!parsed.pipelineInput?.dictation) {
            console.warn('[ReproBundle] Missing pipelineInput.dictation');
            return null;
        }
        return parsed as ReproBundleV1;
    } catch (e) {
        console.warn('[ReproBundle] Parse error:', e);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_KEYS = ['token', 'apikey', 'secret', 'password', 'credential'];

/**
 * Check bundle does not contain secrets.
 */
export function validateNoSecrets(bundle: ReproBundleV1): boolean {
    const json = JSON.stringify(bundle).toLowerCase();
    return !FORBIDDEN_KEYS.some(key => json.includes(key));
}

/**
 * Strip testOnly fields for prod export.
 */
export function stripTestOnlyFields(bundle: ReproBundleV1): ReproBundleV1 {
    const copy = { ...bundle };
    delete copy.testOnly;
    return copy;
}

// ═══════════════════════════════════════════════════════════════
// MINIMAL REPRO GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Strip non-essential keys for minimal repro.
 */
export function createMinimalRepro(bundle: ReproBundleV1): ReproBundleV1 {
    return {
        version: bundle.version,
        createdAt: bundle.createdAt,
        pipelineInput: bundle.pipelineInput,
        settings: bundle.settings,
        chipOverrides: bundle.chipOverrides,
        answersByInstance: bundle.answersByInstance,
        // Exclude: kbMeta, lastExplainHash, testOnly
    };
}
