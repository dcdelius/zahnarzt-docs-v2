import { describe, expect, it } from 'vitest';
import { buildIntentConfirmationViewModel } from '../../preanalysis/buildIntentConfirmationViewModel';
import { detectTreatmentIntents } from '../../preanalysis/detectTreatmentIntents';
import { MIXED_INTENT_FIXTURES } from './fixtures/mixedIntentFixtures';

describe('buildIntentConfirmationViewModel', () => {
    it('keeps confident intents preselected with zero extra decisions', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'endo-build-up-same-tooth');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);

        expect(vm.totalIntents).toBe(2);
        expect(vm.requiresDecisionCount).toBe(0);
        expect(vm.canConfirmAllWithoutEdits).toBe(true);
        for (const lane of vm.lanes) {
            expect(lane.options[0]?.selected).toBe(true);
            expect(lane.requiresDecision).toBe(false);
        }
    });

    it('flags uncertain intents and still preselects best guess first', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'crown-prep-and-build-up');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);

        expect(vm.totalIntents).toBe(2);
        expect(vm.requiresDecisionCount).toBeGreaterThan(0);
        expect(vm.canConfirmAllWithoutEdits).toBe(false);
        expect(vm.lanes[0].options[0].selected).toBe(true);
        expect(vm.lanes[0].options.length).toBeGreaterThanOrEqual(2);
    });
});
