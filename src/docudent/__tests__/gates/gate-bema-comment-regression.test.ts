/**
 * BEMA Comment Ingestion Regression Gate Tests
 * 
 * Hard regression tests for BEMA golden codes.
 * These tests will fail if BEMA import changes unexpectedly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    loadBemaCards,
    getCommentCardsForCode,
    hasCommentData,
    getTopSnippetsForCode,
} from '../../core/billing/knowledgeBase/secondary/commentCardStore';
import { getRulesForCode, loadRules, clearRulesCache } from '../../core/billing/knowledgeBase/secondary/commentRuleExtractor';

describe('GATE: BEMA Comment Ingestion Regression', () => {
    beforeAll(() => {
        // Ensure fresh state
        clearRulesCache();
    });

    describe('BEMA Card Counts', () => {
        it('loads expected number of BEMA cards', () => {
            const cards = loadBemaCards();
            // We expect ~151 cards from BEMA import
            expect(cards.length).toBeGreaterThanOrEqual(140);
            expect(cards.length).toBeLessThanOrEqual(170);
        });

        it('all BEMA cards have system = BEMA or cross-refs', () => {
            const cards = loadBemaCards();
            for (const card of cards) {
                expect(['BEMA', 'BEL', 'GOZ', 'UNKNOWN']).toContain(card.system);
            }
        });
    });

    describe('Golden Code Regression', () => {
        const GOLDEN_EXPECTATIONS = [
            { code: 'BEMA_01', minSections: 80, minRules: 30, expectedTags: ['Krone', 'Material'] },
            { code: 'BEMA_12', minSections: 15, minRules: 5, expectedTags: ['KFO', 'Material'] },
            { code: 'BEMA_46', minSections: 90, minRules: 5, expectedTags: ['Material'] },
            { code: 'BEMA_100', minSections: 250, minRules: 2, expectedTags: ['Prothese'] },
            { code: 'BEMA_Ä1', minSections: 70, minRules: 2, expectedTags: ['Kombination'] },
        ];

        it.each(GOLDEN_EXPECTATIONS)(
            '$code has expected sections, rules, and tags',
            ({ code, minSections, minRules, expectedTags }) => {
                const cards = getCommentCardsForCode(code, 'BEMA');
                expect(cards.length).toBeGreaterThan(0);

                const card = cards[0];
                expect(card.sections.length).toBeGreaterThanOrEqual(minSections);

                const rules = getRulesForCode(code);
                expect(rules.length).toBeGreaterThanOrEqual(minRules);

                for (const tag of expectedTags) {
                    expect(card.tags || []).toContain(tag);
                }
            }
        );

        it('BEMA_01 has substantial top snippet', () => {
            const snippets = getTopSnippetsForCode('BEMA_01');
            expect(snippets.length).toBeGreaterThan(0);
            expect(snippets[0].length).toBeGreaterThan(50);
        });

        it('BEMA_Ä1 is properly detected (Ä-code)', () => {
            expect(hasCommentData('BEMA_Ä1')).toBe(true);
            const card = getCommentCardsForCode('BEMA_Ä1')[0];
            expect(card.code).toBe('BEMA_Ä1');
        });
    });

    describe('BEMA Rule Quality', () => {
        it('BEMA has significant rule count', () => {
            const allRules = loadRules();
            const bemaRules = allRules.filter(r => r.system === 'BEMA');

            expect(bemaRules.length).toBeGreaterThanOrEqual(250);
        });

        it('BEMA rules have low unknown percentage (<25%)', () => {
            const allRules = loadRules();
            const bemaRules = allRules.filter(r => r.system === 'BEMA');
            const unknownRules = bemaRules.filter(r => r.conditionType === 'unknown');

            const unknownPercent = (unknownRules.length / bemaRules.length) * 100;
            expect(unknownPercent).toBeLessThan(25);
        });

        it('BEMA has maxCount rules', () => {
            const allRules = loadRules();
            const bemaMaxCount = allRules.filter(r => r.system === 'BEMA' && r.conditionType === 'maxCount');

            expect(bemaMaxCount.length).toBeGreaterThanOrEqual(20);
        });

        it('BEMA has contra rules', () => {
            const allRules = loadRules();
            const bemaContra = allRules.filter(r => r.system === 'BEMA' && r.conditionType === 'contra');

            expect(bemaContra.length).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Section Classification', () => {
        it('BEMA cards have diverse section kinds', () => {
            const cards = loadBemaCards();
            const kinds = new Set<string>();

            for (const card of cards) {
                for (const section of card.sections || []) {
                    kinds.add(section.kind);
                }
            }

            // Should have at least billing, materials, limits, unknown
            expect(kinds.size).toBeGreaterThanOrEqual(4);
        });

        it('no BEMA card has zero sections', () => {
            const cards = loadBemaCards();
            for (const card of cards) {
                expect(card.sections?.length || 0).toBeGreaterThan(0);
            }
        });
    });
});
