/**
 * M70: Repro Replay CLI Script
 * 
 * Replays a V10 repro bundle and prints JSON summary.
 * 
 * Usage:
 *   npx ts-node scripts/repro/replayV10Repro.ts < repro.json
 *   npx ts-node scripts/repro/replayV10Repro.ts --file repro.json
 */

import { runV10 } from '../../src/docudent/v10/pipeline/runV10';
import type { ReproBundleV1 } from '../../src/docudent/v10/debug/reproBundle';
import * as fs from 'fs';

interface ReplaySummary {
    input: {
        treatmentId: string;
        insuranceType: string;
        dictationLength: number;
    };
    output: {
        state: string;
        questionIds?: string[];
        chipIds?: string[];
        billingCodesCount?: number;
        errorMessage?: string;
    };
    trace?: {
        extractorEngine?: string;
        instanceCount?: number;
        kbVersions?: Record<string, string>;
    };
}

async function replayRepro(bundle: ReproBundleV1): Promise<ReplaySummary> {
    const result = await runV10({
        dictation: bundle.pipelineInput.dictation,
        treatmentId: bundle.pipelineInput.treatmentId as 'fuellung' | 'endo',
        insuranceType: bundle.pipelineInput.insuranceType,
        textLength: bundle.pipelineInput.textLength as any,
        answers: bundle.answersByInstance
            ? new Map(Object.entries(bundle.answersByInstance.default || {}))
            : undefined,
    });

    return {
        input: {
            treatmentId: bundle.pipelineInput.treatmentId,
            insuranceType: bundle.pipelineInput.insuranceType,
            dictationLength: bundle.pipelineInput.dictation.length,
        },
        output: {
            state: result.state,
            questionIds: result.questions?.map((q: any) => q.id),
            chipIds: result.meta?.provenance?.chips?.map((c: any) => c.chipId),
            billingCodesCount: result.output?.billingCodes?.length,
            errorMessage: result.error,
        },
        trace: {
            extractorEngine: result.meta?.extractorEngine,
            instanceCount: result.meta?.instanceCount,
            kbVersions: result.meta?.kb?.medical
                ? { medical: result.meta.kb.medical.version }
                : undefined,
        },
    };
}

async function main() {
    let input: string;

    // Check for --file argument
    const fileArgIndex = process.argv.indexOf('--file');
    if (fileArgIndex !== -1 && process.argv[fileArgIndex + 1]) {
        input = fs.readFileSync(process.argv[fileArgIndex + 1], 'utf-8');
    } else {
        // Read from stdin
        input = fs.readFileSync(0, 'utf-8');
    }

    try {
        const bundle = JSON.parse(input) as ReproBundleV1;

        if (bundle.version !== 'repro-v1') {
            console.error(JSON.stringify({ error: 'Invalid bundle version', version: bundle.version }));
            process.exit(1);
        }

        const summary = await replayRepro(bundle);
        console.log(JSON.stringify(summary, null, 2));
    } catch (e) {
        console.error(JSON.stringify({ error: 'Failed to parse or replay', message: String(e) }));
        process.exit(1);
    }
}

main();
