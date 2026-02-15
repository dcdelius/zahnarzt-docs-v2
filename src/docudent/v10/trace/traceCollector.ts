/**
 * V10 Trace Collector — Flight Recorder
 *
 * Collects structured trace markers during V10 pipeline execution.
 * Supports both V7-compatible string format and structured JSON.
 *
 * Enabled in test mode or when VITE_PIPELINE_TRACE=true.
 */

import type { TraceMarker } from '../../contracts/pipeline';

// ═══════════════════════════════════════════════════════════════
// STRUCTURED TRACE EVENT (Flight Recorder)
// ═══════════════════════════════════════════════════════════════

export interface StructuredTraceEvent {
    ts: number;         // Timestamp offset from start (ms)
    stage: string;      // Pipeline stage
    detail: string;     // Description
    data?: unknown;     // Optional structured data (JSON-serializable)
}

export interface StructuredTraceOutput {
    runId: string;
    startTime: number;
    totalDuration: number;
    events: StructuredTraceEvent[];
    durations: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// V10 TRACE COLLECTOR
// ═══════════════════════════════════════════════════════════════

export class V10TraceCollector {
    private markers: TraceMarker[] = [];
    private events: StructuredTraceEvent[] = [];
    private durations: Record<string, number> = {};
    private enabled: boolean;
    private startTime: number;
    private runId: string;

    constructor(runId?: string) {
        this.enabled = this.shouldTrace();
        this.startTime = Date.now();
        this.runId = runId || `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    }

    private shouldTrace(): boolean {
        // Node/test environment
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.VITE_PIPELINE_TRACE === 'true') return true;
            if (process.env.NODE_ENV === 'test') return true;
            if (process.env.VITEST === 'true') return true;
            if (process.env.NODE_ENV !== 'production') return true;
        }
        // Browser environment
        if (typeof window !== 'undefined') {
            try {
                if ((import.meta as any)?.env?.VITE_PIPELINE_TRACE === 'true') return true;
                if ((import.meta as any)?.env?.DEV === true) return true;
                if (localStorage?.getItem('PIPELINE_TRACE') === 'true') return true;
            } catch {
                // Ignore localStorage errors
            }
        }
        return false;
    }

    /**
     * Add a trace marker (V7 compatible).
     */
    add(stage: TraceMarker['stage'], detail: string): void {
        if (!this.enabled) return;
        this.markers.push({ stage, detail });
        this.events.push({
            ts: Date.now() - this.startTime,
            stage,
            detail,
        });
    }

    /**
     * Add a structured trace event with data (Flight Recorder).
     */
    addStructured(stage: string, detail: string, data?: unknown): void {
        if (!this.enabled) return;
        this.markers.push({ stage: stage as TraceMarker['stage'], detail });
        this.events.push({
            ts: Date.now() - this.startTime,
            stage,
            detail,
            data: data !== undefined ? data : undefined,
        });
    }

    /**
     * Record a duration for a stage.
     */
    recordDuration(stage: string, durationMs: number): void {
        this.durations[stage] = durationMs;
    }

    /**
     * Get all markers.
     */
    getMarkers(): TraceMarker[] {
        return [...this.markers];
    }

    /**
     * Check if tracing is enabled.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get the run ID.
     */
    getRunId(): string {
        return this.runId;
    }

    /**
     * Convert to V7-compatible "stage:detail" lines.
     */
    toV7Lines(): string[] {
        return this.markers.map(m => `${m.stage}:${m.detail}`);
    }

    /**
     * Convert to debug JSON.
     */
    toDebugJson(): { markers: TraceMarker[]; durations: Record<string, number> } {
        return {
            markers: this.getMarkers(),
            durations: { ...this.durations },
        };
    }

    /**
     * Convert to structured JSON for Flight Recorder / repro bundle.
     */
    toStructuredJson(): StructuredTraceOutput {
        return {
            runId: this.runId,
            startTime: this.startTime,
            totalDuration: Date.now() - this.startTime,
            events: [...this.events],
            durations: { ...this.durations },
        };
    }

    /**
     * Check if trace includes a marker matching pattern.
     */
    includes(pattern: string): boolean {
        return this.toV7Lines().some(s => s.includes(pattern));
    }

    /**
     * Check if trace excludes all markers matching pattern.
     */
    excludes(pattern: string): boolean {
        return !this.includes(pattern);
    }

    /**
     * Get total elapsed time since collector creation.
     */
    getTotalDuration(): number {
        return Date.now() - this.startTime;
    }
}

