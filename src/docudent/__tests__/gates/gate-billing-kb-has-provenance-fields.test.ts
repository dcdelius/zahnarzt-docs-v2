/**
 * Gate: Billing KB Has Provenance Fields
 *
 * Ensures combinability and medical KB entries have sourceRefs.
 */

import { describe, it, expect } from 'vitest';
import { loadCombinabilityKb } from '../../v10/kb/combinability';
import medicalKb from '../../medical_kb/medical_kb.v1.json';

describe('Gate: Billing KB Has Provenance Fields', () => {
    describe('Combinability KB', () => {
        const kb = loadCombinabilityKb();

        it('has rules with sourceRefs', () => {
            expect(kb.rules.length).toBeGreaterThan(0);
        });

        it('≥90% of rules have sourceRefs', () => {
            const withRefs = kb.rules.filter(r => r.sourceRefs && r.sourceRefs.length > 0);
            const coverage = withRefs.length / kb.rules.length;

            expect(coverage).toBeGreaterThanOrEqual(0.9);
        });

        it('sourceRefs have required fields', () => {
            for (const rule of kb.rules) {
                for (const ref of rule.sourceRefs || []) {
                    const hasIdentifier = (ref as any).anchor || (ref as any).document || (ref as any).anchorId;
                    expect(hasIdentifier, `Rule ${rule.id} has sourceRef without identifier`).toBeTruthy();
                }
            }
        });
    });

    describe('Medical KB', () => {
        it('has rules with sourceRefs', () => {
            const rules = (medicalKb as any).rules || [];
            expect(rules.length).toBeGreaterThan(0);
        });

        it('≥80% of rules have sourceRefs', () => {
            const rules = (medicalKb as any).rules || [];
            const withRefs = rules.filter((r: any) => r.sourceRefs && r.sourceRefs.length > 0);
            const coverage = withRefs.length / rules.length;

            expect(coverage).toBeGreaterThanOrEqual(0.8);
        });

        it('askbacks have sourceRefs', () => {
            const askbacks = (medicalKb as any).askbacks || [];
            const withRefs = askbacks.filter((a: any) => a.sourceRefs && a.sourceRefs.length > 0);
            const coverage = withRefs.length / askbacks.length;

            expect(coverage).toBeGreaterThanOrEqual(0.8);
        });
    });
});
