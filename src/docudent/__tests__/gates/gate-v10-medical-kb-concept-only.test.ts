/**
 * Gate: Medical KB is concept-driven (no active rules)
 *
 * Ensures legacy rules do not reappear and fragment the system.
 */

import { describe, it, expect } from 'vitest';
import { medicalKb } from '../../medical_kb';

describe('Gate: Medical KB is concept-driven', () => {
    it('has no active rules', () => {
        const activeRuleIds = medicalKb.rules.filter(rule => rule.active).map(rule => rule.id);
        expect(activeRuleIds).toEqual([]);
    });
});
