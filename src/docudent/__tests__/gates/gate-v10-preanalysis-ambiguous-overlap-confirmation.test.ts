import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';

describe('Gate: V10 ambiguous overlap requires confirmation', () => {
    it('never drops one treatment silently when crown+build-up appear in one clause', async () => {
        const dictation = 'Zahn 16 Krone beschliffen mit adhaesivem Kompositaufbau in derselben Sitzung.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        expect(result.bundle.intents.map(intent => intent.treatmentId)).toEqual(['crown_prep', 'fuellung']);
        expect(result.bundle.intents.every(intent => intent.uncertainty === 'llm_ambiguous_mapping')).toBe(true);
        expect(result.needsConfirmation).toBe(true);
    });
});
