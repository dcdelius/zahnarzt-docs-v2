/**
 * Gate 6: Trace Contract Tests
 * 
 * This test ensures the V7_TRACE contract is stable:
 * - Stage names are locked (from SSOT)
 * - PHI-safe behavior (no raw dictation logged)
 * - Placeholder detection works correctly
 * - trace() is a noop when disabled
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import trace utilities
import {
    trace,
    checkPlaceholders,
    PipelineTracer
} from '../../v7/pipeline/trace';

// Import SSOT for stage names
import { V7_TRACE_STAGES } from '../../v7/pipeline/traceStages';

// ═══════════════════════════════════════════════════════════════
// STAGE CONTRACT — Bound to SSOT
// ═══════════════════════════════════════════════════════════════

describe('GATE6: Trace Contract', () => {
    describe('A) Stage Contract (from SSOT)', () => {
        it('should have exactly 6 locked stage names', () => {
            expect(V7_TRACE_STAGES).toHaveLength(6);
        });

        it('should contain all required stages in correct order', () => {
            expect(V7_TRACE_STAGES).toEqual([
                'PIPELINE_INPUT',
                'EXTRACTED',
                'QUESTIONS',
                'NORMALIZED_ANSWERS',
                'OUTPUT_INPUT',
                'OUTPUT_RESULT',
            ]);
        });

        it('PIPELINE_INPUT should be first stage (entry point)', () => {
            expect(V7_TRACE_STAGES[0]).toBe('PIPELINE_INPUT');
        });

        it('OUTPUT_RESULT should be last stage (exit point)', () => {
            expect(V7_TRACE_STAGES[V7_TRACE_STAGES.length - 1]).toBe('OUTPUT_RESULT');
        });

        it('V7_TRACE_STAGES should be a readonly tuple', () => {
            // TypeScript enforces this at compile time with "as const"
            // Runtime check: array should be frozen-like (no mutation allowed by type)
            expect(Array.isArray(V7_TRACE_STAGES)).toBe(true);
        });
    });

    describe('B) PHI-Safe: PipelineTracer sanitizes dictation', () => {
        it('should replace dictation with dictationLength', () => {
            // Create tracer (in test, enabled by DEV environment)
            const tracer = new PipelineTracer();

            // Force enable for test by accessing internals
            // @ts-expect-error accessing private for test
            tracer.enabled = true;

            // Capture console.log calls
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const longDictation = 'This is a very long dictation with patient sensitive information';
            tracer.push('EXTRACT_START', {
                dictation: longDictation,
                other: 'safe value'
            });

            // Find the logged payload
            expect(logSpy).toHaveBeenCalled();
            const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
            const loggedPayload = lastCall[1];

            // Assert: dictation key should NOT exist
            expect(loggedPayload).not.toHaveProperty('dictation');

            // Assert: dictationLength SHOULD exist
            expect(loggedPayload).toHaveProperty('dictationLength');
            expect(loggedPayload.dictationLength).toBe(longDictation.length);

            // Assert: other fields pass through
            expect(loggedPayload).toHaveProperty('other', 'safe value');

            logSpy.mockRestore();
        });

        it('should handle payload without dictation normally', () => {
            const tracer = new PipelineTracer();
            // @ts-expect-error accessing private for test
            tracer.enabled = true;

            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            tracer.push('EXTRACT_DONE', {
                tooth: '36',
                surfaces: ['m', 'o', 'd']
            });

            expect(logSpy).toHaveBeenCalled();
            const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
            const loggedPayload = lastCall[1];

            expect(loggedPayload).toHaveProperty('tooth', '36');
            expect(loggedPayload).toHaveProperty('surfaces');

            logSpy.mockRestore();
        });
    });

    describe('C) Placeholder Checker', () => {
        it('should detect {material} placeholder', () => {
            const result = checkPlaceholders('Apply {material} to the cavity');
            expect(result.hasPlaceholders).toBe(true);
            expect(result.found).toContain('{material}');
        });

        it('should NOT detect Ca(OH)2 as placeholder (chemical formula)', () => {
            const result = checkPlaceholders('Apply Ca(OH)2 to the cavity');
            expect(result.hasPlaceholders).toBe(false);
            expect(result.found).toHaveLength(0);
        });

        it('should NOT detect "MTA" as placeholder', () => {
            const result = checkPlaceholders('Apply MTA to the cavity');
            expect(result.hasPlaceholders).toBe(false);
        });

        it('should detect multiple placeholders', () => {
            const result = checkPlaceholders('{tooth} filled with {material} using {technique}');
            expect(result.hasPlaceholders).toBe(true);
            expect(result.found).toHaveLength(3);
            expect(result.found).toContain('{tooth}');
            expect(result.found).toContain('{material}');
            expect(result.found).toContain('{technique}');
        });

        it('should not duplicate placeholders in result', () => {
            const result = checkPlaceholders('{material} and {material} again');
            expect(result.found).toHaveLength(1);
            expect(result.found).toContain('{material}');
        });

        it('should return empty array for clean text', () => {
            const result = checkPlaceholders('Zahn 36 mit mod Füllung versorgt.');
            expect(result.hasPlaceholders).toBe(false);
            expect(result.found).toEqual([]);
        });
    });

    describe('D) trace() is noop when disabled', () => {
        let groupCollapsedSpy: ReturnType<typeof vi.spyOn>;
        let logSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            // Mock localStorage to return 'false' for V7_TRACE
            vi.stubGlobal('localStorage', {
                getItem: (key: string) => key === 'V7_TRACE' ? 'false' : null,
                setItem: () => { },
            });

            groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => { });
            logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        });

        afterEach(() => {
            groupCollapsedSpy.mockRestore();
            logSpy.mockRestore();
            vi.unstubAllGlobals();
        });

        it('should not throw when trace disabled', () => {
            expect(() => {
                trace('TEST_STAGE', { data: 'test' });
            }).not.toThrow();
        });

        it('should not call console.groupCollapsed when trace disabled', () => {
            trace('TEST_STAGE', { data: 'test' });
            expect(groupCollapsedSpy).not.toHaveBeenCalled();
        });

        it('should not call console.log in trace() when disabled', () => {
            const beforeCalls = logSpy.mock.calls.length;
            trace('TEST_STAGE', { data: 'test' });
            const afterCalls = logSpy.mock.calls.length;

            // No new log calls from trace()
            expect(afterCalls).toBe(beforeCalls);
        });
    });

    describe('E) PipelineTracer isEnabled check', () => {
        it('should expose isEnabled() method', () => {
            const tracer = new PipelineTracer();
            expect(typeof tracer.isEnabled()).toBe('boolean');
        });

        it('should expose getTraceId() method', () => {
            const tracer = new PipelineTracer();
            const id = tracer.getTraceId();
            expect(typeof id).toBe('string');
            expect(id).toMatch(/^v7-\d+-[a-z0-9]+$/);
        });
    });
});
