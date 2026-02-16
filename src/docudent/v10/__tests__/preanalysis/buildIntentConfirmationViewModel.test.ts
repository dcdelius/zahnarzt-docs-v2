import { describe, expect, it } from 'vitest';
import { buildIntentConfirmationViewModel } from '../../preanalysis/buildIntentConfirmationViewModel';
import { detectTreatmentIntents } from '../../preanalysis/detectTreatmentIntents';
import { MIXED_INTENT_FIXTURES } from './fixtures/mixedIntentFixtures';
import { PREANALYSIS_TREATMENT_IDS } from '../../preanalysis/treatmentIntentContract';

describe('buildIntentConfirmationViewModel', () => {
    it('keeps confident intents preselected with zero extra decisions', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'extraction-then-filling-multitooth');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);

        expect(vm.totalIntents).toBe(2);
        expect(vm.requiresDecisionCount).toBe(0);
        expect(vm.canConfirmAllWithoutEdits).toBe(true);
        const selectableOptions = [...PREANALYSIS_TREATMENT_IDS].sort();
        for (const lane of vm.lanes) {
            expect(lane.options[0]?.selected).toBe(true);
            expect(lane.requiresDecision).toBe(false);
            expect(lane.options.map(opt => opt.treatmentId).sort()).toEqual(selectableOptions);
        }
    });

    it('flags uncertain intents when inference requires explicit confirmation', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'crown-prep-and-build-up');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);

        expect(vm.totalIntents).toBe(2);
        expect(vm.requiresDecisionCount).toBeGreaterThan(0);
        expect(vm.canConfirmAllWithoutEdits).toBe(false);
        expect(vm.lanes[0].options[0].selected).toBe(true);
        expect(vm.lanes[0].options.length).toBeGreaterThanOrEqual(2);
        expect(vm.lanes[1].requiresDecision).toBe(true);
    });
});
