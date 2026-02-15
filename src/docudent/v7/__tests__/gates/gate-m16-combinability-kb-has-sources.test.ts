/**
 * M16 Gate: Combinability KB Has Sources
 *
 * Verifies every rule in the combinability KB has valid sourceRefs.
 */

import { describe, it, expect } from 'vitest';
import { loadCombinabilityKb } from '../../../v10/kb/combinability';

describe('Gate M16: Combinability KB Has Sources', () => {
    const kb = loadCombinabilityKb();

    it('has valid _meta', () => {
        expect(kb._meta).toBeDefined();
        expect(kb._meta.version).toBeTruthy();
        expect(kb._meta.ruleCount).toBeGreaterThan(0);
        expect(kb._meta.hash).toBeTruthy();
    });

    it('has at least 10 rules', () => {
        expect(kb.rules.length).toBeGreaterThanOrEqual(10);
    });

    it('every rule has an id', () => {
        for (const rule of kb.rules) {
            expect(rule.id).toBeTruthy();
            expect(typeof rule.id).toBe('string');
        }
    });

    it('every rule has sourceRefs', () => {
        for (const rule of kb.rules) {
            expect(rule.sourceRefs).toBeDefined();
            expect(Array.isArray(rule.sourceRefs)).toBe(true);
            expect(rule.sourceRefs.length).toBeGreaterThan(0);
        }
    });

    it('every sourceRef has an anchor or document field', () => {
        for (const rule of kb.rules) {
            for (const ref of rule.sourceRefs as any[]) {
                const hasAnchor = typeof ref.anchor === 'string' && ref.anchor.length > 0;
                const hasDocument = typeof ref.document === 'string' && ref.document.length > 0;
                expect(hasAnchor || hasDocument).toBe(true);
            }
        }
    });

    it('ruleCount in _meta matches actual count', () => {
        expect(kb._meta.ruleCount).toBe(kb.rules.length);
    });

    it('every rule has a valid typ', () => {
        const validTypes = ['ausschluss', 'bedingung', 'haeufigkeit', 'dokumentation'];
        for (const rule of kb.rules) {
            expect(validTypes).toContain(rule.typ);
        }
    });

    it('every ausschluss rule has blockWith (for testable BLOCK)', () => {
        const ausschlussRules = kb.rules.filter(r => r.typ === 'ausschluss');
        expect(ausschlussRules.length).toBeGreaterThan(0);

        for (const rule of ausschlussRules) {
            expect(rule.blockWith).toBeDefined();
            expect(Array.isArray(rule.blockWith)).toBe(true);
            expect(rule.blockWith!.length).toBeGreaterThan(0);
        }
    });
});
