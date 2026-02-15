import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../../medical_kb/engine/applyMedicalKb';

describe('Gate: V10 Medical KB Chip Emission Disabled', () => {
    const facts = {
        treatmentId: 'fuellung',
        capping: { performed: 'yes' },
        pulpaOpened: false,
    };

    it('legacy medical_kb emits chips when allowed (sanity)', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts,
            allowChipEmission: true,
        });

        expect(result.emittedChips).toContain('cp');
    });

    it('v10 disables medical_kb chip emission', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts,
            allowChipEmission: false,
        });

        expect(result.emittedChips).toEqual([]);
    });
});
