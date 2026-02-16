import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';

describe('Gate: V10 preanalysis triple overlap deterministic routing', () => {
    it('maps crown + same-tooth build-up + extraction to 3 deterministic intents', async () => {
        const dictation = 'Zahn 16 fuer Krone beschliffen, supragingival praepariert, danach am selben Zahn adhaesiver Aufbau mit Komposit; zusaetzlich Extraktion Zahn 28 mit Nahtversorgung.';
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
