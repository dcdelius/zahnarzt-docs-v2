/**
 * Unit Tests for ruleIndex.ts
 */
import { describe, it, expect } from 'vitest';
import {
    buildRuleIndex,
    getCandidateRules,
    isRuleApplicable,
    getIndexStats,
    type Rule,
    type ImportedCaseLike,
} from '../core/billing/knowledgeBase/logic/ruleIndex';

// ═══════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════

const testRules: Rule[] = [
    {
        ruleId: 'RULE_ZE_BK1',
        severity: 'error',
        appliesTo: { category: 'ZE', befundklasse: ['1'], fzCodePattern: '^FZ_1\\.' },
        condition: { type: 'test' },
    },
    {
        ruleId: 'RULE_REPAIR_BK6',
        severity: 'warn',
        appliesTo: { category: 'REPAIR', befundklasse: ['6'], fzCodePattern: '^FZ_6\\.' },
        condition: { type: 'test' },
    },
    {
        ruleId: 'RULE_WILDCARD_ALL',
        severity: 'warn',
        appliesTo: { befundklasse: ['*'] },
        condition: { type: 'test' },
    },
    {
        ruleId: 'RULE_BK6_ONLY',
        severity: 'error',
        appliesTo: { befundklasse: ['6'] },
        condition: { type: 'test' },
    },
    {
        ruleId: 'RULE_NO_APPLIES_TO',
        severity: 'warn',
        condition: { type: 'test' },
    },
];

describe('ruleIndex', () => {
    describe('buildRuleIndex', () => {
        it('creates index with correct bucket counts', () => {
            const idx = buildRuleIndex(testRules);
            const stats = getIndexStats(idx);

            expect(stats.totalRules).toBe(5);
            expect(stats.categoryBuckets).toBeGreaterThan(0);
            expect(stats.bkBuckets).toBeGreaterThan(0);
        });

        it('indexes rules by category', () => {
            const idx = buildRuleIndex(testRules);

            expect(idx.byCategory.get('ZE')).toHaveLength(1);
            expect(idx.byCategory.get('REPAIR')).toHaveLength(1);
            expect(idx.byCategory.get('*')).toHaveLength(3); // wildcard + no category
        });

        it('indexes rules by BK', () => {
            const idx = buildRuleIndex(testRules);

            expect(idx.byBk.get('1')).toHaveLength(1);
            expect(idx.byBk.get('6')).toHaveLength(2); // RULE_REPAIR_BK6 + RULE_BK6_ONLY
            expect(idx.byBk.get('*')).toHaveLength(2); // RULE_WILDCARD_ALL + RULE_NO_APPLIES_TO
        });

        it('indexes rules by FZ prefix', () => {
            const idx = buildRuleIndex(testRules);

            expect(idx.byFzPrefix.get('FZ_1.')).toHaveLength(1);
            expect(idx.byFzPrefix.get('FZ_6.')).toHaveLength(1);
        });
    });

    describe('getCandidateRules', () => {
        const idx = buildRuleIndex(testRules);

        it('returns deduped candidates', () => {
            const zeCase: ImportedCaseLike = {
                id: 'CASE_01',
                category: 'ZE',
                befundklasse: '1',
                festzuschuss: { fzCodes: ['FZ_1.1'] },
            };

            const candidates = getCandidateRules(idx, zeCase);
            const ruleIds = candidates.map(r => r.ruleId);

            // Should be unique
            expect(new Set(ruleIds).size).toBe(ruleIds.length);
        });

        it('returns sorted candidates by ruleId', () => {
            const zeCase: ImportedCaseLike = {
                id: 'CASE_01',
                category: 'ZE',
                befundklasse: '1',
                festzuschuss: { fzCodes: ['FZ_1.1'] },
            };

            const candidates = getCandidateRules(idx, zeCase);
            const ruleIds = candidates.map(r => r.ruleId);

            expect(ruleIds).toEqual([...ruleIds].sort());
        });

        it('ZE case gets ZE rules + wildcards, not REPAIR-only rules', () => {
            const zeCase: ImportedCaseLike = {
                id: 'CASE_01',
                category: 'ZE',
                befundklasse: '1',
                festzuschuss: { fzCodes: ['FZ_1.1'] },
            };

            const candidates = getCandidateRules(idx, zeCase);
            const ruleIds = candidates.map(r => r.ruleId);

            expect(ruleIds).toContain('RULE_ZE_BK1');
            expect(ruleIds).toContain('RULE_WILDCARD_ALL');
            expect(ruleIds).toContain('RULE_NO_APPLIES_TO');
            expect(ruleIds).not.toContain('RULE_REPAIR_BK6');
        });

        it('REPAIR case gets REPAIR rules + wildcards, not ZE-only rules', () => {
            const repairCase: ImportedCaseLike = {
                id: 'CASE_02',
                category: 'REPAIR',
                befundklasse: '6',
                festzuschuss: { fzCodes: ['FZ_6.8'] },
            };

            const candidates = getCandidateRules(idx, repairCase);
            const ruleIds = candidates.map(r => r.ruleId);

            expect(ruleIds).toContain('RULE_REPAIR_BK6');
            expect(ruleIds).toContain('RULE_BK6_ONLY');
            expect(ruleIds).toContain('RULE_WILDCARD_ALL');
            expect(ruleIds).not.toContain('RULE_ZE_BK1');
        });

        it('BK6 case gets BK6 rules, not BK1-only rules', () => {
            const bk6Case: ImportedCaseLike = {
                id: 'CASE_03',
                category: 'REPAIR',
                befundklasse: '6',
                festzuschuss: { fzCodes: ['FZ_6.2'] },
            };

            const candidates = getCandidateRules(idx, bk6Case);
            const ruleIds = candidates.map(r => r.ruleId);

            expect(ruleIds).toContain('RULE_BK6_ONLY');
            expect(ruleIds).not.toContain('RULE_ZE_BK1');
        });

        it('returns non-empty for valid case', () => {
            const anyCase: ImportedCaseLike = {
                id: 'CASE_99',
                category: 'ZE',
                befundklasse: '7',
                festzuschuss: { fzCodes: ['FZ_7.1'] },
            };

            const candidates = getCandidateRules(idx, anyCase);

            // Should at least get wildcard rules
            expect(candidates.length).toBeGreaterThan(0);
        });
    });

    describe('isRuleApplicable', () => {
        it('returns true for matching rule', () => {
            const rule: Rule = {
                ruleId: 'TEST',
                severity: 'error',
                appliesTo: { category: 'ZE', befundklasse: ['1'] },
                condition: { type: 'test' },
            };

            const c: ImportedCaseLike = {
                id: 'CASE_01',
                category: 'ZE',
                befundklasse: '1',
            };

            expect(isRuleApplicable(rule, c)).toBe(true);
        });

        it('returns false for category mismatch', () => {
            const rule: Rule = {
                ruleId: 'TEST',
                severity: 'error',
                appliesTo: { category: 'REPAIR' },
                condition: { type: 'test' },
            };

            const c: ImportedCaseLike = {
                id: 'CASE_01',
                category: 'ZE',
            };

            expect(isRuleApplicable(rule, c)).toBe(false);
        });

        it('returns false for BK mismatch', () => {
            const rule: Rule = {
                ruleId: 'TEST',
                severity: 'error',
                appliesTo: { befundklasse: ['6'] },
                condition: { type: 'test' },
            };

            const c: ImportedCaseLike = {
                id: 'CASE_01',
                befundklasse: '1',
            };

            expect(isRuleApplicable(rule, c)).toBe(false);
        });

        it('returns true for wildcard BK', () => {
            const rule: Rule = {
                ruleId: 'TEST',
                severity: 'error',
                appliesTo: { befundklasse: ['*'] },
                condition: { type: 'test' },
            };

            const c: ImportedCaseLike = {
                id: 'CASE_01',
                befundklasse: '5',
            };

            expect(isRuleApplicable(rule, c)).toBe(true);
        });

        it('returns false for FZ pattern mismatch', () => {
            const rule: Rule = {
                ruleId: 'TEST',
                severity: 'error',
                appliesTo: { fzCodePattern: '^FZ_6\\.' },
                condition: { type: 'test' },
            };

            const c: ImportedCaseLike = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: ['FZ_1.1'] },
            };

            expect(isRuleApplicable(rule, c)).toBe(false);
        });
    });
});
