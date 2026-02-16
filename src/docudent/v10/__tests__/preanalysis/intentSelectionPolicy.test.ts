import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../preanalysis/detectTreatmentIntents';
import { buildIntentConfirmationViewModel } from '../../preanalysis/buildIntentConfirmationViewModel';
import { buildInitialIntentSelections, getUnresolvedIntentIds } from '../../preanalysis/intentSelectionPolicy';
import { MIXED_INTENT_FIXTURES } from './fixtures/mixedIntentFixtures';

describe('intentSelectionPolicy', () => {
    it('keeps confident intents preselected', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'extraction-then-filling-multitooth');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);
        const selections = buildInitialIntentSelections(preanalysis.bundle, vm);
        const unresolved = getUnresolvedIntentIds(vm, selections);

        expect(unresolved).toHaveLength(0);
        for (const lane of vm.lanes) {
            expect(selections[lane.intentId]).toBe(lane.treatmentId);
        }
    });

    it('requires explicit decision for uncertain intents', async () => {
        const fixture = MIXED_INTENT_FIXTURES.find(x => x.id === 'crown-prep-and-build-up');
        expect(fixture).toBeDefined();

        const preanalysis = await detectTreatmentIntents(fixture!.dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);
        const selections = buildInitialIntentSelections(preanalysis.bundle, vm);
        const unresolved = getUnresolvedIntentIds(vm, selections);

        expect(unresolved.length).toBeGreaterThan(0);
        for (const lane of vm.lanes.filter(item => item.requiresDecision)) {
            expect(unresolved).toContain(lane.intentId);
            expect(selections[lane.intentId]).toBeUndefined();
        }
    });
});
