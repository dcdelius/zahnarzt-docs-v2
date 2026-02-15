/**
 * M74: Unified Wiring Trace
 * 
 * Cross-boundary instrumentation for full-system wiring audit.
 * Test-only: Enabled via process.env.NODE_ENV === 'test' or testOnly flag.
 * 
 * Collects snapshots at:
 * - UI boundary (payload before pipeline call)
 * - V10 run boundary (extraction, facts, askbacks, chips, billing, render)
 * - UI normalization boundary (UiModel)
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface UiBoundarySnapshot {
    timestamp: number;
    treatmentId: string;
    insuranceType: string;
    textLength: string;
    isMultiMode: boolean;
    dictationLength: number;
    settingsKeys: string[];
    overrideKeys: string[];
}

export interface V10InputSnapshot {
    treatmentId: string;
    insuranceType: string;
    textLength: string;
    dictationLength: number;
    answersCount: number;
    toothList?: string[];
    testOnlyApplied: boolean;
}

export interface ExtractionSnapshot {
    extractorEngine: 'stub' | 'llm' | 'forced';
    tooth?: string;
    teeth?: string[];
    surfacesDetected: string[];
    diagnosisDetected?: string;
    cariesDepth?: string;
    mentionedKeys: string[];
}

export interface FactsSnapshot {
    treatmentId: string;
    tooth?: string;
    surfaces?: string[];
    profunda?: boolean;
    anesthesiaMentioned?: boolean;
    anesthesiaType?: string;
    isolation?: string;
    canalCount?: number;
}

export interface AskbacksSnapshot {
    required: string[];
    optional: string[];
    emitted: string[];
    skipped: Array<{ id: string; reason: string }>;
}

export interface ChipsSnapshot {
    emitted: string[];
    sources: Record<string, 'dictation' | 'settings' | 'answer' | 'override'>;
    billingGuardAllowed: string[];
    billingGuardBlocked: string[];
}

export interface RenderSnapshot {
    fullTextLength: number;
    billingCodesCount: number;
    billingCodes: string[];
    segmentsCount: number;
    missingChips: string[];
}

export interface CombinabilitySnapshot {
    checked: boolean;
    verdict: 'OK' | 'WARN' | 'BLOCK' | null;
    violationCount: number;
}

export interface UiModelSnapshot {
    state: string;
    step?: string;
    questionsCount: number;
    outputPresent: boolean;
    diagnostic?: Record<string, unknown>;
}

export interface WiringTrace {
    runId: string;
    timestamp: number;
    ui?: UiBoundarySnapshot;
    v10Input?: V10InputSnapshot;
    extraction?: ExtractionSnapshot;
    facts?: FactsSnapshot;
    askbacks?: AskbacksSnapshot;
    chips?: ChipsSnapshot;
    render?: RenderSnapshot;
    combinability?: CombinabilitySnapshot;
    uiModel?: UiModelSnapshot;
    errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// TRACE COLLECTOR (TEST-ONLY)
// ═══════════════════════════════════════════════════════════════

let traceEnabled = false;
let currentTrace: WiringTrace | null = null;
const traceHistory: WiringTrace[] = [];

export function enableWiringTrace(): void {
    if (process.env.NODE_ENV !== 'test') {
        console.warn('[WiringTrace] Attempted to enable in non-test environment');
        return;
    }
    traceEnabled = true;
}

export function disableWiringTrace(): void {
    traceEnabled = false;
    currentTrace = null;
}

export function startWiringTrace(runId: string): void {
    if (!traceEnabled) return;
    currentTrace = {
        runId,
        timestamp: Date.now(),
        errors: [],
    };
}

export function recordUiBoundary(snapshot: UiBoundarySnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.ui = snapshot;
}

export function recordV10Input(snapshot: V10InputSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.v10Input = snapshot;
}

export function recordExtraction(snapshot: ExtractionSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.extraction = snapshot;
}

export function recordFacts(snapshot: FactsSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.facts = snapshot;
}

export function recordAskbacks(snapshot: AskbacksSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.askbacks = snapshot;
}

export function recordChips(snapshot: ChipsSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.chips = snapshot;
}

export function recordRender(snapshot: RenderSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.render = snapshot;
}

export function recordCombinability(snapshot: CombinabilitySnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.combinability = snapshot;
}

export function recordUiModel(snapshot: UiModelSnapshot): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.uiModel = snapshot;
}

export function recordError(error: string): void {
    if (!traceEnabled || !currentTrace) return;
    currentTrace.errors.push(error);
}

export function finalizeWiringTrace(): WiringTrace | null {
    if (!traceEnabled || !currentTrace) return null;
    const trace = { ...currentTrace };
    traceHistory.push(trace);
    currentTrace = null;
    return trace;
}

export function getTraceHistory(): WiringTrace[] {
    return [...traceHistory];
}

export function clearTraceHistory(): void {
    traceHistory.length = 0;
}

export function getLastTrace(): WiringTrace | null {
    return traceHistory[traceHistory.length - 1] || null;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS HELPERS
// ═══════════════════════════════════════════════════════════════

export function validateTraceCompleteness(trace: WiringTrace): { complete: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!trace.v10Input) missing.push('v10Input');
    if (!trace.extraction) missing.push('extraction');
    if (!trace.facts) missing.push('facts');
    if (!trace.askbacks) missing.push('askbacks');
    if (!trace.chips) missing.push('chips');
    if (!trace.render) missing.push('render');
    if (!trace.uiModel) missing.push('uiModel');
    return { complete: missing.length === 0, missing };
}

export function serializeTrace(trace: WiringTrace): string {
    return JSON.stringify(trace, null, 2);
}
