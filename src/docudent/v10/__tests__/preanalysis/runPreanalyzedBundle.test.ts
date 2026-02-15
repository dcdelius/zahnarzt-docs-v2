import { describe, expect, it, vi } from 'vitest';
import { runPreanalyzedBundle } from '../../preanalysis/runPreanalyzedBundle';
import { MIXED_INTENT_FIXTURES } from './fixtures/mixedIntentFixtures';

describe('runPreanalyzedBundle', () => {
    it('returns needs_confirmation and does not execute bundle run for uncertain intents', async () => {
        const runBundle = vi.fn();
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'crown-prep-and-build-up');
        expect(fixture).toBeDefined();

        const result = await runPreanalyzedBundle({
            dictation: fixture!.dictation,
            insuranceType: 'GKV',
            textLength: 'mittel',
            forceFallback: true,
        }, { runBundle });

        expect(result.state).toBe('needs_confirmation');
        expect(runBundle).not.toHaveBeenCalled();
        if (result.state === 'needs_confirmation') {
            expect(result.preview.bundle.needsConfirmation).toBe(true);
            expect(result.preview.segments.length).toBeGreaterThan(0);
        }
    });

    it('runs bundle pipeline for confident intents', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'endo-build-up-same-tooth');
        expect(fixture).toBeDefined();

        const runBundle = vi.fn().mockResolvedValue({
            state: 'output',
            output: { fullText: 'ok', billingCodes: [], segments: [] },
            meta: {
                engineUsed: 'v10',
                instanceCount: 2,
                multiInstance: true,
                durations: { total: 1 },
            },
        });

        const result = await runPreanalyzedBundle({
            dictation: fixture!.dictation,
            insuranceType: 'GKV',
            textLength: 'mittel',
            forceFallback: true,
        }, { runBundle });

        expect(runBundle).toHaveBeenCalledTimes(1);
        expect(runBundle.mock.calls[0][0].segments).toHaveLength(2);
        expect(result.state).toBe('output');
        if (result.state === 'output') {
            expect(result.preanalysis.intentHashInput.length).toBeGreaterThan(10);
            expect(result.preanalysis.source).toBe('fallback');
        }
    });

    it('produces deterministic preanalysis hash input for identical dictation', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'endo-build-up-same-tooth');
        expect(fixture).toBeDefined();

        const runBundle = vi.fn().mockResolvedValue({
            state: 'output',
            output: { fullText: 'ok', billingCodes: [], segments: [] },
            meta: {
                engineUsed: 'v10',
                instanceCount: 2,
                multiInstance: true,
                durations: { total: 1 },
            },
        });

        const once = await runPreanalyzedBundle({
            dictation: fixture!.dictation,
            insuranceType: 'GKV',
            textLength: 'mittel',
            forceFallback: true,
        }, { runBundle });
        const twice = await runPreanalyzedBundle({
            dictation: fixture!.dictation,
            insuranceType: 'GKV',
            textLength: 'mittel',
            forceFallback: true,
        }, { runBundle });

        expect(once.preanalysis.intentHashInput).toBe(twice.preanalysis.intentHashInput);
    });
});
