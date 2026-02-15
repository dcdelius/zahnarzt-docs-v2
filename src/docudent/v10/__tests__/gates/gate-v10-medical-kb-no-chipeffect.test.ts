import { describe, it, expect } from 'vitest';
import { medicalKbV10 } from '../../../medical_kb';

describe('Gate: V10 Medical KB Has No chipEffect', () => {
    it('askbacks have no chipEffect entries', () => {
        const violations: string[] = [];
        for (const askback of medicalKbV10.askbacks ?? []) {
            if (askback.chipEffect && Object.keys(askback.chipEffect).length > 0) {
                violations.push(askback.id);
            }
        }
        expect(violations).toEqual([]);
    });
});
