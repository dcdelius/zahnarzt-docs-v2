import { describe, expect, it } from 'vitest';
import { listPackIds } from '@/docudent/v10/packs/registry';
import { detectTreatmentIntents } from '@/docudent/v10/preanalysis/detectTreatmentIntents';
import { TREATMENT_INTENT_UNCERTAINTY_CODES } from '@/docudent/v10/preanalysis/treatmentIntentContract';

describe('gate-v10-crown-prep-active-path', () => {
    it('keeps crown_prep as active pack in the runtime registry', () => {
        expect(listPackIds()).toContain('crown_prep');
    });

    it('maps crown dictation to crown_prep in deterministic fallback preanalysis', async () => {
        const result = await detectTreatmentIntents(
            'Zahn 16 fuer Krone beschliffen, Praeparation und Abformung durchgefuehrt.',
            { forceFallback: true }
        );
        expect(result.bundle.intents[0]?.treatmentId).toBe('crown_prep');
    });

    it('removes obsolete crown-no-pack uncertainty code from contract', () => {
        expect(TREATMENT_INTENT_UNCERTAINTY_CODES).not.toContain('candidate:crown_prep_no_pack');
    });
});
