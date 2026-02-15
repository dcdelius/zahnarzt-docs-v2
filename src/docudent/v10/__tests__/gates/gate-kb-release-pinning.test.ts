import { describe, it, expect, beforeEach } from 'vitest';

import { runV10 } from '../../pipeline/runV10';
import { clearMedicalKbCache, jsonMedicalKbProvider } from '../../kb/medical';
import { clearTreatmentKbCache, jsonTreatmentKbProvider } from '../../kb/treatment';

describe('Gate: KB release pinning', () => {
    beforeEach(() => {
        clearMedicalKbCache();
        clearTreatmentKbCache();
    });

    it('keeps meta version deterministic per requested release', () => {
        const medicalA = jsonMedicalKbProvider.getMeta('release-A');
        const medicalB = jsonMedicalKbProvider.getMeta('release-B');
        const treatmentA = jsonTreatmentKbProvider.getMeta('fuellung', 'release-A');
        const treatmentB = jsonTreatmentKbProvider.getMeta('fuellung', 'release-B');

        expect(medicalA.version).toBe('release-A');
        expect(medicalB.version).toBe('release-B');
        expect(treatmentA?.version).toBe('release-A');
        expect(treatmentB?.version).toBe('release-B');
    });

    it('propagates explicit kbReleaseId into pipeline meta', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Karies.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
            kbReleaseId: 'release-session-42',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
                forceAnswers: {
                    medical_anesthesia: 'leitung',
                },
            },
        });

        expect(result.meta.kbReleaseId).toBe('release-session-42');
        expect(result.meta.kb?.medical?.version).toBe('release-session-42');
        expect(result.meta.kb?.treatments?.fuellung?.version).toBe('release-session-42');
    });
});
