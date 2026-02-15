#!/usr/bin/env npx tsx
/**
 * replayV10Bundle.ts — Flight Recorder CLI Replay
 * 
 * Usage: npx tsx scripts/repro/replayV10Bundle.ts --file <bundle.json>
 * 
 * Loads a repro bundle, re-runs runV10 with the same input,
 * and compares output fields. Exits 0 if diff=0, else 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES (local echo of reproBundleSchema)
// ═══════════════════════════════════════════════════════════════

interface ReproBundleInput {
    dictation: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    hasMKV: boolean;
    answers: Record<string, unknown>;
}

interface ReproBundle {
    meta: {
        runId: string;
        version: string;
        sanitized: boolean;
        createdAt: string;
    };
    input: ReproBundleInput;
    captured: {
        extraction: unknown;
        facts: unknown;
        questions: Array<{ id: string; questionKey: string }>;
        chips: Array<{ id: string; source: string }>;
        billingCodes: Array<{ code: string; system: string }>;
        combinabilityVerdict: 'PASS' | 'WARN' | 'BLOCK';
        finalState: string;
        fullText: string;
    };
}

interface ParityDiff {
    field: string;
    expected: unknown;
    actual: unknown;
}

interface ParityResult {
    match: boolean;
    diffs: ParityDiff[];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function md5(s: string): string {
    return createHash('md5').update(s).digest('hex').slice(0, 8);
}

function stableSort<T>(arr: T[], key: keyof T): T[] {
    return [...arr].sort((a, b) => {
        const aVal = String(a[key] ?? '');
        const bVal = String(b[key] ?? '');
        return aVal.localeCompare(bVal);
    });
}

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// ═══════════════════════════════════════════════════════════════
// MOCK runV10 (in real impl, import from v10/pipeline)
// ═══════════════════════════════════════════════════════════════

async function runV10Replay(input: ReproBundleInput): Promise<{
    state: string;
    questions: Array<{ id: string; questionKey: string }>;
    chips: Array<{ id: string; source: string }>;
    billingCodes: Array<{ code: string; system: string }>;
    combinabilityVerdict: string;
    fullText: string;
}> {
    // Dynamic import to avoid bundling issues
    try {
        const { runV10 } = await import('../../src/docudent/v10/pipeline/runV10.js');

        const result = await runV10({
            treatmentId: input.treatmentId,
            dictation: input.dictation,
            insuranceType: input.insuranceType as 'GKV' | 'PKV',
            textLength: input.textLength,
            hasMKV: input.hasMKV,
            answers: new Map(Object.entries(input.answers)),
        });

        return {
            state: result.state,
            questions: (result.questions || []).map((q: any) => ({
                id: q.id || q.questionKey,
                questionKey: q.questionKey,
            })),
            chips: (result.chips || []).map((c: any) => ({
                id: c.id,
                source: c.source || 'kb',
            })),
            billingCodes: (result.output?.billing?.codes || []).map((b: any) => ({
                code: b.code,
                system: b.system || 'BEMA',
            })),
            combinabilityVerdict: result.combinability?.verdict || 'PASS',
            fullText: result.output?.fullText || '',
        };
    } catch (e) {
        console.error('[replayV10Bundle] Failed to import runV10:', e);
        throw new Error('runV10 import failed - ensure running from repo root with tsx');
    }
}

// ═══════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════

function compareOutputs(expected: ReproBundle['captured'], actual: Awaited<ReturnType<typeof runV10Replay>>): ParityResult {
    const diffs: ParityDiff[] = [];

    // Compare state
    if (expected.finalState !== actual.state) {
        diffs.push({ field: 'finalState', expected: expected.finalState, actual: actual.state });
    }

    // Compare question IDs (sorted)
    const expectedQIds = stableSort(expected.questions, 'id').map(q => q.id);
    const actualQIds = stableSort(actual.questions, 'id').map(q => q.id);
    if (!deepEqual(expectedQIds, actualQIds)) {
        diffs.push({ field: 'questionIds', expected: expectedQIds, actual: actualQIds });
    }

    // Compare chip IDs (sorted)
    const expectedChipIds = stableSort(expected.chips, 'id').map(c => c.id);
    const actualChipIds = stableSort(actual.chips, 'id').map(c => c.id);
    if (!deepEqual(expectedChipIds, actualChipIds)) {
        diffs.push({ field: 'chipIds', expected: expectedChipIds, actual: actualChipIds });
    }

    // Compare billing codes (sorted)
    const expectedCodes = stableSort(expected.billingCodes, 'code').map(b => b.code);
    const actualCodes = stableSort(actual.billingCodes, 'code').map(b => b.code);
    if (!deepEqual(expectedCodes, actualCodes)) {
        diffs.push({ field: 'billingCodes', expected: expectedCodes, actual: actualCodes });
    }

    // Compare combinability
    if (expected.combinabilityVerdict !== actual.combinabilityVerdict) {
        diffs.push({ field: 'combinabilityVerdict', expected: expected.combinabilityVerdict, actual: actual.combinabilityVerdict });
    }

    // Compare fullText hash (not exact, allows formatting diffs)
    const expectedHash = md5(expected.fullText);
    const actualHash = md5(actual.fullText);
    if (expectedHash !== actualHash) {
        diffs.push({
            field: 'fullTextHash',
            expected: `${expectedHash} (${expected.fullText.length} chars)`,
            actual: `${actualHash} (${actual.fullText.length} chars)`
        });
    }

    return {
        match: diffs.length === 0,
        diffs,
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2);
    const fileIdx = args.indexOf('--file');

    if (fileIdx === -1 || !args[fileIdx + 1]) {
        console.error('Usage: npx tsx scripts/repro/replayV10Bundle.ts --file <bundle.json>');
        process.exit(1);
    }

    const bundlePath = path.resolve(args[fileIdx + 1]);

    if (!fs.existsSync(bundlePath)) {
        console.error(`Bundle file not found: ${bundlePath}`);
        process.exit(1);
    }

    console.log(`[replayV10Bundle] Loading bundle: ${bundlePath}`);
    const bundle: ReproBundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

    console.log(`[replayV10Bundle] runId=${bundle.meta.runId}`);
    console.log(`[replayV10Bundle] input.treatmentId=${bundle.input.treatmentId}`);
    console.log(`[replayV10Bundle] input.dictation.length=${bundle.input.dictation.length}`);

    console.log(`[replayV10Bundle] Re-running pipeline...`);
    const actual = await runV10Replay(bundle.input);

    console.log(`[replayV10Bundle] Comparing outputs...`);
    const result = compareOutputs(bundle.captured, actual);

    if (result.match) {
        console.log(`[replayV10Bundle] ✅ PARITY PASS - diff=0`);
        console.log(JSON.stringify({ status: 'PASS', diffs: [] }));
        process.exit(0);
    } else {
        console.log(`[replayV10Bundle] ❌ PARITY FAIL - ${result.diffs.length} differences`);
        result.diffs.forEach(d => {
            console.log(`  - ${d.field}: expected=${JSON.stringify(d.expected)} actual=${JSON.stringify(d.actual)}`);
        });
        console.log(JSON.stringify({ status: 'FAIL', diffs: result.diffs }));
        process.exit(1);
    }
}

main().catch(e => {
    console.error('[replayV10Bundle] Error:', e);
    process.exit(1);
});
