/**
 * Pipeline Trace — Structured debugging for V7
 *
 * Enable with V7_DEBUG=true in localStorage or import.meta.env
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TraceStep {
    step: TraceStepName;
    timestamp: number;
    payload: Record<string, unknown>;
}

export type TraceStepName =
    | 'EXTRACT_START'
    | 'EXTRACT_DONE'
    | 'QUESTIONS_GEN'
    | 'ANSWERS_RAW'
    | 'ANSWERS_NORMALIZED'
    | 'CHIPS_BEFORE_ANSWERS'
    | 'CHIPS_AFTER_ANSWERS'
    | 'BILLING_RESOLVED'
    | 'OUTPUT_COMPOSED'
    | 'PLACEHOLDERS_CHECK'
    | 'WARNINGS_FINAL'
    | 'UNMAPPED_ANSWER';

export interface PipelineTrace {
    traceId: string;
    startTime: number;
    steps: TraceStep[];
    summary: {
        extractedTooth: string | null;
        extractedSurfaces: string[];
        questionCount: number;
        answerCount: number;
        chipCount: number;
        warningCount: number;
        hasPlaceholders: boolean;
    };
}

// ═══════════════════════════════════════════════════════════════
// DEBUG FLAG
// ═══════════════════════════════════════════════════════════════

function isDebugEnabled(): boolean {
    // Check localStorage first (user override)
    if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('V7_DEBUG');
        if (local === 'true') return true;
        if (local === 'false') return false;
    }

    // Fall back to env
    return import.meta.env.DEV;
}

// ═══════════════════════════════════════════════════════════════
// V7_TRACE — Console trace with grouping
// Enable: localStorage.setItem('V7_TRACE', 'true')
// ═══════════════════════════════════════════════════════════════

function isTraceEnabled(): boolean {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('V7_TRACE') === 'true';
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY STAGE LOG — For deterministic testing
// Accumulates all trace() calls for test assertions
// ═══════════════════════════════════════════════════════════════

interface StageLogEntry {
    stage: string;
    payload: unknown;
    timestamp: number;
}

let _stageLog: StageLogEntry[] = [];
let _stageLoggingEnabled = false;

/**
 * Enable in-memory stage logging (for tests).
 * Must call resetStageLog() before each test.
 */
export function enableStageLogging(): void {
    _stageLoggingEnabled = true;
}

/**
 * Disable in-memory stage logging.
 */
export function disableStageLogging(): void {
    _stageLoggingEnabled = false;
}

/**
 * Reset the stage log (call before each test).
 */
export function resetStageLog(): void {
    _stageLog = [];
}

/**
 * Get the stage log (for test assertions).
 * Returns array of {stage, payload, timestamp}.
 */
export function getStageLog(): StageLogEntry[] {
    return [..._stageLog];
}

/**
 * Get just the stage names from the log.
 */
export function getStageNames(): string[] {
    return _stageLog.map(e => e.stage);
}

/**
 * Log a trace checkpoint to console.
 * NO-OP if V7_TRACE !== 'true'
 * Also logs to in-memory stageLog if enabled (for tests).
 */
export function trace(stage: string, payload: unknown): void {
    // Always log to in-memory if stage logging enabled (for tests)
    if (_stageLoggingEnabled) {
        _stageLog.push({
            stage,
            payload,
            timestamp: Date.now(),
        });
    }

    // Console logging only if V7_TRACE enabled
    if (!isTraceEnabled()) return;

    console.groupCollapsed(`[V7 TRACE] ${stage}`);
    console.log(payload);
    console.groupEnd();
}

/**
 * Wrap a function in a trace group.
 * Returns the function result.
 */
export async function traceGroup<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    if (!isTraceEnabled()) {
        return await fn();
    }

    console.group(`[V7 TRACE GROUP] ${label}`);
    try {
        const result = await fn();
        console.groupEnd();
        return result;
    } catch (error) {
        console.error('Error in trace group:', error);
        console.groupEnd();
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// TRACER CLASS
// ═══════════════════════════════════════════════════════════════

export class PipelineTracer {
    private traceId: string;
    private startTime: number;
    private steps: TraceStep[] = [];
    private enabled: boolean;

    constructor() {
        this.traceId = `v7-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.startTime = Date.now();
        this.enabled = isDebugEnabled();
    }

    /**
     * Push a trace step with payload
     */
    push(step: TraceStepName, payload: Record<string, unknown>): void {
        if (!this.enabled) return;

        const entry: TraceStep = {
            step,
            timestamp: Date.now() - this.startTime,
            payload: this.sanitizePayload(payload)
        };

        this.steps.push(entry);
        console.log(`[V7 Trace] ${step}`, entry.payload);
    }

    /**
     * Sanitize payload to remove PHI and ensure JSON-safe
     */
    private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
        const safe: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(payload)) {
            if (key === 'dictation' && typeof value === 'string') {
                // Don't log full dictation, just length
                safe.dictationLength = value.length;
            } else if (value instanceof Map) {
                safe[key] = Object.fromEntries(value);
            } else if (Array.isArray(value)) {
                safe[key] = value.slice(0, 20); // Limit array length
            } else if (typeof value === 'object' && value !== null) {
                safe[key] = JSON.parse(JSON.stringify(value)); // Deep clone + sanitize
            } else {
                safe[key] = value;
            }
        }

        return safe;
    }

    /**
     * Get final trace with summary
     */
    getTrace(summary: Partial<PipelineTrace['summary']>): PipelineTrace {
        return {
            traceId: this.traceId,
            startTime: this.startTime,
            steps: this.steps,
            summary: {
                extractedTooth: summary.extractedTooth ?? null,
                extractedSurfaces: summary.extractedSurfaces ?? [],
                questionCount: summary.questionCount ?? 0,
                answerCount: summary.answerCount ?? 0,
                chipCount: summary.chipCount ?? 0,
                warningCount: summary.warningCount ?? 0,
                hasPlaceholders: summary.hasPlaceholders ?? false
            }
        };
    }

    /**
     * Check if tracing is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get trace ID for correlation
     */
    getTraceId(): string {
        return this.traceId;
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

export function createTracer(): PipelineTracer {
    return new PipelineTracer();
}

// ═══════════════════════════════════════════════════════════════
// PLACEHOLDER CHECKER
// ═══════════════════════════════════════════════════════════════

const PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_]+\}/g;

export function checkPlaceholders(text: string): { hasPlaceholders: boolean; found: string[] } {
    const matches = text.match(PLACEHOLDER_REGEX) || [];
    return {
        hasPlaceholders: matches.length > 0,
        found: [...new Set(matches)]
    };
}

export function assertNoPlaceholders(text: string, context: string): void {
    const { hasPlaceholders, found } = checkPlaceholders(text);
    if (hasPlaceholders) {
        console.error(`[V7 Error] Unresolved placeholders in ${context}:`, found);
        throw new Error(`Unresolved placeholders: ${found.join(', ')}`);
    }
}
