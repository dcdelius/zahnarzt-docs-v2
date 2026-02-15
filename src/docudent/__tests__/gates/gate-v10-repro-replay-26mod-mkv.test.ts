/**
 * Gate: V10 Repro Replay — 26mod MKV (M70)
 * 
 * Verifies repro replay produces expected state for Repro 1 case.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

describe('Gate: V10 Repro Replay — 26mod MKV (M70)', () => {
    const REPRO_1_BUNDLE = {
        version: 'repro-v1' as const,
        createdAt: new Date().toISOString(),
        pipelineInput: {
            dictation: 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
        },
    };

    it('replays Repro 1 and gets questions state', async () => {
        const result = await runV10({
            dictation: REPRO_1_BUNDLE.pipelineInput.dictation,
            treatmentId: REPRO_1_BUNDLE.pipelineInput.treatmentId as 'fuellung',
            insuranceType: REPRO_1_BUNDLE.pipelineInput.insuranceType,
            textLength: REPRO_1_BUNDLE.pipelineInput.textLength as any,
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'tiefe Karies',
                    cariesDepth: 'profunda',
                    mentioned: {
                        kofferdam: true,
                    },
                },
            },
        });

        // Must trigger questions because of deep caries
        expect(result.state).toBe('questions');

        // Must include medical_ueberkappung because of profunda
        const questionIds = result.questions?.map((q: any) => stripToothScope(q.id)) || [];
        expect(questionIds).toContain('medical_ueberkappung');
    });

    it('replays with answers and gets output', async () => {
        const result = await runV10({
            dictation: REPRO_1_BUNDLE.pipelineInput.dictation,
            treatmentId: REPRO_1_BUNDLE.pipelineInput.treatmentId as 'fuellung',
            insuranceType: REPRO_1_BUNDLE.pipelineInput.insuranceType,
            textLength: REPRO_1_BUNDLE.pipelineInput.textLength as any,
            answers: new Map([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
                ['medical_vitality', 'neg'],
                ['medical_percussion', 'neg'],
                ['forensic_ueberkappung', true],
                ['forensic_ueberkappung_material', 'MTA'],
                ['forensic_anesthesia_type', 'infiltr'],
                ['forensic_diagnose_confirmation', 'profunda'],
                ['mkv_mkv_betrag', 120],
                ['fuellung_mkv_justification', 'mehrschicht'],
            ]),
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'tiefe Karies',
                    cariesDepth: 'profunda',
                    mentioned: {
                        kofferdam: true,
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        expect(result.output).toBeTruthy();
        expect(result.output?.fullText).toContain('Kofferdam');
        expect(result.output?.fullText).toContain('Überkappung');
    });

    it('preserves tooth in trace for UI decoration', async () => {
        const result = await runV10({
            dictation: REPRO_1_BUNDLE.pipelineInput.dictation,
            treatmentId: REPRO_1_BUNDLE.pipelineInput.treatmentId as 'fuellung',
            insuranceType: REPRO_1_BUNDLE.pipelineInput.insuranceType,
            textLength: REPRO_1_BUNDLE.pipelineInput.textLength as any,
            answers: new Map([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
                ['medical_vitality', 'neg'],
                ['medical_percussion', 'neg'],
                ['forensic_ueberkappung', true],
                ['forensic_ueberkappung_material', 'MTA'],
                ['forensic_anesthesia_type', 'infiltr'],
                ['forensic_diagnose_confirmation', 'profunda'],
                ['mkv_mkv_betrag', 120],
            ]),
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'tiefe Karies',
                    cariesDepth: 'profunda',
                    mentioned: {
                        kofferdam: true,
                    },
                },
            },
        });

        // Tooth must be in trace for UI to display
        expect(result.trace?.instances?.[0]?.tooth).toBe('26');
    });
});
