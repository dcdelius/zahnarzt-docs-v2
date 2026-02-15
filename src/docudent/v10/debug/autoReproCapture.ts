/**
 * M70: Auto Repro Capture — Stores repro bundle on every pipeline run
 * 
 * Automatically captures pipeline inputs/outputs for deterministic reproduction.
 * Stored in localStorage, accessible via Debug Drawer.
 */

import { createReproBundle, type ReproBundleV1, validateNoSecrets, stripTestOnlyFields } from './reproBundle';

const LAST_REPRO_KEY = 'v10_last_repro';
const REPRO_HISTORY_KEY = 'v10_repro_history';
const MAX_HISTORY = 5;

export interface ReproCaptureInput {
    dictation: string;
    treatmentId: string;
    insuranceType: string;
    textLength?: string;
    multiMode?: boolean;
    answers?: Record<string, unknown>;
    settings?: Record<string, unknown>;
}

export interface ReproCaptureOutput {
    state: string;
    questionIds?: string[];
    chipIds?: string[];
    billingCodesCount?: number;
    errorMessage?: string;
    diagnostic?: string;
}

export interface AutoReproBundle extends ReproBundleV1 {
    resultSummary: ReproCaptureOutput;
}

/**
 * Capture a repro bundle after pipeline run.
 * Automatically stores in localStorage.
 */
export function captureRepro(
    input: ReproCaptureInput,
    output: ReproCaptureOutput
): AutoReproBundle | null {
    try {
        const bundle = createReproBundle({
            pipelineInput: {
                dictation: input.dictation,
                treatmentId: input.treatmentId,
                insuranceType: input.insuranceType,
                textLength: input.textLength,
            },
            settings: input.settings ? { practice: input.settings } : undefined,
        }) as AutoReproBundle;

        // Add result summary
        bundle.resultSummary = output;

        // Validate no secrets
        if (!validateNoSecrets(bundle)) {
            console.warn('[AutoRepro] Bundle contains forbidden keys, skipping storage');
            return null;
        }

        // Strip testOnly for safety
        const safeBundle = stripTestOnlyFields(bundle) as AutoReproBundle;

        // Store in localStorage
        try {
            localStorage.setItem(LAST_REPRO_KEY, JSON.stringify(safeBundle));

            // Add to history (FIFO, max 5)
            const history = getReproHistory();
            history.unshift(safeBundle);
            if (history.length > MAX_HISTORY) {
                history.pop();
            }
            localStorage.setItem(REPRO_HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.warn('[AutoRepro] localStorage write failed:', e);
        }

        return safeBundle;
    } catch (e) {
        console.warn('[AutoRepro] Capture failed:', e);
        return null;
    }
}

/**
 * Get the last captured repro bundle.
 */
export function getLastRepro(): AutoReproBundle | null {
    try {
        const stored = localStorage.getItem(LAST_REPRO_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as AutoReproBundle;
    } catch {
        return null;
    }
}

/**
 * Get repro history (up to 5 recent runs).
 */
export function getReproHistory(): AutoReproBundle[] {
    try {
        const stored = localStorage.getItem(REPRO_HISTORY_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as AutoReproBundle[];
    } catch {
        return [];
    }
}

/**
 * Clear all repro data.
 */
export function clearReproData(): void {
    try {
        localStorage.removeItem(LAST_REPRO_KEY);
        localStorage.removeItem(REPRO_HISTORY_KEY);
    } catch {
        // Ignore
    }
}

/**
 * Copy last repro to clipboard as JSON.
 */
export async function copyLastReproToClipboard(): Promise<boolean> {
    const repro = getLastRepro();
    if (!repro) return false;
    try {
        await navigator.clipboard.writeText(JSON.stringify(repro, null, 2));
        return true;
    } catch {
        return false;
    }
}
