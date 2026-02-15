/**
 * M71: Repro Parity Comparator
 * 
 * Compares UI-captured repro bundle with pipeline replay output.
 * Exit code 0 = parity OK, non-zero = mismatch.
 * 
 * Usage:
 *   npx ts-node scripts/repro/compareUiReproWithReplay.ts --file ui-repro.json
 *   cat ui-repro.json | npx ts-node scripts/repro/compareUiReproWithReplay.ts
 */

import { runV10 } from '../../src/docudent/v10/pipeline/runV10';
import type { ReproBundleV1 } from '../../src/docudent/v10/debug/reproBundle';
import * as fs from 'fs';

interface NormalizedSummary {
    state: string;
    questionIds: string[];
    chipIds: string[];
    billingCodesCount: number;
    instanceTeeth: string[];
    diagnosticKeys: string[];
}

interface ComparisonResult {
    parity: 'PASS' | 'FAIL';
    ui: NormalizedSummary;
    replay: NormalizedSummary;
    diff?: Record<string, { ui: unknown; replay: unknown }>;
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
        questionIds: (result.questions?.map((q: any) => q.id) || []).sort(),
        chipIds: (result.meta?.provenance?.chips?.map((c: any) => c.chipId) || []).sort(),
        billingCodesCount: result.output?.billingCodes?.length || 0,
        instanceTeeth: (result.trace?.instances?.map((i: any) => i.tooth).filter(Boolean) || []).sort(),
        diagnosticKeys: Object.keys(result.meta?.diagnostic || {}).sort(),
    };
}

function compare(ui: NormalizedSummary, replay: NormalizedSummary): ComparisonResult {
    const diff: Record<string, { ui: unknown; replay: unknown }> = {};

    if (ui.state !== replay.state) {
        diff.state = { ui: ui.state, replay: replay.state };
    }

    if (JSON.stringify(ui.questionIds) !== JSON.stringify(replay.questionIds)) {
        diff.questionIds = { ui: ui.questionIds, replay: replay.questionIds };
    }

    if (JSON.stringify(ui.chipIds) !== JSON.stringify(replay.chipIds)) {
        diff.chipIds = { ui: ui.chipIds, replay: replay.chipIds };
    }

    if (ui.billingCodesCount !== replay.billingCodesCount) {
        diff.billingCodesCount = { ui: ui.billingCodesCount, replay: replay.billingCodesCount };
    }

    if (JSON.stringify(ui.instanceTeeth) !== JSON.stringify(replay.instanceTeeth)) {
        diff.instanceTeeth = { ui: ui.instanceTeeth, replay: replay.instanceTeeth };
    }

    const hasDiff = Object.keys(diff).length > 0;

    return {
        parity: hasDiff ? 'FAIL' : 'PASS',
        ui,
        replay,
        ...(hasDiff ? { diff } : {}),
    };
}

async function replayBundle(bundle: ReproBundleV1): Promise<any> {
    return runV10({
        dictation: bundle.pipelineInput.dictation,
        treatmentId: bundle.pipelineInput.treatmentId as 'fuellung' | 'endo',
        insuranceType: bundle.pipelineInput.insuranceType as 'GKV' | 'PKV' | 'MKV',
        textLength: bundle.pipelineInput.textLength as any,
        answers: bundle.answersByInstance
            ? new Map(Object.entries(bundle.answersByInstance.default || {}))
            : undefined,
    });
}

async function main() {
    let input: string;

    const fileArgIndex = process.argv.indexOf('--file');
    if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
        input = fs.readFileSync(process.argv[fileArgIndex + 1], 'utf-8');
    } else {
        input = fs.readFileSync(0, 'utf-8');
    }

    try {
        const bundle = JSON.parse(input);

        if (bundle.version !== 'repro-v1') {
            console.error(JSON.stringify({ error: 'Invalid bundle version', version: bundle.version }));
            process.exit(1);
        }

        // Normalize UI repro
        const uiSummary = normalizeUiRepro(bundle);

        // Replay pipeline
        const pipelineResult = await replayBundle(bundle);
        const replaySummary = normalizePipelineResult(pipelineResult);

        // Compare
        const result = compare(uiSummary, replaySummary);

        console.log(JSON.stringify(result, null, 2));

        // Exit code based on parity
        process.exit(result.parity === 'PASS' ? 0 : 1);
    } catch (e) {
        console.error(JSON.stringify({ error: 'Comparison failed', message: String(e) }));
        process.exit(2);
    }
}

// Export for testing
export { normalizeUiRepro, normalizePipelineResult, compare, NormalizedSummary, ComparisonResult };

main();
