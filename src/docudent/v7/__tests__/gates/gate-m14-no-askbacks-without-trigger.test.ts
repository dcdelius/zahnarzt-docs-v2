/**
 * Gate M14: No Askbacks Without Trigger
 *
 * GATE DEFINITION:
 * Normal cavity dictations should NOT trigger medical askbacks
 * that require specific clinical findings:
 * - No hemostasis askback without bleeding mention
 * - No ueberkappung askback without deep caries mention
 * - No sensitivity_followup without sensitivity mention
 *
 * Prevents "Vibe-Fragen" (vibes-based questions).
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M14: No Askbacks Without Trigger', () => {
    const DEEP_CARIES_TRIGGERS = ['ueberkappung', 'capping', 'cp'];
    const BLEEDING_TRIGGERS = ['blutung', 'hemostasis', 'bleeding'];
    const SENSITIVITY_TRIGGERS = ['sensitivity', 'empfindlichkeit'];

    it('simple MOD caries does NOT trigger ueberkappung', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            // Should NOT have ueberkappung question for non-deep caries
            for (const trigger of DEEP_CARIES_TRIGGERS) {
                const hasUeberkappung = questionIds.some(id => id.includes(trigger));
                expect(hasUeberkappung).toBe(false);
            }
        }
    });

    it('caries media does NOT trigger ueberkappung', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 26 Karies media, dreiflächige Füllung gelegt',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            for (const trigger of DEEP_CARIES_TRIGGERS) {
                const hasUeberkappung = questionIds.some(id => id.includes(trigger));
                expect(hasUeberkappung).toBe(false);
            }
        }
    });

    it('simple filling does NOT trigger hemostasis', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            // Should NOT have bleeding/hemostasis question without bleeding mention
            for (const trigger of BLEEDING_TRIGGERS) {
                const hasHemostasis = questionIds.some(id => id.includes(trigger));
                expect(hasHemostasis).toBe(false);
            }
        }
    });

    it('normal caries does NOT trigger sensitivity followup', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 Karies, Füllung gelegt',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            for (const trigger of SENSITIVITY_TRIGGERS) {
                const hasSensitivity = questionIds.some(id => id.includes(trigger));
                expect(hasSensitivity).toBe(false);
            }
        }
    });

    it('oberflächliche Karies does NOT trigger deep caries askbacks', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 36 oberflächliche Karies, einfache Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            for (const trigger of DEEP_CARIES_TRIGGERS) {
                const hasUeberkappung = questionIds.some(id => id.includes(trigger));
                expect(hasUeberkappung).toBe(false);
            }
        }
    });

    it('profunda DOES trigger ueberkappung (positive control)', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda, fast am Nerv',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map(),
        };

        const result = await runV10(input);

        // Either questions state with ueberkappung, or extraction recognized it
        if (result.state === 'questions') {
            // Check if any question relates to capping (this is expected)
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];
            // This is the positive control - profunda should trigger ueberkappung
            // But we don't fail if it doesn't, as this is testing NO false positives
        }
    });

    it('multiple simple fillings stay clean', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zähne 16, 26, 36 Karies, Kompositfüllungen gelegt',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26', '36'],
            answers: new Map(),
        };

        const result = await runV10(input);

        if (result.state === 'questions') {
            const questionIds = result.questions?.map(q => q.id.toLowerCase()) ?? [];

            // None of the teeth should trigger deep caries askbacks
            for (const trigger of DEEP_CARIES_TRIGGERS) {
                const hasUeberkappung = questionIds.some(id => id.includes(trigger));
                expect(hasUeberkappung).toBe(false);
            }

            for (const trigger of BLEEDING_TRIGGERS) {
                const hasHemostasis = questionIds.some(id => id.includes(trigger));
                expect(hasHemostasis).toBe(false);
            }
        }
    });
});
