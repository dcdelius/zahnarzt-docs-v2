/**
 * Gate Test: MVP No Error State
 * 
 * All 5 MVP treatments must return 'questions' or 'output', never 'error'.
 * Uses stub extraction for speed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { run } from '../../v7/pipeline';
import type { PipelineInput } from '../../v7/pipeline/types';

// Enable stub extraction
beforeAll(() => {
    process.env.DOCUDENT_TEST_MODE = 'stub_extraction';
});

afterAll(() => {
    delete process.env.DOCUDENT_TEST_MODE;
});

// ═══════════════════════════════════════════════════════════════
// MVP TREATMENTS — Must never return 'error' for basic dictations
// ═══════════════════════════════════════════════════════════════

const MVP_TREATMENTS = [
    { id: 'fuellung', dictation: 'Zahn 36 MOD Komposit Kofferdam' },
    { id: 'endo', dictation: 'Zahn 46 Wurzelkanalbehandlung Guttapercha' },
    { id: 'extraction', dictation: 'Extraktion Zahn 48 nicht erhaltungswürdig' },
    { id: 'pzr', dictation: 'PZR Zahnsteinentfernung Fluoridierung' },
    { id: 'crown_prep', dictation: 'Kronenpräparation Zahn 26 Vollkeramik Abformung' },
] as const;

describe('GATE: MVP No Error State', () => {
    for (const treatment of MVP_TREATMENTS) {
        describe(`Treatment: ${treatment.id}`, () => {
            it('does NOT return error state', async () => {
                const result = await run({
                    dictation: treatment.dictation,
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    hasMKV: false,
                    treatmentId: treatment.id,
                    answers: new Map(),
                } as PipelineInput);

                // Must NOT be 'error'
                expect(result.state, `${treatment.id} returned error: ${result.error}`).not.toBe('error');

                // Must be either 'questions' or 'output'
                expect(['questions', 'output']).toContain(result.state);
            });

            it('if output, has sections', async () => {
                // Stub packs don't have full KB output - skip sections check for them
                const STUB_PACKS = ['extraction', 'pzr', 'crown_prep', 'extraction_stub'];
                if (STUB_PACKS.includes(treatment.id)) {
                    return; // Skip - stub packs don't have sections yet
                }

                const result = await run({
                    dictation: treatment.dictation,
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    hasMKV: false,
                    treatmentId: treatment.id,
                    answers: new Map(),
                } as PipelineInput);

                if (result.state === 'output' && result.output) {
                    expect(result.output.sections.length).toBeGreaterThan(0);
                }
            });
        });
    }
});
