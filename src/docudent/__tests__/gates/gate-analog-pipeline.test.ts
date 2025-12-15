/**
 * ANALOG Pipeline Regression Gate Tests
 * 
 * Tests:
 * - ANALOG cards load successfully
 * - All analog cards have analogHint with §6 reference
 * - Cross-references are extracted
 * - Rules are generated from ANALOG cards
 * - Specific code lookups work
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    loadAnalogCards,
    getCommentCardForCode,
    getCommentCardsForCode,
    hasCommentData,
    getStats,
    clearCache,
} from '../../core/billing/knowledgeBase/secondary/commentCardStore';
import {
    loadRules,
    getRulesForCode,
    clearRulesCache,
    generateRulesFile,
} from '../../core/billing/knowledgeBase/secondary/commentRuleExtractor';

describe('GATE: ANALOG Pipeline Regression', () => {
    beforeEach(() => {
        clearCache();
        clearRulesCache();
    });

    describe('ANALOG Card Loading', () => {
        it('loads expected number of ANALOG cards', () => {
            const cards = loadAnalogCards();
            // We expect ~57 cards from analog import
            expect(cards.length).toBeGreaterThanOrEqual(50);
            expect(cards.length).toBeLessThanOrEqual(70);
        });

        it('all ANALOG cards have system = ANALOG', () => {
            const cards = loadAnalogCards();
            for (const card of cards) {
                expect(card.system).toBe('ANALOG');
            }
        });

        it('all ANALOG cards have analogHint with §6 reference', () => {
            const cards = loadAnalogCards();
            for (const card of cards) {
                expect((card as any).analogHint).toBeTruthy();
                expect((card as any).analogHint.allowed).toBe(true);
                expect((card as any).analogHint.paragraph).toContain('§6');
            }
        });

        it('ANALOG cards have cross-references', () => {
            const cards = loadAnalogCards();
            const withRefs = cards.filter((c: any) => c.crossReferences && c.crossReferences.length > 0);
            // Most analog cards should have cross-refs
            expect(withRefs.length).toBeGreaterThan(cards.length * 0.7);
        });

        it('ANALOG cards are included in stats', () => {
            const stats = getStats();
            expect(stats.analogCards).toBeGreaterThan(0);
            expect(stats.bySystem.ANALOG).toBeGreaterThan(0);
        });
    });

    describe('Specific ANALOG Lookups', () => {
        it('ANALOG_ZE_02 exists with analogHint and crossRefs', () => {
            const card = getCommentCardForCode('ANALOG_ZE_02') as any;
            expect(card).not.toBeNull();
            expect(card.code).toBe('ANALOG_ZE_02');
            expect(card.title).toContain('Extrahierter Zahn');
            expect(card.analogHint).toBeTruthy();
            expect(card.analogHint.allowed).toBe(true);
            expect(card.crossReferences?.length).toBeGreaterThan(0);
        });

        it('ANALOG_Kons_04 exists (Kariesinfiltration)', () => {
            const card = getCommentCardForCode('ANALOG_Kons_04') as any;
            expect(card).not.toBeNull();
            expect(card.analogChapter).toContain('Konservierende');
        });

        it('ANALOG_FAL codes exist for Funktionsanalyse', () => {
            const cards = loadAnalogCards();
            const falCards = cards.filter(c => c.code.startsWith('ANALOG_FAL_'));
            expect(falCards.length).toBeGreaterThan(10);
        });

        it('hasCommentData works for ANALOG codes', () => {
            expect(hasCommentData('ANALOG_ZE_02')).toBe(true);
            expect(hasCommentData('ANALOG_NONEXISTENT_99')).toBe(false);
        });
    });

    describe('ANALOG Rule Extraction', () => {
        it('generates rules from ANALOG cards', () => {
            const result = generateRulesFile();
            expect(result.meta.bySystem.ANALOG).toBeGreaterThan(0);
        });

        it('ANALOG rules have correct system', () => {
            const allRules = loadRules();
            const analogRules = allRules.filter(r => r.system === 'ANALOG');
            expect(analogRules.length).toBeGreaterThan(50);
            for (const rule of analogRules) {
                expect(rule.codePattern).toMatch(/^ANALOG_/);
            }
        });

        it('ANALOG rules include expected condition types', () => {
            const allRules = loadRules();
            const analogRules = allRules.filter(r => r.system === 'ANALOG');
            const types = new Set(analogRules.map(r => r.conditionType));
            // ANALOG should have at least compat and unknown from softRule extraction
            expect(types.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Determinism', () => {
        it('ANALOG cards are in deterministic order', () => {
            const first = loadAnalogCards();
            clearCache();
            const second = loadAnalogCards();

            expect(first.length).toBe(second.length);
            for (let i = 0; i < first.length; i++) {
                expect(first[i].id).toBe(second[i].id);
            }
        });

        it('ANALOG rules have stable IDs', () => {
            const first = generateRulesFile();
            clearRulesCache();
            clearCache();
            const second = generateRulesFile();

            const firstAnalog = first.rules.filter(r => r.system === 'ANALOG');
            const secondAnalog = second.rules.filter(r => r.system === 'ANALOG');

            expect(firstAnalog.length).toBe(secondAnalog.length);
            for (let i = 0; i < firstAnalog.length; i++) {
                expect(firstAnalog[i].ruleId).toBe(secondAnalog[i].ruleId);
            }
        });
    });

    describe('Cross-Reference Quality', () => {
        it('cross-references include GOZ codes', () => {
            const cards = loadAnalogCards();
            let gozRefCount = 0;
            for (const card of cards) {
                for (const ref of (card as any).crossReferences || []) {
                    if (ref.system === 'GOZ') gozRefCount++;
                }
            }
            expect(gozRefCount).toBeGreaterThan(100);
        });

        it('cross-references include GOÄ codes', () => {
            const cards = loadAnalogCards();
            let goaeRefCount = 0;
            for (const card of cards) {
                for (const ref of (card as any).crossReferences || []) {
                    if (ref.system === 'GOAE') goaeRefCount++;
                }
            }
            expect(goaeRefCount).toBeGreaterThan(10);
        });
    });
});
