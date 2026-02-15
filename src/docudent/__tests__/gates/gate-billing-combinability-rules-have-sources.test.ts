/**
 * Gate: Billing Combinability Rules Have Sources
 *
 * Ensures all combinability rules have sourceRefs.
 */

import { describe, it, expect } from 'vitest';
import { loadCombinabilityKb } from '../../v10/kb/combinability';

describe('Gate: Billing Combinability Rules Have Sources', () => {
    const kb = loadCombinabilityKb();

    it('all rules have sourceRefs', () => {
        const missingRefs: string[] = [];

        for (const rule of kb.rules) {
            if (!rule.sourceRefs || rule.sourceRefs.length === 0) {
                missingRefs.push(rule.id);
            }
        }

        expect(missingRefs, `Rules missing sourceRefs: ${missingRefs.join(', ')}`).toHaveLength(0);
    });

    it('all sourceRefs have valid structure', () => {
        for (const rule of kb.rules) {
            for (const ref of rule.sourceRefs || []) {
                expect(typeof ref).toBe('object');
                // SourceRef must have at least anchor or document field
                const hasField = (ref as any).anchor || (ref as any).document || (ref as any).anchorId || (ref as any).sourceId;
                expect(hasField, `Rule ${rule.id} has sourceRef without identifier`).toBeTruthy();
            }
        }
    });

    it('ausschluss rules define blockWith', () => {
        const ausschlussRules = kb.rules.filter(r => r.typ === 'ausschluss');

        for (const rule of ausschlussRules) {
            expect(
                rule.blockWith && rule.blockWith.length > 0,
                `Ausschluss rule ${rule.id} missing blockWith`
            ).toBe(true);
        }
    });
});
