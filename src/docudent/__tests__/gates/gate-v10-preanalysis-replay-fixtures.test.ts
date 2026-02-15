import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';
import { toDeterministicIntentHashInput } from '../../v10/preanalysis/treatmentIntentContract';
import { MIXED_INTENT_FIXTURES } from '../../v10/__tests__/preanalysis/fixtures/mixedIntentFixtures';

describe('gate-v10-preanalysis-replay-fixtures', () => {
    it('replays canonical mixed-treatment fixtures deterministically', async () => {
        const firstPass: string[] = [];
        const secondPass: string[] = [];

        for (const fixture of MIXED_INTENT_FIXTURES) {
            const once = await detectTreatmentIntents(fixture.dictation, { forceFallback: true });
            const twice = await detectTreatmentIntents(fixture.dictation, { forceFallback: true });
            firstPass.push(toDeterministicIntentHashInput(once.bundle));
            secondPass.push(toDeterministicIntentHashInput(twice.bundle));
        }

        expect(firstPass).toEqual(secondPass);
    });
});

