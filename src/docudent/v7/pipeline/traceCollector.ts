/**
 * Pipeline Trace Collector — Wiring Proof System
 * 
 * Purpose: Collect trace markers during pipeline execution for:
 * - Automated wiring tests
 * - Debug inspection
 * - Proof that treatment selection controls the entire flow
 * 
 * Gating: Enabled by VITE_PIPELINE_TRACE=true or in test environment
 */

import type { TraceMarker } from '../../contracts/pipeline';

// ═══════════════════════════════════════════════════════════════
// TRACE COLLECTOR CLASS
// ═══════════════════════════════════════════════════════════════

export class TraceCollector {
    private markers: TraceMarker[] = [];
    private enabled: boolean;

    constructor() {
        // Enable in test mode or when explicitly requested
        this.enabled = this.shouldTrace();
    }

    private shouldTrace(): boolean {
        // Node/test environment
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.VITE_PIPELINE_TRACE === 'true') return true;
            if (process.env.NODE_ENV === 'test') return true;
            if (process.env.VITEST === 'true') return true;
        }
        // Browser environment
        if (typeof window !== 'undefined') {
            if ((import.meta as any)?.env?.VITE_PIPELINE_TRACE === 'true') return true;
            if (localStorage?.getItem('PIPELINE_TRACE') === 'true') return true;
        }
        return false;
    }

    add(stage: TraceMarker['stage'], detail: string): void {
        if (!this.enabled) return;
        this.markers.push({ stage, detail });
    }

    getMarkers(): TraceMarker[] {
        return [...this.markers];
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Format trace as "stage:detail" strings for easy assertion
     */
    toStrings(): string[] {
        return this.markers.map(m => `${m.stage}:${m.detail}`);
    }

    /**
     * Check if trace includes a marker matching pattern
     */
    includes(pattern: string): boolean {
        return this.toStrings().some(s => s.includes(pattern));
    }

    /**
     * Check if trace excludes all markers matching pattern
     */
    excludes(pattern: string): boolean {
        return !this.includes(pattern);
    }
}

// ═══════════════════════════════════════════════════════════════
// TRACE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create trace detail for input stage
 */
export function traceInput(treatmentId: string, insuranceType: string, hasMKV: boolean): string {
    return `treatment=${treatmentId};insurance=${insuranceType};mkv=${hasMKV}`;
}

/**
 * Create trace detail for extract stage
 */
export function traceExtract(engine: string, tooth: string | null, surfaces: string[]): string {
    return `engine=${engine};tooth=${tooth || 'none'};surfaces=${surfaces.join(',')}`;
}

/**
 * Create trace detail for defaults stage
 */
export function traceDefaults(practiceKeys: string[], templateKeys: string[]): string {
    return `practice=${practiceKeys.join(',') || 'none'};template=${templateKeys.join(',') || 'none'}`;
}

/**
 * Create trace detail for questions stage
 */
export function traceQuestions(engine: string, count: number, ids: string[]): string {
    return `engine=${engine};count=${count};ids=${ids.slice(0, 5).join(',')}${ids.length > 5 ? '...' : ''}`;
}

/**
 * Create trace detail for answers stage
 */
export function traceAnswers(count: number, ids: string[]): string {
    return `count=${count};ids=${ids.slice(0, 5).join(',')}${ids.length > 5 ? '...' : ''}`;
}

/**
 * Create trace detail for gate stage
 */
export function traceGate(canProceed: boolean, missingIds: string[]): string {
    return `canProceed=${canProceed};missing=${missingIds.join(',') || 'none'}`;
}

/**
 * Create trace detail for render stage
 */
export function traceRender(sectionIds: string[]): string {
    return `sections=${sectionIds.join(',')}`;
}

/**
 * Create trace detail for billing stage
 */
export function traceBilling(codes: string[], blocked: string[]): string {
    return `codes=${codes.slice(0, 5).join(',')}${codes.length > 5 ? '...' : ''};blocked=${blocked.join(',') || 'none'}`;
}

/**
 * Create trace detail for billing inputs stage (PII-safe)
 */
export function traceBillingInputs(
    treatmentId: string,
    endoStep: string | undefined,
    canalCount: number | undefined,
    insuranceType: string,
    hasMKV: boolean,
    tooth: string | undefined
): string {
    return `treatmentId=${treatmentId};endo_step=${endoStep || 'none'};canal_count=${canalCount ?? 0};insurance=${insuranceType};mkv=${hasMKV};tooth=${tooth || 'none'}`;
}

/**
 * Create trace detail for billing result stage
 */
export function traceBillingResult(
    codesCount: number,
    blockedCount: number,
    reason: string | undefined
): string {
    return `codes=${codesCount};blocked=${blockedCount};reason=${reason || 'none'}`;
}

/**
 * Create trace detail for medical_summary stage (PII-safe)
 */
export function traceMedicalSummary(
    minimalDatasetMet: boolean,
    hardAskbackCount: number,
    softAskbackCount: number,
    findingCount: number
): string {
    return `minimalDataset=${minimalDatasetMet};hard=${hardAskbackCount};soft=${softAskbackCount};findings=${findingCount}`;
}
