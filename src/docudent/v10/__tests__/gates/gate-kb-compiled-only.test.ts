/**
 * Gate Test: KB Compiled Only (SSOT Lock)
 *
 * Contract: Runtime KB must be compiler-generated, not manually edited.
 * Evidence: _meta must contain generatedAt, sourceHash, hash, provider.
 */

import { describe, it, expect } from 'vitest';
import { loadCombinabilityKb } from '../../kb/combinability';

describe('Gate: KB Compiled Only (SSOT Lock)', () => {
    const kb = loadCombinabilityKb();

    it('KB has _meta section', () => {
        expect(kb._meta).toBeDefined();
    });

    it('_meta.generatedAt is present and valid ISO date', () => {
        expect(kb._meta.generatedAt).toBeDefined();
        expect(kb._meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('_meta.hash is present and non-empty', () => {
        expect(kb._meta.hash).toBeDefined();
        expect(kb._meta.hash.length).toBeGreaterThan(0);
    });

    it('_meta.version follows semver', () => {
        expect(kb._meta.version).toBeDefined();
        expect(kb._meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('_meta.ruleCount matches actual rules', () => {
        expect(kb._meta.ruleCount).toBe(kb.rules.length);
    });

    it('_meta.sourceFile is present', () => {
        expect(kb._meta.sourceFile).toBeDefined();
        expect(kb._meta.sourceFile.length).toBeGreaterThan(0);
    });

    it('all rules have sourceRefs (provenance)', () => {
        for (const rule of kb.rules) {
            expect(
                rule.sourceRefs?.length,
                `Rule ${rule.id} missing sourceRefs`
            ).toBeGreaterThan(0);
        }
    });
});
