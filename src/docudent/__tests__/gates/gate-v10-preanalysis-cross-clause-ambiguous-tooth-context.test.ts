import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';

describe('Gate: V10 cross-clause ambiguous tooth context requires confirmation', () => {
    it('does not silently bind follow-up treatment to one previous tooth when multiple candidates exist', async () => {
        const dictation = 'Fuellung Zahn 36 und Zahn 14 okklusal mit Komposit, danach adhaesiver Aufbau mit Komposit.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.needsConfirmation).toBe(true);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth ?? 'unknown'}`)).toEqual([
            'fuellung:36',
            'fuellung:14',
            'fuellung:unknown',
        ]);
        expect(result.bundle.intents.find(intent => !intent.tooth)?.uncertainty).toBe('llm_ambiguous_mapping');
    });
});
