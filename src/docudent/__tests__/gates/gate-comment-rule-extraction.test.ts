/**
 * Gate Tests for Comment Rule Extraction
 * 
 * Tests:
 * - Deterministic extraction (stable ordering, stable IDs)
 * - Coverage: contra/maxCount rules have askback templates
 * - Rule structure validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    extractRulesFromCards,
    generateRulesFile,
    getRulesForCode,
    getContraRules,
    getMaxCountRules,
    clearRulesCache,
    type CommentRule,
} from '../../core/billing/knowledgeBase/secondary/commentRuleExtractor';
import { loadAllCards, clearCache } from '../../core/billing/knowledgeBase/secondary/commentCardStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASKBACK_TEMPLATES_PATH = path.resolve(
    __dirname,
    '../../core/billing/knowledgeBase/rules/askback_templates_comment_v1.json'
);

describe('GATE: Comment Rule Extraction', () => {
    beforeEach(() => {
        clearCache();
        clearRulesCache();
    });

    describe('Deterministic Extraction', () => {
        it('produces stable rule count across multiple extractions', () => {
            const first = generateRulesFile();
            clearRulesCache();
            clearCache();
            const second = generateRulesFile();

            expect(first.meta.totalRules).toBe(second.meta.totalRules);
        });

        it('produces stable rule IDs in same order', () => {
            const first = generateRulesFile();
            clearRulesCache();
            clearCache();
            const second = generateRulesFile();

            expect(first.rules.length).toBe(second.rules.length);
            for (let i = 0; i < first.rules.length; i++) {
                expect(first.rules[i].ruleId).toBe(second.rules[i].ruleId);
            }
        });

        it('rules are sorted by ruleId', () => {
            const result = generateRulesFile();
            for (let i = 1; i < result.rules.length; i++) {
                expect(result.rules[i - 1].ruleId.localeCompare(result.rules[i].ruleId)).toBeLessThanOrEqual(0);
            }
        });

        it('all ruleIds are unique', () => {
            const result = generateRulesFile();
            const ids = result.rules.map(r => r.ruleId);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });

        it('ruleIds match expected format CR_{SYSTEM}_{hash}', () => {
            const result = generateRulesFile();
            for (const rule of result.rules) {
                expect(rule.ruleId).toMatch(/^CR_(BEL|BEMA|GOZ|ANALOG)_[a-f0-9]{8}$/);
            }
        });
    });

    describe('Rule Structure', () => {
        it('all rules have required fields', () => {
            const result = generateRulesFile();
            for (const rule of result.rules) {
                expect(rule.ruleId).toBeTruthy();
                expect(rule.system).toMatch(/^(BEL|BEMA|GOZ|ANALOG|UNKNOWN)$/);
                expect(rule.codePattern).toBeTruthy();
                expect(rule.severity).toMatch(/^(warn|error|info)$/);
                expect(rule.conditionType).toBeTruthy();
                expect(typeof rule.payload).toBe('object');
                expect(rule.evidenceSnippet).toBeTruthy();
                expect(rule.sourceCardId).toBeTruthy();
                expect(Array.isArray(rule.tags)).toBe(true);
            }
        });

        it('contra rules have severity error', () => {
            const contraRules = getContraRules();
            for (const rule of contraRules) {
                expect(rule.severity).toBe('error');
            }
        });

        it('maxCount rules have severity warn', () => {
            const maxCountRules = getMaxCountRules();
            for (const rule of maxCountRules) {
                expect(rule.severity).toBe('warn');
            }
        });

        it('stats match actual rule counts', () => {
            const result = generateRulesFile();

            const bySystemActual: Record<string, number> = {};
            const byConditionActual: Record<string, number> = {};

            for (const rule of result.rules) {
                bySystemActual[rule.system] = (bySystemActual[rule.system] || 0) + 1;
                byConditionActual[rule.conditionType] = (byConditionActual[rule.conditionType] || 0) + 1;
            }

            for (const [system, count] of Object.entries(result.meta.bySystem)) {
                expect(count).toBe(bySystemActual[system] || 0);
            }

            for (const [type, count] of Object.entries(result.meta.byConditionType)) {
                expect(count).toBe(byConditionActual[type] || 0);
            }
        });
    });

    describe('Askback Template Coverage', () => {
        it('askback templates file exists', () => {
            expect(fs.existsSync(ASKBACK_TEMPLATES_PATH)).toBe(true);
        });

        it('templates cover required condition types', () => {
            const templates = JSON.parse(fs.readFileSync(ASKBACK_TEMPLATES_PATH, 'utf8'));
            const coveredTypes = templates._meta.coveredConditionTypes as string[];

            expect(coveredTypes).toContain('contra');
            expect(coveredTypes).toContain('maxCount');
        });

        it('has at least one template per covered condition type', () => {
            const templates = JSON.parse(fs.readFileSync(ASKBACK_TEMPLATES_PATH, 'utf8'));
            const coveredTypes = templates._meta.coveredConditionTypes as string[];
            const templateList = templates.templates as Array<{ conditionType: string }>;

            for (const type of coveredTypes) {
                const matching = templateList.filter(t => t.conditionType === type);
                expect(matching.length).toBeGreaterThan(0);
            }
        });

        it('all contra rules have applicable askback template', () => {
            const templates = JSON.parse(fs.readFileSync(ASKBACK_TEMPLATES_PATH, 'utf8'));
            const contraTemplates = templates.templates.filter((t: any) => t.conditionType === 'contra');

            expect(contraTemplates.length).toBeGreaterThan(0);
            expect(getContraRules().length).toBeGreaterThan(0);
        });

        it('all maxCount rules have applicable askback template', () => {
            const templates = JSON.parse(fs.readFileSync(ASKBACK_TEMPLATES_PATH, 'utf8'));
            const maxCountTemplates = templates.templates.filter((t: any) => t.conditionType === 'maxCount');

            expect(maxCountTemplates.length).toBeGreaterThan(0);
            expect(getMaxCountRules().length).toBeGreaterThan(0);
        });

        it('templates have required structure', () => {
            const templates = JSON.parse(fs.readFileSync(ASKBACK_TEMPLATES_PATH, 'utf8'));

            for (const template of templates.templates) {
                expect(template.templateId).toBeTruthy();
                expect(template.conditionType).toBeTruthy();
                expect(template.questionDE).toBeTruthy();
                expect(template.questionShort).toBeTruthy();
                expect(Array.isArray(template.options)).toBe(true);
                expect(template.options.length).toBeGreaterThan(0);
                expect(template.writeback).toBeTruthy();
                expect(template.priority).toBeGreaterThan(0);
            }
        });
    });

    describe('Lookup Functions', () => {
        it('getRulesForCode returns rules for known codes', () => {
            const bema12Rules = getRulesForCode('BEMA_12');
            expect(bema12Rules.length).toBeGreaterThan(0);
            for (const rule of bema12Rules) {
                expect(rule.codePattern).toBe('BEMA_12');
            }
        });

        it('getRulesForCode returns empty for unknown codes', () => {
            const unknownRules = getRulesForCode('UNKNOWN_9999');
            expect(unknownRules).toEqual([]);
        });

        it('getContraRules returns only contra rules', () => {
            const contraRules = getContraRules();
            expect(contraRules.length).toBeGreaterThan(0);
            for (const rule of contraRules) {
                expect(rule.conditionType).toBe('contra');
            }
        });

        it('getMaxCountRules returns only maxCount rules', () => {
            const maxCountRules = getMaxCountRules();
            expect(maxCountRules.length).toBeGreaterThan(0);
            for (const rule of maxCountRules) {
                expect(rule.conditionType).toBe('maxCount');
            }
        });
    });

    describe('System Distribution', () => {
        it('has rules from multiple systems', () => {
            const result = generateRulesFile();
            const systems = new Set(result.rules.map(r => r.system));

            expect(systems.has('BEMA')).toBe(true);
            expect(systems.has('BEL')).toBe(true);
        });

        it('BEMA has most rules (as expected from larger card count)', () => {
            const result = generateRulesFile();
            expect(result.meta.bySystem.BEMA).toBeGreaterThan(result.meta.bySystem.BEL);
        });
    });
});
