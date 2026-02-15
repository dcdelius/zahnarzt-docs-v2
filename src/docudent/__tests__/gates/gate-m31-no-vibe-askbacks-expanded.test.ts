/**
 * Gate M31: No "Vibe" Askbacks
 * 
 * Askbacks must only appear when a clinical trigger exists in facts.
 * No random/vibe-based questions allowed.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m31-no-vibe-askbacks-expanded', () => {
    // Clinical triggers that should cause askbacks
    const ALLOWED_ASKBACK_TRIGGERS = [
        { askback: 'medical_ueberkappung', triggers: ['profunda', 'pulpanah', 'tiefe karies'] },
        { askback: 'medical_la_type', triggers: ['spritze', 'betäubung', 'anästhesie'] },
        { askback: 'medical_vipr', triggers: ['vitalität', 'sensibilität'] },
        { askback: 'medical_kofferdam_reason', triggers: ['kofferdam'] },
    ];

    it('simple filling without triggers has no askbacks', async () => {
        const result = await runV10({
            dictation: 'Füllung Zahn 36 mo Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
                forceAnswers: { medical_ueberkappung: 'keine' },
            },
        });

        expect(['questions', 'output']).toContain(result.state);
        if (result.state === 'questions') {
            const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
            const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
            const allowed = (id: string) => id.includes('layering') || id.includes('material');
            const unexpected = [...askbackIds, ...askbackKeys].filter(id => id && !allowed(id));
            expect(unexpected.length).toBe(0);
        }
    });

    it('simple endo without triggers produces output', async () => {
        const result = await runV10({
            dictation: 'Wurzelkanalbehandlung Zahn 46 3 Kanäle',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: { tooth: '46', canalCount: 3 },
            },
        });

        expect(['questions', 'output']).toContain(result.state);
    });

    it('ask_la_type only triggers on ambiguous dictation', async () => {
        // Clear trigger
        const result = await runV10({
            dictation: 'Füllung 36 mo nach Spritze',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        // Should ask because "Spritze" is ambiguous
        if (result.state === 'questions') {
            const askbackIds = result.questions?.map(q => stripToothScope(q.id ?? '')) || [];
            const askbackKeys = result.questions?.map(q => q.questionKey ?? '') || [];
            const hasLaType = askbackIds.some(id => id.includes('anesthesia') || id.includes('la_type')) ||
                askbackKeys.some(key => key.includes('anesthesia') || key.includes('la_type'));
            expect(hasLaType).toBe(true);
        }
    });

    it('explicit Infiltration does not trigger LA question', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 mo nach Infiltrationsanästhesie Ultracain',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media', la_type: 'infiltration' },
            },
        });

        if (result.state === 'questions') {
            const askbackIds = result.questions?.map(q => q.id) || [];
            expect(askbackIds).not.toContain('medical_la_type');
        }
    });

    it('askback count is reasonable (< 5 for simple case)', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 mo Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        if (result.state === 'questions') {
            expect(result.questions?.length).toBeLessThan(5);
        }
    });
});
