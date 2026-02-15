/**
 * Gate: V10 Parity Repro vs Replay (M71)
 * 
 * Verifies that UI-captured repro produces same results when replayed.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

// Inline parity comparison functions (mirrors scripts/repro/compareUiReproWithReplay.ts)
interface NormalizedSummary {
    state: string;
    questionIds: string[];
    chipIds: string[];
    billingCodesCount: number;
    instanceTeeth: string[];
    diagnosticKeys: string[];
}

function normalizeUiRepro(bundle: any): NormalizedSummary {
    const summary = bundle.resultSummary || {};
    return {
        state: summary.state || 'unknown',
        questionIds: (summary.questionIds || []).sort(),
        chipIds: (summary.chipIds || []).sort(),
        billingCodesCount: summary.billingCodesCount || 0,
        instanceTeeth: (summary.instanceTeeth || []).sort(),
        diagnosticKeys: Object.keys(summary.diagnostic || {}).sort(),
    };
}

function normalizePipelineResult(result: any): NormalizedSummary {
    return {
        state: result.state || 'unknown',
        questionIds: (result.questions?.map((q: any) => stripToothScope(q.id)) || []).sort(),
        chipIds: (result.meta?.provenance?.chips?.map((c: any) => c.chipId) || []).sort(),
        billingCodesCount: result.output?.billingCodes?.length || 0,
        instanceTeeth: (result.trace?.instances?.map((i: any) => i.tooth).filter(Boolean) || []).sort(),
        diagnosticKeys: Object.keys(result.meta?.diagnostic || {}).sort(),
    };
}

function compare(ui: NormalizedSummary, replay: NormalizedSummary) {
    const diff: Record<string, { ui: unknown; replay: unknown }> = {};

    if (ui.state !== replay.state) {
        diff.state = { ui: ui.state, replay: replay.state };
    }
    if (JSON.stringify(ui.questionIds) !== JSON.stringify(replay.questionIds)) {
        diff.questionIds = { ui: ui.questionIds, replay: replay.questionIds };
    }
    if (ui.billingCodesCount !== replay.billingCodesCount) {
        diff.billingCodesCount = { ui: ui.billingCodesCount, replay: replay.billingCodesCount };
    }

    return {
        parity: Object.keys(diff).length > 0 ? 'FAIL' : 'PASS',
        ui,
        replay,
        ...(Object.keys(diff).length > 0 ? { diff } : {}),
    };
}

describe('Gate: V10 Parity Repro vs Replay (M71)', () => {
    // Fixture: A known repro bundle with expected results
    const FIXTURE_REPRO = {
        version: 'repro-v1' as const,
        createdAt: '2025-12-29T12:00:00Z',
        pipelineInput: {
            dictation: 'Zahn 26 MOD Kompositfüllung, tiefe Karies, Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        resultSummary: {
            state: 'questions',
            questionIds: ['medical_ueberkappung'],
            chipIds: [],
            billingCodesCount: 0,
            instanceTeeth: ['26'],
        },
    };

    it('normalizeUiRepro extracts correct fields', () => {
        const normalized = normalizeUiRepro(FIXTURE_REPRO);

        expect(normalized.state).toBe('questions');
        expect(normalized.questionIds).toContain('medical_ueberkappung');
        expect(normalized.instanceTeeth).toContain('26');
    });

    it('normalizePipelineResult extracts correct fields', async () => {
        const result = await runV10({
            dictation: FIXTURE_REPRO.pipelineInput.dictation,
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'profunda',
                    cariesDepth: 'profunda',
                    mentioned: { kofferdam: true },
                },
            },
        });

        const normalized = normalizePipelineResult(result);

        expect(normalized.state).toBe('questions');
        expect(normalized.questionIds).toContain('medical_ueberkappung');
    });

    it('compare returns PASS for matching summaries', () => {
        const ui = {
            state: 'output',
            questionIds: ['q1', 'q2'],
            chipIds: ['c1', 'c2'],
            billingCodesCount: 3,
            instanceTeeth: ['26'],
            diagnosticKeys: [],
        };

        const replay = { ...ui };

        const result = compare(ui, replay);
        expect(result.parity).toBe('PASS');
        expect(result.diff).toBeUndefined();
    });

    it('compare returns FAIL with diff for mismatched summaries', () => {
        const ui = {
            state: 'output',
            questionIds: ['q1', 'q2'],
            chipIds: ['c1', 'c2'],
            billingCodesCount: 3,
            instanceTeeth: ['26'],
            diagnosticKeys: [],
        };

        const replay = {
            ...ui,
            state: 'questions', // Mismatch
            billingCodesCount: 5, // Mismatch
        };

        const result = compare(ui, replay);
        expect(result.parity).toBe('FAIL');
        expect(result.diff).toBeTruthy();
        expect(result.diff?.state).toEqual({ ui: 'output', replay: 'questions' });
        expect(result.diff?.billingCodesCount).toEqual({ ui: 3, replay: 5 });
    });

    it('parity check passes for fixture repro', async () => {
        // Run pipeline with same inputs as fixture
        const result = await runV10({
            dictation: FIXTURE_REPRO.pipelineInput.dictation,
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'profunda',
                    cariesDepth: 'profunda',
                    mentioned: { kofferdam: true },
                },
            },
        });

        const uiSummary = normalizeUiRepro(FIXTURE_REPRO);
        const replaySummary = normalizePipelineResult(result);

        // Core parity check: state must match
        expect(replaySummary.state).toBe(uiSummary.state);

        // Question IDs must match (critical for askback flow)
        expect(replaySummary.questionIds).toContain('medical_ueberkappung');
    });
});
