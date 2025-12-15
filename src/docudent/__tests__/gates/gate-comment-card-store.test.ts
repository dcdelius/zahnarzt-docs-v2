/**
 * Gate Tests for Comment Card Store
 * 
 * Tests:
 * - Deterministic loading
 * - Code exact match + system filter
 * - Search with filters
 * - Stats accuracy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    loadBelCards,
    loadBemaCards,
    loadGozCardsV2,
    loadAnalogCards,
    loadAllCards,
    getCommentCardsForCode,
    getCommentCardForCode,
    searchCommentCards,
    getTopSnippetsForCode,
    getSoftRulesForCode,
    getTagsForCode,
    hasCommentData,
    getStats,
    clearCache,
    type CommentCard,
} from '../../core/billing/knowledgeBase/secondary/commentCardStore';

describe('GATE: Comment Card Store', () => {
    beforeEach(() => {
        // Clear cache before each test for isolation
        clearCache();
    });

    describe('Loader Functions', () => {
        it('loads BEL cards successfully', () => {
            const cards = loadBelCards();
            expect(Array.isArray(cards)).toBe(true);
            // BEL index should have cards (we know ~185 from previous import)
            expect(cards.length).toBeGreaterThan(100);
        });

        it('loads BEMA cards successfully', () => {
            const cards = loadBemaCards();
            expect(Array.isArray(cards)).toBe(true);
            // BEMA index should have cards (we know ~151 from previous import)
            expect(cards.length).toBeGreaterThan(100);
        });

        it('loads GOZ v2 cards successfully', () => {
            const cards = loadGozCardsV2();
            expect(Array.isArray(cards)).toBe(true);
            // GOZ v2 index should have cards (we know ~144 from v2 import)
            expect(cards.length).toBeGreaterThan(100);
        });

        it('loads ANALOG cards successfully', () => {
            const cards = loadAnalogCards();
            expect(Array.isArray(cards)).toBe(true);
            // ANALOG index should have cards (~57 from import)
            expect(cards.length).toBeGreaterThan(40);
        });

        it('loads all cards (BEL + BEMA + GOZ + ANALOG merged) successfully', () => {
            const all = loadAllCards();
            const bel = loadBelCards();
            const bema = loadBemaCards();
            const goz = loadGozCardsV2();
            const analog = loadAnalogCards();

            expect(all.length).toBe(bel.length + bema.length + goz.length + analog.length);
        });

        it('returns deterministic order for all cards', () => {
            const first = loadAllCards();
            clearCache();
            const second = loadAllCards();

            expect(first.length).toBe(second.length);
            // Same IDs in same order
            for (let i = 0; i < first.length; i++) {
                expect(first[i].id).toBe(second[i].id);
            }
        });

        it('cards are sorted by id', () => {
            const cards = loadAllCards();
            for (let i = 1; i < cards.length; i++) {
                expect(cards[i - 1].id.localeCompare(cards[i].id)).toBeLessThanOrEqual(0);
            }
        });

        it('all cards have required fields', () => {
            const cards = loadAllCards();
            for (const card of cards) {
                expect(card.id).toBeTruthy();
                expect(card.system).toMatch(/^(BEL|BEMA|GOZ|ANALOG|UNKNOWN)$/);
                expect(card.code).toBeTruthy();
                expect(card.source).toBeTruthy();
                expect(Array.isArray(card.sections)).toBe(true);
            }
        });
    });

    describe('Code Lookup', () => {
        it('finds cards by exact code match', () => {
            const cards = getCommentCardsForCode('BEMA_12');
            expect(cards.length).toBeGreaterThan(0);
            expect(cards[0].code).toBe('BEMA_12');
        });

        it('finds BEL cards by code', () => {
            const cards = getCommentCardsForCode('BEL_0010');
            expect(cards.length).toBeGreaterThan(0);
            expect(cards[0].system).toBe('BEL');
        });

        it('returns empty array for non-existent code', () => {
            const cards = getCommentCardsForCode('NONEXISTENT_9999');
            expect(cards).toEqual([]);
        });

        it('filters by system when provided', () => {
            // Get all cards for a code, then filter
            const all = getCommentCardsForCode('BEMA_01');
            const bemaOnly = getCommentCardsForCode('BEMA_01', 'BEMA');

            expect(all.length).toBeGreaterThan(0);
            expect(bemaOnly.length).toBeLessThanOrEqual(all.length);
            for (const card of bemaOnly) {
                expect(card.system).toBe('BEMA');
            }
        });

        it('getCommentCardForCode returns single card or null', () => {
            const card = getCommentCardForCode('BEMA_12');
            expect(card).not.toBeNull();
            expect(card!.code).toBe('BEMA_12');

            const missing = getCommentCardForCode('MISSING_9999');
            expect(missing).toBeNull();
        });
    });

    describe('Search', () => {
        it('finds cards by text query', () => {
            const results = searchCommentCards('Füllung');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].score).toBeGreaterThan(0);
        });

        it('filters by system', () => {
            const results = searchCommentCards('Krone', { system: 'BEMA' });
            for (const r of results) {
                expect(r.card.system).toBe('BEMA');
            }
        });

        it('filters by multiple systems', () => {
            const results = searchCommentCards('Basis', { system: ['BEL', 'BEMA'] });
            for (const r of results) {
                expect(['BEL', 'BEMA']).toContain(r.card.system);
            }
        });

        it('filters by tags', () => {
            const results = searchCommentCards('', { tags: ['Krone'] });
            for (const r of results) {
                expect(r.card.tags).toContain('Krone');
            }
        });

        it('filters by hasRules', () => {
            const results = searchCommentCards('', { hasRules: true }, 50);
            for (const r of results) {
                expect(r.card.softRules).toBeTruthy();
                expect(r.card.softRules!.length).toBeGreaterThan(0);
            }
        });

        it('respects limit parameter', () => {
            const results = searchCommentCards('a', {}, 5);
            expect(results.length).toBeLessThanOrEqual(5);
        });

        it('returns sorted results by score', () => {
            const results = searchCommentCards('Prothese');
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
        });
    });

    describe('Helper Functions', () => {
        it('getTopSnippetsForCode returns snippets', () => {
            const snippets = getTopSnippetsForCode('BEMA_12', 3);
            expect(Array.isArray(snippets)).toBe(true);
            expect(snippets.length).toBeLessThanOrEqual(3);
        });

        it('getSoftRulesForCode returns rules', () => {
            const rules = getSoftRulesForCode('BEMA_01');
            expect(Array.isArray(rules)).toBe(true);
            // BEMA_01 should have some rules
            if (rules.length > 0) {
                expect(rules[0].type).toBeTruthy();
                expect(rules[0].severity).toBe('warn');
            }
        });

        it('getTagsForCode returns deduplicated sorted tags', () => {
            const tags = getTagsForCode('BEMA_12');
            expect(Array.isArray(tags)).toBe(true);
            // Check sorted
            for (let i = 1; i < tags.length; i++) {
                expect(tags[i - 1].localeCompare(tags[i])).toBeLessThanOrEqual(0);
            }
        });

        it('hasCommentData returns boolean', () => {
            expect(hasCommentData('BEMA_12')).toBe(true);
            expect(hasCommentData('NONEXISTENT_9999')).toBe(false);
        });
    });

    describe('Stats', () => {
        it('returns accurate stats', () => {
            const stats = getStats();

            expect(stats.belCards).toBeGreaterThan(0);
            expect(stats.bemaCards).toBeGreaterThan(0);
            expect(stats.gozCards).toBeGreaterThan(0);
            expect(stats.analogCards).toBeGreaterThan(0);
            expect(stats.totalCards).toBe(stats.belCards + stats.bemaCards + stats.gozCards + stats.analogCards);
            expect(stats.uniqueCodes).toBeGreaterThan(0);
            // bySystem counts cards by their system field
            const systemSum = (stats.bySystem.BEL || 0) + (stats.bySystem.BEMA || 0) +
                (stats.bySystem.GOZ || 0) + (stats.bySystem.ANALOG || 0) +
                (stats.bySystem.UNKNOWN || 0);
            expect(systemSum).toBe(stats.totalCards);
        });
    });

    describe('Demo Lookups', () => {
        it.each([
            ['BEMA_12', 'BEMA'],
            ['BEMA_01', 'BEMA'],
            ['BEL_0010', 'BEL'],
            ['GOZ_1000', 'GOZ'],
            ['GOZ_0010', 'GOZ'],
        ])('lookup %s returns %s cards', (code, expectedSystem) => {
            const card = getCommentCardForCode(code);
            expect(card).not.toBeNull();
            expect(card!.system).toBe(expectedSystem);
            expect(card!.sections.length).toBeGreaterThan(0);
        });

        it('GOZ cards have snippets and comment data', () => {
            const snippets = getTopSnippetsForCode('GOZ_1000');
            expect(snippets.length).toBeGreaterThan(0);
            expect(hasCommentData('GOZ_0010')).toBe(true);
        });

        it('ANALOG cards have snippets and §6 hint', () => {
            const analog = loadAnalogCards();
            expect(analog.length).toBeGreaterThan(0);
            // All analog cards should have analogHint
            const withHint = analog.filter((c: any) => c.analogHint);
            expect(withHint.length).toBe(analog.length);
        });
    });
});
