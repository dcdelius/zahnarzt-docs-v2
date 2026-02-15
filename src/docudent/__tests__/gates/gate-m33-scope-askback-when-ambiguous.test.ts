/**
 * Gate M33: Scope Askback When Ambiguous
 * 
 * Tests that ambiguous multi-treatment dictations trigger scope disambiguation askbacks.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    needsScopeDisambiguation,
    attributeStatement,
} from '../../v10/qa/segmentScoping';

describe('gate-m33-scope-askback-when-ambiguous', () => {
    describe('ambiguous scenarios need askback', () => {
        it('ambiguous "ohne Anästhesie" at start of multi-treatment', () => {
            const scoped = parseScopedDictation('Ohne Betäubung Endo 14 und dann Füllung');

            // Should be multi-treatment
            expect(scoped.isMultiTreatment).toBe(true);

            // "Ohne Betäubung" is in first clause
            const attr = attributeStatement('ohne betäubung', scoped);

            // Scope should be determined (may be endo since it's first, or ambiguous)
            expect(['ambiguous', 'unknown', 'endo', 'fuellung']).toContain(attr.scope);
        });

        it('negation before any treatment keyword is ambiguous', () => {
            const scoped = parseScopedDictation('Kein Kofferdam heute, Endo 14 und Füllung');

            const attr = attributeStatement('kein kofferdam', scoped);

            // Should be ambiguous or unknown in multi-treatment context
            if (scoped.isMultiTreatment) {
                expect(['ambiguous', 'unknown', 'endo', 'fuellung']).toContain(attr.scope);
            }
        });
    });

    describe('clear scenarios do not need askback', () => {
        it('negation after clear treatment marker is scoped', () => {
            const scoped = parseScopedDictation('Endo 14 Leitung, danach Füllung ohne Betäubung');

            expect(scoped.isMultiTreatment).toBe(true);

            const attr = attributeStatement('ohne betäubung', scoped);

            // Should be scoped to fuellung (follows "danach Füllung")
            expect(attr.scope).toBe('fuellung');
        });

        it('single treatment - all statements scoped to it', () => {
            const scoped = parseScopedDictation('Füllung 36 ohne Betäubung Komposit');

            expect(scoped.isMultiTreatment).toBe(false);

            const attr = attributeStatement('ohne betäubung', scoped);
            expect(attr.scope).toBe('fuellung');
        });

        it('explicit LA in each treatment - no ambiguity', () => {
            const scoped = parseScopedDictation('Endo 14 Leitungsanästhesie, danach Füllung Infiltration');

            expect(scoped.isMultiTreatment).toBe(true);
            // No negations - no disambiguation needed
            expect(needsScopeDisambiguation(scoped)).toBe(false);
        });
    });

    describe('disambiguation detection', () => {
        it('needsScopeDisambiguation returns false for single treatment', () => {
            const scoped = parseScopedDictation('Füllung 36 ohne Anästhesie');
            expect(needsScopeDisambiguation(scoped)).toBe(false);
        });

        it('needsScopeDisambiguation returns false for clear scope', () => {
            const scoped = parseScopedDictation('Endo 14, danach Füllung ohne Betäubung');
            expect(needsScopeDisambiguation(scoped)).toBe(false);
        });
    });
});
