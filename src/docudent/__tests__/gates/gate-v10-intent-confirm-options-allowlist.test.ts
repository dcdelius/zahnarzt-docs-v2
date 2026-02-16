import { describe, expect, it } from 'vitest';
import { buildIntentConfirmationViewModel } from '../../v10/preanalysis/buildIntentConfirmationViewModel';
import {
    PREANALYSIS_TREATMENT_IDS,
    TREATMENT_INTENT_CONTRACT_VERSION,
    validateTreatmentIntentBundle,
} from '../../v10/preanalysis/treatmentIntentContract';

describe('Gate: V10 intent confirmation uses preanalysis treatment allowlist', () => {
    it('offers only allowlisted treatment options in each lane', () => {
        const parsed = validateTreatmentIntentBundle({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            dictation: 'Endo 46, danach Aufbau.',
            intents: [
                {
                    intentId: 'i-1',
                    treatmentId: 'endo',
                    tooth: '46',
                    confidence: 0.9,
                    evidenceSpans: [{ start: 0, end: 7, text: 'Endo 46' }],
                },
            ],
            needsConfirmation: false,
        });

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const vm = buildIntentConfirmationViewModel(parsed.data);
        const optionIds = vm.lanes[0]?.options.map(option => option.treatmentId).sort();
        expect(optionIds).toEqual([...PREANALYSIS_TREATMENT_IDS].sort());
        expect(optionIds).not.toContain('extraction_stub');
    });
});
