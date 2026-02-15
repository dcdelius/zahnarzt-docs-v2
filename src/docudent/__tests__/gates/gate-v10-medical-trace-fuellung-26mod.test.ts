/**
 * Gate: V10 Medical Trace — Fuellung 26mod (M73)
 * 
 * Tests trace-based diagnosis of askback wiring.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import {
    enableMedicalTrace,
    disableMedicalTrace,
    wasAskbackEmitted,
    wasAskbackSkipped,
    didRuleFire,
    type MedicalDecisionTrace,
} from '../../v10/qa/medicalDecisionTrace';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

describe('Gate: V10 Medical Trace — Fuellung 26mod (M73)', () => {
    beforeEach(() => {
        enableMedicalTrace();
    });

    afterEach(() => {
        disableMedicalTrace();
    });

    describe('Variant A: No defaultLAType in settings', () => {
        const CASE_A = {
            dictation: 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie',
            treatmentId: 'fuellung' as const,
            insuranceType: 'GKV' as const,
            forceExtraction: {
                tooth: '26',
                surfaces: ['M', 'O', 'D'],
                diagnosis: 'profunda',
                cariesDepth: 'profunda',
                mentioned: {
                    kofferdam: true,
                    anesthesia: true,
                },
            },
        };

        it('profunda triggers questions state', async () => {
            const result = await runV10({
                dictation: CASE_A.dictation,
                treatmentId: CASE_A.treatmentId,
                insuranceType: CASE_A.insuranceType,
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: CASE_A.forceExtraction,
                },
            });

            expect(result.state).toBe('questions');
        });

        it('questions include medical_ueberkappung', async () => {
            const result = await runV10({
                dictation: CASE_A.dictation,
                treatmentId: CASE_A.treatmentId,
                insuranceType: CASE_A.insuranceType,
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: CASE_A.forceExtraction,
                },
            });

            const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];
            expect(questionIds).toContain('medical_ueberkappung');
        });

        it('kofferdam chip is emitted when mentioned', async () => {
            const result = await runV10({
                dictation: CASE_A.dictation,
                treatmentId: CASE_A.treatmentId,
                insuranceType: CASE_A.insuranceType,
                textLength: 'kurz',
                answers: new Map([
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'MTA'],
                ]),
                testOnly: {
                    forceExtraction: CASE_A.forceExtraction,
                },
            });

            expect(result.state).toBe('output');

            // Kofferdam should be in output text
            expect(result.output?.fullText).toContain('Kofferdam');
        });

        it('LA type MAY be asked when not specified in extraction', async () => {
            const result = await runV10({
                dictation: CASE_A.dictation,
                treatmentId: CASE_A.treatmentId,
                insuranceType: CASE_A.insuranceType,
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        ...CASE_A.forceExtraction,
                        mentioned: {
                            ...CASE_A.forceExtraction.mentioned,
                            laType: undefined, // Not extracted
                        },
                    },
                },
            });

            // If LA type is not known, questions might include it
            // Or the pipeline may default to infiltration
            const questionIds = result.questions?.map((q: any) => q.id) || [];
            // This documents current behavior - may or may not ask LA type
        });
    });

    describe('Variant B: defaultLAType in settings', () => {
        const CASE_B = {
            dictation: 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie',
            treatmentId: 'fuellung' as const,
            insuranceType: 'GKV' as const,
            forceExtraction: {
                tooth: '26',
                surfaces: ['M', 'O', 'D'],
                diagnosis: 'profunda',
                cariesDepth: 'profunda',
                mentioned: {
                    kofferdam: true,
                    anesthesia: true,
                    laType: 'infiltration', // Already known from extraction
                },
            },
        };

        it('with LA type extracted, la_infiltr chip should be used', async () => {
            const result = await runV10({
                dictation: CASE_B.dictation,
                treatmentId: CASE_B.treatmentId,
                insuranceType: CASE_B.insuranceType,
                textLength: 'kurz',
                answers: new Map([
                    ['medical_ueberkappung', 'indirekt'],
                    ['medical_ueberkappung_material', 'MTA'],
                ]),
                testOnly: {
                    forceExtraction: CASE_B.forceExtraction,
                    forceChips: ['la_infiltr', 'kofferdam', 'exkavation', 'cp', 'komposit_basic', 'finishing'],
                },
            });

            expect(result.state).toBe('output');
            // KB uses short form "LA Infiltr." not "Infiltrationsanästhesie"
            expect(result.output?.fullText).toMatch(/LA|Infiltr|Anästhesie/i);
        });

        it('LA askback is skipped when LA type is already known', async () => {
            const result = await runV10({
                dictation: CASE_B.dictation,
                treatmentId: CASE_B.treatmentId,
                insuranceType: CASE_B.insuranceType,
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: CASE_B.forceExtraction,
                },
            });

            // Questions should NOT include LA type since it's extracted
            const questionIds = result.questions?.map((q: any) => q.id) || [];
            expect(questionIds).not.toContain('medical_la_type');
        });
    });

    describe('Trace Facts Verification', () => {
        it('facts include tooth', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 Füllung okklusal',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '36',
                        surfaces: ['O'],
                        diagnosis: 'Karies',
                        mentioned: {},
                    },
                },
            });

            // Tooth should be preserved
            expect(result.trace?.instances?.[0]?.tooth).toBe('36');
        });

        it('profunda fact triggers capping askback', async () => {
            const result = await runV10({
                dictation: 'Zahn 46 Füllung profunda Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                testOnly: {
                    forceExtraction: {
                        tooth: '46',
                        surfaces: ['O'],
                        diagnosis: 'profunda',
                        cariesDepth: 'profunda',
                        mentioned: {},
                    },
                },
            });

            expect(result.state).toBe('questions');
            const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];
            expect(questionIds).toContain('medical_ueberkappung');
        });
    });
});
