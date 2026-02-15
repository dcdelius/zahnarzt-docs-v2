/**
 * Gate Test: KB Schema Validation for Combinability
 *
 * Contract: All combinability rules must:
 * 1. Have valid matchers (betrifft non-empty)
 * 2. Have valid codes (GOZ_/BEMA_/BEL_/TEST_ prefix)
 * 3. Have sourceRefs (at least document field)
 * 4. autoResolve only with valid policy
 */

import { describe, it, expect } from 'vitest';
import { loadCombinabilityKb } from '../../kb/combinability';

describe('Gate: KB Schema Combinability Validation', () => {
    const kb = loadCombinabilityKb();

    it('all rules have non-empty betrifft', () => {
        for (const rule of kb.rules) {
            expect(rule.betrifft.length, `Rule ${rule.id} has empty betrifft`).toBeGreaterThan(0);
        }
    });

    it('all codes have valid prefix', () => {
        const validPrefixes = ['GOZ_', 'BEMA_', 'BEL_', 'TEST_', 'MKV'];

        for (const rule of kb.rules) {
            for (const code of rule.betrifft) {
                const hasValidPrefix = validPrefixes.some(p => code.startsWith(p));
                expect(hasValidPrefix, `Rule ${rule.id}: invalid code ${code}`).toBe(true);
            }

            if (rule.blockWith) {
                for (const code of rule.blockWith) {
                    const hasValidPrefix = validPrefixes.some(p => code.startsWith(p));
                    expect(hasValidPrefix, `Rule ${rule.id}: invalid blockWith ${code}`).toBe(true);
                }
            }
        }
    });

    it('all rules have sourceRefs with document', () => {
        for (const rule of kb.rules) {
            expect(rule.sourceRefs?.length, `Rule ${rule.id} missing sourceRefs`).toBeGreaterThan(0);

            for (const ref of rule.sourceRefs || []) {
                expect(ref.document, `Rule ${rule.id}: sourceRef missing document`).toBeDefined();
            }
        }
    });

    it('autoResolve only with valid policy', () => {
        const validPolicies = ['drop_anchor', 'drop_blockwith'];

        for (const rule of kb.rules) {
            if (rule.autoResolve) {
                expect(
                    validPolicies.includes(rule.autoResolve),
                    `Rule ${rule.id}: invalid autoResolve ${rule.autoResolve}`
                ).toBe(true);
            }
        }
    });

    it('blockWith codes are subset of betrifft', () => {
        for (const rule of kb.rules) {
            if (rule.blockWith) {
                for (const code of rule.blockWith) {
                    expect(
                        rule.betrifft.includes(code),
                        `Rule ${rule.id}: blockWith ${code} not in betrifft`
                    ).toBe(true);
                }
            }
        }
    });

    it('no duplicate rule IDs', () => {
        const ids = kb.rules.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size, 'Duplicate rule IDs found').toBe(ids.length);
    });
});
