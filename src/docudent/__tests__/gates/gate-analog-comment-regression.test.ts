/**
 * ANALOG Comment Ingestion Regression Gate Tests
 * 
 * Hard regression tests for ANALOG golden codes.
 * These tests will fail if ANALOG import changes unexpectedly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    loadAnalogCards,
    getCommentCardsForCode,
    hasCommentData,
} from '../../core/billing/knowledgeBase/secondary/commentCardStore';
import { getRulesForCode, loadRules, clearRulesCache } from '../../core/billing/knowledgeBase/secondary/commentRuleExtractor';

describe('GATE: ANALOG Comment Ingestion Regression', () => {
    beforeAll(() => {
        clearRulesCache();
    });

    describe('ANALOG Card Counts', () => {
        it('loads expected number of ANALOG cards', () => {
            const cards = loadAnalogCards();
            // We expect ~57 cards from ANALOG import
            expect(cards.length).toBeGreaterThanOrEqual(50);
            expect(cards.length).toBeLessThanOrEqual(70);
        });

        it('all ANALOG cards have system = ANALOG', () => {
            const cards = loadAnalogCards();
            for (const card of cards) {
                expect(card.system).toBe('ANALOG');
            }
        });
    });

    describe('Golden Code Regression', () => {
        const GOLDEN_EXPECTATIONS = [
            { code: 'ANALOG_ZE_02', minSections: 3, minRules: 0, hasAnalogHint: true, hasGozCrossRef: true },
            { code: 'ANALOG_Kons_04', minSections: 5, minRules: 1, hasAnalogHint: true, hasGozCrossRef: true },
            { code: 'ANALOG_FAL_01', minSections: 3, minRules: 0, hasAnalogHint: true, hasGozCrossRef: true },
            { code: 'ANALOG_Paro_03', minSections: 20, minRules: 2, hasAnalogHint: true, hasGozCrossRef: true },
            { code: 'ANALOG_Impl_02', minSections: 3, minRules: 0, hasAnalogHint: true, hasGozCrossRef: true },
        ];

        it.each(GOLDEN_EXPECTATIONS)(
            '$code has expected sections, rules, and hints',
            ({ code, minSections, minRules, hasAnalogHint, hasGozCrossRef }) => {
                const cards = getCommentCardsForCode(code, 'ANALOG' as any);
                expect(cards.length).toBeGreaterThan(0);

                const card = cards[0] as any;
                expect(card.sections.length).toBeGreaterThanOrEqual(minSections);

                const rules = getRulesForCode(code);
                expect(rules.length).toBeGreaterThanOrEqual(minRules);

                if (hasAnalogHint) {
                    expect(card.analogHint).toBeTruthy();
                    expect(card.analogHint.allowed).toBe(true);
                    expect(card.analogHint.paragraph).toContain('§6');
                }

                if (hasGozCrossRef) {
                    const gozRefs = (card.crossReferences || []).filter((r: any) => r.system === 'GOZ');
                    expect(gozRefs.length).toBeGreaterThan(0);
                }
            }
        );

        it('ANALOG_ZE_02 has title about extracted tooth', () => {
            const cards = getCommentCardsForCode('ANALOG_ZE_02');
            expect(cards.length).toBeGreaterThan(0);
            const card = cards[0] as any;
            expect(card.title).toContain('Extrahierter Zahn');
        });

        it('ANALOG_Paro_03 is the rich S3 parodontal card', () => {
            const cards = getCommentCardsForCode('ANALOG_Paro_03');
            expect(cards.length).toBeGreaterThan(0);
            const card = cards[0] as any;
            // This is a very rich card with many sections
            expect(card.sections.length).toBeGreaterThanOrEqual(50);
        });
    });

    describe('ANALOG Rule Quality', () => {
        it('ANALOG has significant rule count', () => {
            const allRules = loadRules();
            const analogRules = allRules.filter(r => (r.system as string) === 'ANALOG');

            expect(analogRules.length).toBeGreaterThanOrEqual(80);
        });

        it('ANALOG rules have low unknown percentage (<25%)', () => {
            const allRules = loadRules();
            const analogRules = allRules.filter(r => (r.system as string) === 'ANALOG');
            const unknownRules = analogRules.filter(r => r.conditionType === 'unknown');

            const unknownPercent = (unknownRules.length / analogRules.length) * 100;
            expect(unknownPercent).toBeLessThan(25);
        });

        it('ANALOG has analogJustification rules', () => {
            const allRules = loadRules();
            const analogJustRules = allRules.filter(
                r => (r.system as string) === 'ANALOG' && r.conditionType === 'analogJustification'
            );

            expect(analogJustRules.length).toBeGreaterThanOrEqual(40);
        });

        it('ANALOG has requires rules', () => {
            const allRules = loadRules();
            const requiresRules = allRules.filter(
                r => (r.system as string) === 'ANALOG' && r.conditionType === 'requires'
            );

            expect(requiresRules.length).toBeGreaterThanOrEqual(15);
        });
    });

    describe('Code Detection Sanity', () => {
        it('no ANALOG code contains year-like patterns', () => {
            const cards = loadAnalogCards();
            for (const card of cards) {
                // Should not have 2020, 2021, 2022, 2023, 2024, 2025 in code
                expect(card.code).not.toMatch(/20[2-9]\d/);
            }
        });

        it('no ANALOG code uses NODE fallback', () => {
            const cards = loadAnalogCards();
            for (const card of cards) {
                expect(card.code).not.toContain('_NODE_');
            }
        });

        it('all expected chapter prefixes exist', () => {
            const cards = loadAnalogCards();
            const prefixes = new Set(cards.map(c => c.code.split('_')[1]));

            expect(prefixes.has('ZE')).toBe(true);
            expect(prefixes.has('Kons')).toBe(true);
            expect(prefixes.has('FAL')).toBe(true);
            expect(prefixes.has('KFO')).toBe(true);
        });
    });

    describe('Cross-Reference Quality', () => {
        it('majority of ANALOG cards have cross-references', () => {
            const cards = loadAnalogCards();
            const withRefs = cards.filter((c: any) => c.crossReferences && c.crossReferences.length > 0);

            const percentage = (withRefs.length / cards.length) * 100;
            expect(percentage).toBeGreaterThan(70);
        });

        it('GOZ cross-references total > 100', () => {
            const cards = loadAnalogCards();
            let gozCount = 0;
            for (const card of cards) {
                for (const ref of (card as any).crossReferences || []) {
                    if (ref.system === 'GOZ') gozCount++;
                }
            }
            expect(gozCount).toBeGreaterThan(100);
        });

        it('GOÄ cross-references exist', () => {
            const cards = loadAnalogCards();
            let goaeCount = 0;
            for (const card of cards) {
                for (const ref of (card as any).crossReferences || []) {
                    if (ref.system === 'GOAE') goaeCount++;
                }
            }
            expect(goaeCount).toBeGreaterThan(10);
        });
    });
});
