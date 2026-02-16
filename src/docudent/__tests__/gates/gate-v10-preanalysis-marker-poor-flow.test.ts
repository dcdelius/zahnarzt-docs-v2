import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';

describe('Gate: V10 preanalysis marker-poor fluent dictation', () => {
    it('detects overlap intents across sentence boundaries without explicit split markers', async () => {
        const dictation = 'Zahn 16 fuer Krone beschliffen. Aufbau mit Komposit am selben Zahn. Extraktion Zahn 28 mit Naht.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.source).toBe('fallback');
        expect(result.needsConfirmation).toBe(false);
        expect(result.bundle.intents.map(intent => `${intent.treatmentId}:${intent.tooth ?? 'unknown'}`)).toEqual([
            'crown_prep:16',
            'fuellung:16',
            'extraction:28',
        ]);
    });
});
