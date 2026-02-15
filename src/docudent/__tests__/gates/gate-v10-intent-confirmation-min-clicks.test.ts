import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';
import { buildIntentConfirmationViewModel } from '../../v10/preanalysis/buildIntentConfirmationViewModel';

describe('gate-v10-intent-confirmation-min-clicks', () => {
    it('keeps confident intents confirmable without per-lane edits', async () => {
        const dictation = 'Endo 46 abgeschlossen, danach Aufbaufuellung mit Komposit am selben Zahn.';
        const preanalysis = await detectTreatmentIntents(dictation, { forceFallback: true });
        const vm = buildIntentConfirmationViewModel(preanalysis.bundle);

        expect(vm.canConfirmAllWithoutEdits).toBe(true);
        expect(vm.requiresDecisionCount).toBe(0);
    });
});
