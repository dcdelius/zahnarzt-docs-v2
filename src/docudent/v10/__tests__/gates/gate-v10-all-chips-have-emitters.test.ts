import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('gate: V10 chips always have emitters', () => {
    it('fuellung: every emitted chip has a node/manualOverride emitter', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 14 mesial, Kompositfüllung, Matrix und Keil, Politur.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['mkv_confirmed', 'mehrkosten'],
            ]),
        });

        expect(result.state).toBe('output');
        const instances = result.meta.debug?.instances ?? [];
        expect(instances.length).toBeGreaterThan(0);

        for (const instance of instances) {
            const emitters = instance.chipEmitters ?? {};
            for (const chipId of instance.chips) {
                const emitter = emitters[chipId];
                expect(emitter, `missing emitter for chip "${chipId}" (instance ${instance.instanceId})`).toBeTruthy();
                expect(
                    emitter === 'manualOverride' || emitter.startsWith('node:'),
                    `invalid emitter "${emitter}" for chip "${chipId}" (instance ${instance.instanceId})`
                ).toBe(true);
            }
        }
    });
});
