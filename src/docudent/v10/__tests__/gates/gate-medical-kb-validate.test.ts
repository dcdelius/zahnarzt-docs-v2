/**
 * Gate: Medical KB Validation (fail-fast)
 *
 * Ensures medical_kb.v1.json is schema- and sourceRef-consistent.
 */

import { describe, it, expect } from 'vitest';
import {
    loadMedicalKb,
    loadSources,
    validateMedicalKb,
} from '../../../../../scripts/medical_kb/validateMedicalKb';

describe('Gate: Medical KB Validation', () => {
    it('medical_kb.v1.json passes validation', () => {
        const kb = loadMedicalKb();
        const sources = loadSources();
        const result = validateMedicalKb(kb, sources);

        if (result.warnings.length > 0) {
            console.warn('[Medical KB Validation] Warnings:', result.warnings);
        }
        if (result.errors.length > 0) {
            console.error('[Medical KB Validation] Errors:', result.errors);
        }

        expect(result.errors).toEqual([]);
    });
});
