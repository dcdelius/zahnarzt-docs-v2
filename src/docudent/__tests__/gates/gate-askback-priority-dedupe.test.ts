/**
 * Gate: Askback Priority, Dedupe & Blocking
 * 
 * Tests v3 askback queue functionality:
 * 1. Priority Order: Higher priority templates asked first
 * 2. Deduping: Same question not asked twice
 * 3. Blocked Dependency: Templates with missing prerequisites reported
 * 4. Single-question per pass: Max 1 askback per case per pass
 * 5. Determinism: Same inputs produce same outputs
 */

import { describe, it, expect } from 'vitest';
import {
    buildAskbackQueue,
    selectNextAskback,
    createQueueState,
    calculatePriority,
    generateDedupeKey,
    checkDependencies,
    validateAnswer,
    type AskbackTemplate,
    type CaseState,
} from '../../core/billing/knowledgeBase/logic/askbackQueue';

// ═══════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════

const createTemplate = (
    id: string,
    severity: 'error' | 'warn',
    triggerType: 'missingField' | 'missingCode' | 'fieldValue' | 'complexCase',
    field?: string,
    opts: Partial<AskbackTemplate> = {}
): AskbackTemplate => ({
    templateId: id,
    ruleId: `RULE_${id}`,
    severity,
    trigger: {
        type: triggerType,
        field,
        ...opts.trigger,
    },
    ...opts,
});

describe('GATE: Askback Priority, Dedupe & Blocking', () => {
    describe('1) Priority Order', () => {
        it('error severity > warn severity', () => {
            const errorTemplate = createTemplate('T_ERROR', 'error', 'missingField', 'bonusStatus');
            const warnTemplate = createTemplate('T_WARN', 'warn', 'missingField', 'kiefer');

            const errorPriority = calculatePriority(errorTemplate);
            const warnPriority = calculatePriority(warnTemplate);

            expect(errorPriority).toBeGreaterThan(warnPriority);
        });

        it('missingField > missingCode > fieldValue > complexCase', () => {
            const missingField = createTemplate('T1', 'warn', 'missingField', 'kiefer');
            const missingCode = createTemplate('T2', 'warn', 'missingCode', undefined, { trigger: { type: 'missingCode', missingCode: 'FZ_6.8' } });
            const fieldValue = createTemplate('T3', 'warn', 'fieldValue', 'category');
            const complexCase = createTemplate('T4', 'warn', 'complexCase');

            const p1 = calculatePriority(missingField);
            const p2 = calculatePriority(missingCode);
            const p3 = calculatePriority(fieldValue);
            const p4 = calculatePriority(complexCase);

            expect(p1).toBeGreaterThan(p2);
            expect(p2).toBeGreaterThan(p3);
            expect(p3).toBeGreaterThan(p4);
        });

        it('kiefer template asked before teeth template (dependency order)', () => {
            const kieferTemplate = createTemplate('ASK_KIEFER', 'warn', 'missingField', 'kiefer');
            const teethTemplate = createTemplate('ASK_TEETH', 'warn', 'missingField', 'teeth', {
                trigger: { type: 'missingField', field: 'teeth', requiresField: 'kiefer' },
            });

            const caseState: CaseState = {
                id: 'CASE_01',
                category: 'ZE',
                festzuschuss: { fzCodes: ['FZ_3.2a'] },
            };

            const queueState = createQueueState();
            const queue = buildAskbackQueue(caseState, [teethTemplate, kieferTemplate], queueState);

            // teeth should be blocked since kiefer is missing
            expect(queueState.blockedTemplates.some(b => b.templateId === 'ASK_TEETH')).toBe(true);

            // Only kiefer should be in the queue
            const next = selectNextAskback(queue);
            expect(next?.template.templateId).toBe('ASK_KIEFER');
        });
    });

    describe('2) Deduping', () => {
        it('same dedupeKey only asked once', () => {
            const template1 = createTemplate('T1', 'warn', 'missingField', 'bonusStatus');
            const template2 = createTemplate('T2', 'warn', 'missingField', 'bonusStatus'); // Same field

            // Force same ruleId for deterministic dedupe key
            template2.ruleId = template1.ruleId;

            const caseState: CaseState = {
                id: 'CASE_01',
                category: 'ZE',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            const queue = buildAskbackQueue(caseState, [template1, template2], queueState);

            // One should be deduped
            expect(queueState.dedupedTemplates.length).toBe(1);
            expect(queue.length).toBe(1);
        });

        it('custom dedupeKey overrides default', () => {
            const template1 = createTemplate('T1', 'warn', 'missingField', 'bonusStatus', {
                dedupeKey: 'CUSTOM_KEY_A',
            });
            const template2 = createTemplate('T2', 'warn', 'missingField', 'bonusStatus', {
                dedupeKey: 'CUSTOM_KEY_B',
            });

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            const queue = buildAskbackQueue(caseState, [template1, template2], queueState);

            // Different custom keys = both should be in queue
            expect(queue.length).toBe(2);
            expect(queueState.dedupedTemplates.length).toBe(0);
        });

        it('deduped templates reported in report', () => {
            const templates = [
                createTemplate('T1', 'warn', 'missingField', 'bonusStatus'),
                { ...createTemplate('T2', 'warn', 'missingField', 'bonusStatus'), ruleId: 'RULE_T1' }, // Same ruleId
            ];

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            buildAskbackQueue(caseState, templates, queueState);

            expect(queueState.dedupedTemplates).toContain('T2');
        });
    });

    describe('3) Blocked Dependency', () => {
        it('template with requiresField blocked when field missing', () => {
            const template = createTemplate('ASK_TEETH', 'warn', 'missingField', 'teeth', {
                trigger: { type: 'missingField', field: 'teeth', requiresField: 'kiefer' },
            });

            const caseState: CaseState = {
                id: 'CASE_01',
                // kiefer is missing!
                festzuschuss: { fzCodes: [] },
            };

            const reason = checkDependencies(template, caseState, []);

            expect(reason).toBe('BLOCKED_MISSING_FIELD: kiefer');
        });

        it('template with dependsOn.fields blocked when fields missing', () => {
            const template = createTemplate('ASK_COMPLEX', 'warn', 'complexCase', undefined, {
                dependsOn: { fields: ['kiefer', 'teeth'] },
            });

            const caseState: CaseState = {
                id: 'CASE_01',
                kiefer: 'OK', // present
                // teeth is missing!
            };

            const reason = checkDependencies(template, caseState, []);

            expect(reason).toBe('BLOCKED_MISSING_FIELD: teeth');
        });

        it('blocked templates reported in queueState', () => {
            const template = createTemplate('ASK_TEETH', 'warn', 'missingField', 'teeth', {
                trigger: { type: 'missingField', field: 'teeth', requiresField: 'kiefer' },
            });

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            buildAskbackQueue(caseState, [template], queueState);

            expect(queueState.blockedTemplates).toHaveLength(1);
            expect(queueState.blockedTemplates[0].templateId).toBe('ASK_TEETH');
            expect(queueState.blockedTemplates[0].reason).toContain('BLOCKED_MISSING_FIELD');
        });
    });

    describe('4) Single-question per pass', () => {
        it('selectNextAskback returns only first item', () => {
            const templates = [
                createTemplate('T1', 'error', 'missingField', 'a'),
                createTemplate('T2', 'error', 'missingField', 'b'),
                createTemplate('T3', 'warn', 'missingField', 'c'),
            ];

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            const queue = buildAskbackQueue(caseState, templates, queueState);

            expect(queue.length).toBe(3);

            const next = selectNextAskback(queue);
            expect(next).not.toBeNull();
            // Should be highest priority (first alphabetically if same priority)
            expect(next!.template.templateId).toBe('T1');
        });

        it('only one askback returned even with multiple candidates', () => {
            const templates = Array.from({ length: 10 }, (_, i) =>
                createTemplate(`T${i}`, 'warn', 'missingField', `field${i}`)
            );

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            const queueState = createQueueState();
            const queue = buildAskbackQueue(caseState, templates, queueState);
            const next = selectNextAskback(queue);

            // Only one returned
            expect(next).not.toBeNull();
            // selectNextAskback returns single item, not array
        });
    });

    describe('5) Determinism', () => {
        it('same inputs produce same queue order', () => {
            const templates = [
                createTemplate('T_C', 'warn', 'missingField', 'fieldC'),
                createTemplate('T_A', 'warn', 'missingField', 'fieldA'),
                createTemplate('T_B', 'warn', 'missingField', 'fieldB'),
            ];

            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: [] },
            };

            // Run twice
            const queueState1 = createQueueState();
            const queue1 = buildAskbackQueue(caseState, templates, queueState1);

            const queueState2 = createQueueState();
            const queue2 = buildAskbackQueue(caseState, templates, queueState2);

            // Order should be identical (sorted by templateId as tie-breaker)
            const ids1 = queue1.map(q => q.template.templateId);
            const ids2 = queue2.map(q => q.template.templateId);

            expect(ids1).toEqual(ids2);
            expect(ids1).toEqual(['T_A', 'T_B', 'T_C']); // Alphabetical
        });

        it('dedupeKey is deterministic', () => {
            const template = createTemplate('T1', 'warn', 'missingField', 'bonusStatus');
            const caseState: CaseState = {
                id: 'CASE_01',
                festzuschuss: { fzCodes: ['FZ_1.1', 'FZ_2.1'] },
            };

            const key1 = generateDedupeKey(template, caseState);
            const key2 = generateDedupeKey(template, caseState);

            expect(key1).toBe(key2);
        });
    });

    describe('6) Answer Validation', () => {
        it('validates boolean type', () => {
            const template = createTemplate('T1', 'warn', 'missingField', 'zahnlos', {
                expectedAnswer: { type: 'boolean' },
            });

            expect(validateAnswer(template, true).valid).toBe(true);
            expect(validateAnswer(template, false).valid).toBe(true);
            expect(validateAnswer(template, 'yes').valid).toBe(false);
        });

        it('validates enum type', () => {
            const template = createTemplate('T1', 'warn', 'missingField', 'bonusStatus', {
                expectedAnswer: { type: 'enum', options: ['none', '5y', '10y', 'hardship'] },
            });

            expect(validateAnswer(template, 'none').valid).toBe(true);
            expect(validateAnswer(template, '10y').valid).toBe(true);
            expect(validateAnswer(template, 'invalid').valid).toBe(false);
        });

        it('validates stringArray type', () => {
            const template = createTemplate('T1', 'warn', 'missingField', 'teeth', {
                expectedAnswer: { type: 'stringArray', itemPattern: '^\\d{2}$', minItems: 1, maxItems: 32 },
            });

            expect(validateAnswer(template, ['11', '21']).valid).toBe(true);
            expect(validateAnswer(template, []).valid).toBe(false); // minItems
            expect(validateAnswer(template, ['invalid']).valid).toBe(false); // pattern
            expect(validateAnswer(template, 'not-array').valid).toBe(false);
        });
    });
});
