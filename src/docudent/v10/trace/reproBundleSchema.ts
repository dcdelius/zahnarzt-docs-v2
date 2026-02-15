/**
 * V10 Repro Bundle Schema — Flight Recorder
 * 
 * A repro bundle captures everything needed to deterministically replay
 * a V10 pipeline run and verify parity.
 */

export const REPRO_BUNDLE_VERSION = '1.0';

export interface ReproBundleInput {
    dictation: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    hasMKV: boolean;
    answers: Record<string, unknown>;
}

export interface ReproBundleCaptured {
    extraction: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        mentioned: Record<string, unknown>;
    };
    facts: Record<string, unknown>;
    askbacks: Array<{ id: string; reason: string; critical: boolean }>;
    questions: Array<{ id: string; questionKey: string }>;
    chips: Array<{ id: string; source: string }>;
    billingGuardRemovals: Array<{ chipId: string; reason: string }>;
    billingCodes: Array<{ code: string; system: string }>;
    combinabilityVerdict: 'PASS' | 'WARN' | 'BLOCK';
    finalState: 'idle' | 'questions' | 'output' | 'error';
    fullText: string;
}

export interface ReproBundleBuildInfo {
    gitSha: string;
    timestamp: number;
    kbHashes: {
        medicalKb: string;
        fuellungUnified: string;
        endoUnified: string;
    };
}

export interface ReproBundleMeta {
    runId: string;
    version: string;
    sanitized: boolean;
    createdAt: string;
}

export interface ReproBundle {
    meta: ReproBundleMeta;
    input: ReproBundleInput;
    captured: ReproBundleCaptured;
    buildInfo: ReproBundleBuildInfo;
    trace?: {
        runId: string;
        events: Array<{
            ts: number;
            stage: string;
            detail: string;
            data?: unknown;
        }>;
    };
}

/**
 * Fields to compare for parity verification
 */
export interface ReproParityFields {
    finalState: string;
    questionIds: string[];
    chipIds: string[];
    billingCodes: string[];
    fullTextHash: string;
    combinabilityVerdict: string;
}

/**
 * Result of parity comparison
 */
export interface ReproParityResult {
    match: boolean;
    diff: {
        field: string;
        expected: unknown;
        actual: unknown;
    }[];
}
