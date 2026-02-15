/**
 * M73: Medical Decision Trace
 * 
 * Test-only instrumentation for deterministic diagnosis of askback/chip wiring.
 * 
 * MUST NOT be enabled in production builds.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MedicalFacts {
    tooth?: string;
    surfaces?: string[];
    profunda?: boolean;
    anesthesiaMentioned?: boolean;
    anesthesiaType?: string;
    isolation?: string;
    canalCount?: number;
    capping?: {
        planned?: boolean;
        material?: string;
    };
}

export interface SettingsSeen {
    user?: {
        defaultLAType?: string;
        defaultCappingMaterial?: string;
        defaultIsolation?: string;
    };
    practice?: {
        alwaysAskIsolation?: boolean;
        skipLAQuestion?: boolean;
    };
}

export interface FiredRule {
    ruleId: string;
    kind: 'askback' | 'emit_chip' | 'derive';
    when: string;
}

export interface AskbackEmitted {
    id: string;
    critical: boolean;
    reasonRuleId: string;
}

export interface AskbackSkipped {
    id: string;
    skippedBy: 'settings' | 'alreadyKnown' | 'override';
    key?: string;
}

export interface ChipEmitted {
    id: string;
    reasonRuleId: string;
    source: 'dictation' | 'settings' | 'answer' | 'override';
}

export interface MedicalDecisionTrace {
    runId: string;
    instanceId: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    facts: MedicalFacts;
    settingsSeen: SettingsSeen;
    firedRules: FiredRule[];
    askbacksEmitted: AskbackEmitted[];
    askbacksSkipped: AskbackSkipped[];
    chipsEmitted: ChipEmitted[];
}

// ═══════════════════════════════════════════════════════════════
// TRACE BUILDER (TEST-ONLY)
// ═══════════════════════════════════════════════════════════════

let currentTrace: MedicalDecisionTrace | null = null;
let traceEnabled = false;

/**
 * Enable medical decision tracing. MUST only be called in test environment.
 */
export function enableMedicalTrace(): void {
    if (process.env.NODE_ENV !== 'test') {
        console.warn('[MedicalTrace] Attempted to enable trace in non-test environment');
        return;
    }
    traceEnabled = true;
}

/**
 * Disable medical decision tracing.
 */
export function disableMedicalTrace(): void {
    traceEnabled = false;
    currentTrace = null;
}

/**
 * Start a new trace for an instance.
 */
export function startTrace(params: {
    runId: string;
    instanceId: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
}): void {
    if (!traceEnabled) return;

    currentTrace = {
        ...params,
        facts: {},
        settingsSeen: {},
        firedRules: [],
        askbacksEmitted: [],
        askbacksSkipped: [],
        chipsEmitted: [],
    };
}

/**
 * Record facts extracted from dictation.
 */
export function recordFacts(facts: MedicalFacts): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.facts = { ...currentTrace.facts, ...facts };
}

/**
 * Record settings that were examined.
 */
export function recordSettingsSeen(settings: SettingsSeen): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.settingsSeen = {
        user: { ...currentTrace.settingsSeen.user, ...settings.user },
        practice: { ...currentTrace.settingsSeen.practice, ...settings.practice },
    };
}

/**
 * Record a rule that fired.
 */
export function recordRuleFired(rule: FiredRule): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.firedRules.push(rule);
}

/**
 * Record an askback that was emitted.
 */
export function recordAskbackEmitted(askback: AskbackEmitted): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.askbacksEmitted.push(askback);
}

/**
 * Record an askback that was skipped.
 */
export function recordAskbackSkipped(skipped: AskbackSkipped): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.askbacksSkipped.push(skipped);
}

/**
 * Record a chip that was emitted.
 */
export function recordChipEmitted(chip: ChipEmitted): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.chipsEmitted.push(chip);
}

/**
 * Finalize and return the trace.
 */
export function finalizeTrace(): MedicalDecisionTrace | null {
    if (!traceEnabled || !currentTrace) return null;
    const trace = { ...currentTrace };
    currentTrace = null;
    return trace;
}

/**
 * Get current trace without finalizing.
 */
export function getCurrentTrace(): MedicalDecisionTrace | null {
    return currentTrace;
}

// ═══════════════════════════════════════════════════════════════
// TRACE ANALYSIS HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a specific askback was emitted.
 */
export function wasAskbackEmitted(trace: MedicalDecisionTrace, askbackId: string): boolean {
    return trace.askbacksEmitted.some(a => a.id === askbackId);
}

/**
 * Check if a specific askback was skipped.
 */
export function wasAskbackSkipped(trace: MedicalDecisionTrace, askbackId: string): boolean {
    return trace.askbacksSkipped.some(a => a.id === askbackId);
}

/**
 * Get askback skip reason.
 */
export function getAskbackSkipReason(trace: MedicalDecisionTrace, askbackId: string): AskbackSkipped | undefined {
    return trace.askbacksSkipped.find(a => a.id === askbackId);
}

/**
 * Check if a rule fired.
 */
export function didRuleFire(trace: MedicalDecisionTrace, ruleId: string): boolean {
    return trace.firedRules.some(r => r.ruleId === ruleId);
}

/**
 * Get all emitted chips by source.
 */
export function getChipsBySource(trace: MedicalDecisionTrace, source: ChipEmitted['source']): ChipEmitted[] {
    return trace.chipsEmitted.filter(c => c.source === source);
}

/**
 * Serialize trace to safe JSON (test-friendly).
 */
export function serializeTrace(trace: MedicalDecisionTrace): string {
    return JSON.stringify(trace, null, 2);
}
