/**
 * Askback Runner Logic
 * 
 * Provides deterministic askback selection, writeback application,
 * and simulation of askback sessions for case pack validation.
 * 
 * ## v3 Priority, Dependency & Dedupe Rules
 * 
 * ### Priority (higher = asked first)
 * 1. Severity: error (1000) > warn (500)
 * 2. Trigger type: missingField (100) > missingCode (80) > fieldValue (60) > complexCase (40)
 * 3. Tie-break: templateId alphabetically
 * 
 * ### Dependency Handling
 * - Templates with `requiresField` or `dependsOn.fields` are blocked until fields exist
 * - Templates with `dependsOn.templates` wait for those templates to be asked
 * - Blocked templates are reported with reason
 * 
 * ### Deduplication
 * - Default key: ruleId + trigger.type + trigger.field + trigger.missingCode + fzSet
 * - Custom `dedupeKey` overrides default
 * - Once asked, never ask again (except 1 retry on invalid answer)
 * 
 * ### Single-question per pass Mode (v3)
 * - Each pass asks at most 1 askback per case
 * - Writeback applied, then next pass
 * - Max 5 passes (default)
 */

import { extractBk } from './fzCode';
import {
    buildAskbackQueue,
    selectNextAskback,
    validateAnswer,
    createQueueState,
    markAsAsked,
    markInvalidAnswer,
    type AskbackQueueState,
    type QueuedAskback,
    type AskbackTemplate as QueueTemplate,
    type CaseState,
} from './askbackQueue';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AskbackTemplate {
    templateId: string;
    ruleId: string;
    severity: 'error' | 'warn';
    trigger: {
        type: 'missingField' | 'missingCode' | 'complexCase' | 'fzCodePresent';
        whenFzCodesInclude?: string[];
        field?: string;
        missingCode?: string;
        requiresField?: string;
        when?: {
            befundklasse?: string;
            minBk6Codes?: number;
            minDistinctBK?: number;
        };
    };
    question: {
        de: string;
        shortDe: string;
    };
    expectedAnswer: {
        type: 'boolean' | 'enum' | 'stringArray' | 'object';
        [key: string]: any;
    };
    writeback: {
        setCaseField?: string;
        addFzCode?: string;
        onlyIfAnswer?: boolean;
        valueFromAnswer?: boolean;
        suggestFzChange?: {
            ifAnswer: string;
            suggestReplace: { from: string; to: string };
        };
    };
    evidence?: any;
}

export interface AskbackTemplatesDoc {
    _meta: any;
    templates: AskbackTemplate[];
}

export interface Rule {
    ruleId: string;
    severity: 'error' | 'warn';
    condition: {
        type: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface RulesDoc {
    _meta: any;
    rules: Rule[];
}

export interface ImportedCase {
    id: string;
    category?: string;
    befundklasse?: string;
    festzuschuss?: { fzCodes?: string[] };
    bel?: { belCodes?: string[] };
    kiefer?: 'OK' | 'UK';
    teeth?: string[];
    zahnlos?: boolean;
    fzToTeethMap?: Record<string, string[]>;
    bk6ComboStatus?: string;
    unterfuetterungType?: string;
    validationNotes?: string[];
    [key: string]: any;
}

export interface CasePack {
    meta?: any;
    cases: ImportedCase[];
}

export interface RuleEvaluation {
    ruleId: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    note?: string;
}

export interface AskbackSelection {
    templateId: string;
    ruleId: string;
    reason: string;
}

export interface WritebackApplied {
    templateId: string;
    field: string;
    value: any;
    action: 'set' | 'add' | 'note';
}

export interface CaseSimulationResult {
    caseId: string;
    triggeredTemplates: string[];
    writebacksApplied: WritebackApplied[];
    inconclusiveBefore: number;
    inconclusiveAfter: number;
    notes: string[];
}

export interface SimulationReport {
    meta: {
        timestamp: string;
        casesProcessed: number;
    };
    summary: {
        inconclusiveBefore: number;
        inconclusiveAfter: number;
        reduction: number;
        templatesTriggered: number;
        writebacksApplied: number;
    };
    perCase: CaseSimulationResult[];
}

// ═══════════════════════════════════════════════════════════════
// V3 EXTENDED TYPES (Priority + Dedupe + Blocking)
// ═══════════════════════════════════════════════════════════════

export interface CaseSimulationResultV3 extends CaseSimulationResult {
    askedTemplateIds: string[];
    dedupedTemplates: string[];
    blockedTemplates: Array<{ templateId: string; reason: string }>;
    invalidAnswers: Array<{ templateId: string; reason: string; retryCount: number }>;
    passesUsed: number;
}

export interface SimulationReportV3 {
    meta: {
        timestamp: string;
        casesProcessed: number;
        version: 'v3';
    };
    summary: {
        inconclusiveBefore: number;
        inconclusiveAfter: number;
        reduction: number;
        templatesTriggered: number;
        writebacksApplied: number;
        totalDeduped: number;
        totalBlocked: number;
        totalInvalidAnswers: number;
        passesUsedAvg: number;
    };
    perCase: CaseSimulationResultV3[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function countInconclusive(evaluations: RuleEvaluation[]): number {
    return evaluations.filter(
        e => e.status === 'WARN' && e.note?.includes('INCONCLUSIVE')
    ).length;
}

// ═══════════════════════════════════════════════════════════════
// RULE EVALUATION (simplified from gate test)
// ═══════════════════════════════════════════════════════════════

export function evaluateRulesForCase(rules: Rule[], c: ImportedCase): RuleEvaluation[] {
    const results: RuleEvaluation[] = [];
    const fzCodes = c.festzuschuss?.fzCodes ?? [];
    const belCodes = c.bel?.belCodes ?? [];

    for (const rule of rules) {
        // Check if rule applies
        const applies = rule.appliesTo ?? {};
        if (applies.category && c.category && applies.category !== c.category) continue;
        if (applies.befundklasse && applies.befundklasse.length > 0) {
            if (!applies.befundklasse.includes('*') && !applies.befundklasse.includes(c.befundklasse)) continue;
        }
        if (applies.fzCodePattern) {
            const re = new RegExp(applies.fzCodePattern);
            if (!fzCodes.some(z => re.test(z))) continue;
        }

        // Evaluate rule
        const eval_ = evaluateSingleRule(rule, c, fzCodes, belCodes);
        results.push(eval_);
    }

    return results;
}

function evaluateSingleRule(
    rule: Rule,
    c: ImportedCase,
    fzCodes: string[],
    belCodes: string[]
): RuleEvaluation {
    const base = { ruleId: rule.ruleId };

    switch (rule.condition.type) {
        case 'requiresCode': {
            const code = rule.condition.code;
            const requires = rule.condition.requires ?? [];
            if (!fzCodes.includes(code)) return { ...base, status: 'PASS' };
            const missing = requires.filter((r: string) => !fzCodes.includes(r));
            if (missing.length > 0) {
                return { ...base, status: 'FAIL', note: `Missing: ${missing.join(', ')}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'verblendbereichRequired': {
            const code = rule.condition.code;
            if (!fzCodes.includes(code)) return { ...base, status: 'PASS' };
            if (!c.teeth || c.teeth.length === 0) {
                return { ...base, status: 'WARN', note: 'INCONCLUSIVE: No teeth list' };
            }
            if (!c.kiefer) {
                return { ...base, status: 'WARN', note: 'INCONCLUSIVE: No kiefer' };
            }
            // Validate teeth in verblendbereich
            const vb = rule.condition.verblendbereich;
            const allowed = c.kiefer === 'OK' ? vb.OK : vb.UK;
            const invalid = c.teeth.filter(t => !allowed.includes(t));
            if (invalid.length > 0) {
                return { ...base, status: 'FAIL', note: `Outside Verblendbereich: ${invalid.join(', ')}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'zahnlosRequired': {
            const code = rule.condition.code;
            if (!fzCodes.includes(code)) return { ...base, status: 'PASS' };
            if (typeof c.zahnlos !== 'boolean') {
                return { ...base, status: 'WARN', note: 'INCONCLUSIVE: No zahnlos boolean' };
            }
            if (!c.zahnlos) {
                return { ...base, status: 'FAIL', note: 'Case indicates zahnlos=false' };
            }
            return { ...base, status: 'PASS' };
        }

        case 'maxCount': {
            const code = rule.condition.code;
            const max = rule.condition.maxPerKiefer ?? 2;
            const count = fzCodes.filter(z => z === code).length;
            if (count > max) {
                return { ...base, status: 'FAIL', note: `Count=${count} > ${max}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'multiCodeInBK': {
            const targetBK = String(rule.condition.befundklasse ?? '');
            const minCount = Number(rule.condition.minCount ?? 2);
            const inBk = fzCodes.filter(z => extractBk(z) === targetBK);
            if (inBk.length >= minCount) {
                return { ...base, status: 'WARN', note: `Multi-FZ in BK${targetBK}: ${inBk.join(', ')}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'multipleBefundklassen': {
            const minDistinctBK = Number(rule.condition.minDistinctBK ?? 2);
            const bks = [...new Set(fzCodes.map(extractBk).filter(Boolean))];
            if (bks.length >= minDistinctBK) {
                return { ...base, status: 'WARN', note: `Distinct BK: ${bks.join(', ')}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'categoryCheck': {
            const expectedCategory = rule.condition.expectedCategory;
            const code = rule.condition.code;
            if (code && !fzCodes.includes(code)) return { ...base, status: 'PASS' };
            if (c.category !== expectedCategory) {
                return { ...base, status: 'WARN', note: `Category mismatch: ${c.category}` };
            }
            return { ...base, status: 'PASS' };
        }

        case 'belCodeRequired': {
            const expected = rule.condition.expectedBelCodes ?? [];
            const fzCode = rule.condition.fzCode;
            if (fzCode && !fzCodes.includes(fzCode)) return { ...base, status: 'PASS' };
            const missing = expected.filter((b: string) => !belCodes.includes(b));
            if (missing.length > 0) {
                return { ...base, status: 'WARN', note: `Missing BEL: ${missing.join(', ')}` };
            }
            return { ...base, status: 'PASS' };
        }

        default:
            return { ...base, status: 'WARN', note: `Unknown condition type: ${rule.condition.type}` };
    }
}

// ═══════════════════════════════════════════════════════════════
// ASKBACK SELECTION
// ═══════════════════════════════════════════════════════════════

export function selectAskbacksForCase(
    c: ImportedCase,
    rulesEval: RuleEvaluation[],
    templates: AskbackTemplate[]
): AskbackSelection[] {
    const fzCodes = c.festzuschuss?.fzCodes ?? [];
    const selected: AskbackSelection[] = [];

    // Sort templates: error before warn, then by templateId
    const sorted = [...templates].sort((a, b) => {
        if (a.severity !== b.severity) {
            return a.severity === 'error' ? -1 : 1;
        }
        return a.templateId.localeCompare(b.templateId);
    });

    for (const template of sorted) {
        if (selected.length >= 5) break; // Max 5 per case

        const trigger = template.trigger;

        // Check trigger conditions
        if (trigger.type === 'missingField') {
            if (trigger.whenFzCodesInclude && !trigger.whenFzCodesInclude.some(f => fzCodes.includes(f))) {
                continue;
            }
            if (trigger.requiresField && c[trigger.requiresField] === undefined) {
                continue;
            }
            if (trigger.field && c[trigger.field] !== undefined) {
                continue; // Field already present
            }
            selected.push({
                templateId: template.templateId,
                ruleId: template.ruleId,
                reason: `Missing field: ${trigger.field}`,
            });
        } else if (trigger.type === 'missingCode') {
            if (trigger.whenFzCodesInclude && !trigger.whenFzCodesInclude.some(f => fzCodes.includes(f))) {
                continue;
            }
            if (trigger.missingCode && fzCodes.includes(trigger.missingCode)) {
                continue; // Code already present
            }
            selected.push({
                templateId: template.templateId,
                ruleId: template.ruleId,
                reason: `Missing code: ${trigger.missingCode}`,
            });
        } else if (trigger.type === 'complexCase') {
            const when = trigger.when ?? {};
            if (when.minDistinctBK) {
                const bks = [...new Set(fzCodes.map(extractBk).filter(Boolean))];
                if (bks.length < when.minDistinctBK) continue;
            }
            if (when.befundklasse && when.minBk6Codes) {
                const inBk = fzCodes.filter(z => extractBk(z) === when.befundklasse);
                if (inBk.length < when.minBk6Codes) continue;
            }
            // Check if field already set
            const wb = template.writeback;
            if (wb.setCaseField && c[wb.setCaseField] !== undefined) {
                continue;
            }
            selected.push({
                templateId: template.templateId,
                ruleId: template.ruleId,
                reason: 'Complex case trigger',
            });
        } else if (trigger.type === 'fzCodePresent') {
            if (trigger.whenFzCodesInclude && !trigger.whenFzCodesInclude.some(f => fzCodes.includes(f))) {
                continue;
            }
            const wb = template.writeback;
            if (wb.setCaseField && c[wb.setCaseField] !== undefined) {
                continue;
            }
            selected.push({
                templateId: template.templateId,
                ruleId: template.ruleId,
                reason: 'FZ code present',
            });
        }
    }

    return selected;
}

// ═══════════════════════════════════════════════════════════════
// WRITEBACK APPLICATION
// ═══════════════════════════════════════════════════════════════

export function applyWriteback(
    c: ImportedCase,
    template: AskbackTemplate,
    answer: any
): { updated: ImportedCase; writebacks: WritebackApplied[] } {
    const updated = JSON.parse(JSON.stringify(c)) as ImportedCase;
    const writebacks: WritebackApplied[] = [];
    const wb = template.writeback;

    if (wb.setCaseField && wb.valueFromAnswer) {
        updated[wb.setCaseField] = answer;
        writebacks.push({
            templateId: template.templateId,
            field: wb.setCaseField,
            value: answer,
            action: 'set',
        });
    }

    if (wb.addFzCode) {
        if (wb.onlyIfAnswer && !answer) {
            // Don't add
        } else {
            if (!updated.festzuschuss) updated.festzuschuss = { fzCodes: [] };
            if (!updated.festzuschuss.fzCodes) updated.festzuschuss.fzCodes = [];
            if (!updated.festzuschuss.fzCodes.includes(wb.addFzCode)) {
                updated.festzuschuss.fzCodes.push(wb.addFzCode);
                writebacks.push({
                    templateId: template.templateId,
                    field: 'festzuschuss.fzCodes',
                    value: wb.addFzCode,
                    action: 'add',
                });
            }
        }
    }

    if (wb.suggestFzChange && answer === wb.suggestFzChange.ifAnswer) {
        if (!updated.validationNotes) updated.validationNotes = [];
        const note = `Suggested FZ change: ${wb.suggestFzChange.suggestReplace.from} → ${wb.suggestFzChange.suggestReplace.to}`;
        updated.validationNotes.push(note);
        writebacks.push({
            templateId: template.templateId,
            field: 'validationNotes',
            value: note,
            action: 'note',
        });
    }

    return { updated, writebacks };
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════════════════════════

export type AnswerProvider = (templateId: string) => any | undefined;

export function simulateAskbackSession(
    casePack: CasePack,
    rulesDoc: RulesDoc,
    templatesDoc: AskbackTemplatesDoc,
    answerProvider: AnswerProvider
): { updatedCases: ImportedCase[]; report: SimulationReport } {
    const updatedCases: ImportedCase[] = [];
    const perCase: CaseSimulationResult[] = [];
    let totalInconclusiveBefore = 0;
    let totalInconclusiveAfter = 0;
    let totalTriggered = 0;
    let totalWritebacks = 0;

    for (const c of casePack.cases) {
        let current = JSON.parse(JSON.stringify(c)) as ImportedCase;
        const triggeredTemplates: string[] = [];
        const writebacksApplied: WritebackApplied[] = [];
        const notes: string[] = [];

        // Evaluate before
        const evalsBefore = evaluateRulesForCase(rulesDoc.rules, current);
        const inconclusiveBefore = countInconclusive(evalsBefore);
        totalInconclusiveBefore += inconclusiveBefore;

        // Run multiple passes (up to 3) to handle dependent askbacks
        const MAX_PASSES = 3;
        for (let pass = 0; pass < MAX_PASSES; pass++) {
            const currentEvals = evaluateRulesForCase(rulesDoc.rules, current);
            const selections = selectAskbacksForCase(current, currentEvals, templatesDoc.templates);

            if (selections.length === 0) break; // No more askbacks needed

            let appliedThisPass = 0;
            for (const sel of selections) {
                if (triggeredTemplates.includes(sel.templateId)) continue; // Already triggered

                const answer = answerProvider(sel.templateId);
                if (answer === undefined) {
                    notes.push(`No answer for ${sel.templateId}`);
                    continue;
                }

                const template = templatesDoc.templates.find(t => t.templateId === sel.templateId);
                if (!template) continue;

                triggeredTemplates.push(sel.templateId);
                totalTriggered++;

                const { updated, writebacks } = applyWriteback(current, template, answer);
                current = updated;
                writebacksApplied.push(...writebacks);
                totalWritebacks += writebacks.length;
                appliedThisPass++;
            }

            if (appliedThisPass === 0) break; // No new askbacks applied
        }

        // Evaluate after
        const evalsAfter = evaluateRulesForCase(rulesDoc.rules, current);
        const inconclusiveAfter = countInconclusive(evalsAfter);
        totalInconclusiveAfter += inconclusiveAfter;

        updatedCases.push(current);
        perCase.push({
            caseId: c.id,
            triggeredTemplates,
            writebacksApplied,
            inconclusiveBefore,
            inconclusiveAfter,
            notes,
        });
    }

    const report: SimulationReport = {
        meta: {
            timestamp: new Date().toISOString(),
            casesProcessed: casePack.cases.length,
        },
        summary: {
            inconclusiveBefore: totalInconclusiveBefore,
            inconclusiveAfter: totalInconclusiveAfter,
            reduction: totalInconclusiveBefore - totalInconclusiveAfter,
            templatesTriggered: totalTriggered,
            writebacksApplied: totalWritebacks,
        },
        perCase,
    };

    return { updatedCases, report };
}

// ═══════════════════════════════════════════════════════════════
// V3 SIMULATION (Single-question per pass, Priority, Dedupe)
// ═══════════════════════════════════════════════════════════════

export interface SimulationOptionsV3 {
    maxPasses?: number; // default 5
}

export function simulateAskbackSessionV3(
    casePack: CasePack,
    rulesDoc: RulesDoc,
    templatesDoc: AskbackTemplatesDoc,
    answerProvider: AnswerProvider,
    options: SimulationOptionsV3 = {}
): { updatedCases: ImportedCase[]; report: SimulationReportV3 } {
    const maxPasses = options.maxPasses ?? 5;
    const updatedCases: ImportedCase[] = [];
    const perCase: CaseSimulationResultV3[] = [];

    let totalInconclusiveBefore = 0;
    let totalInconclusiveAfter = 0;
    let totalTriggered = 0;
    let totalWritebacks = 0;
    let totalDeduped = 0;
    let totalBlocked = 0;
    let totalInvalidAnswers = 0;
    let totalPasses = 0;

    // Cast templates to queue type (compatible)
    const queueTemplates = templatesDoc.templates as unknown as QueueTemplate[];

    for (const c of casePack.cases) {
        let current = JSON.parse(JSON.stringify(c)) as ImportedCase;
        const triggeredTemplates: string[] = [];
        const writebacksApplied: WritebackApplied[] = [];
        const notes: string[] = [];
        const queueState = createQueueState();

        // Evaluate before
        const evalsBefore = evaluateRulesForCase(rulesDoc.rules, current);
        const inconclusiveBefore = countInconclusive(evalsBefore);
        totalInconclusiveBefore += inconclusiveBefore;

        let passesUsed = 0;

        for (let pass = 0; pass < maxPasses; pass++) {
            // Build queue with current case state
            const queue = buildAskbackQueue(
                current as CaseState,
                queueTemplates,
                queueState
            );

            // Select next askback (single-question per pass)
            const next = selectNextAskback(queue);
            if (!next) break; // No more askbacks

            passesUsed++;

            // Get answer
            const answer = answerProvider(next.template.templateId);
            if (answer === undefined) {
                notes.push(`No answer for ${next.template.templateId}`);
                markAsAsked(queueState, next); // Mark as asked to prevent infinite loop
                continue;
            }

            // Validate answer
            const validation = validateAnswer(next.template, answer);
            if (!validation.valid) {
                markInvalidAnswer(queueState, next.template.templateId, validation.reason ?? 'Unknown');
                notes.push(`Invalid answer for ${next.template.templateId}: ${validation.reason}`);
                markAsAsked(queueState, next);
                continue;
            }

            // Find original template for writeback
            const template = templatesDoc.templates.find(t => t.templateId === next.template.templateId);
            if (!template) {
                markAsAsked(queueState, next);
                continue;
            }

            // Mark as asked and apply writeback
            markAsAsked(queueState, next);
            triggeredTemplates.push(next.template.templateId);
            totalTriggered++;

            const { updated, writebacks } = applyWriteback(current, template, answer);
            current = updated;
            writebacksApplied.push(...writebacks);
            totalWritebacks += writebacks.length;
        }

        // Evaluate after
        const evalsAfter = evaluateRulesForCase(rulesDoc.rules, current);
        const inconclusiveAfter = countInconclusive(evalsAfter);
        totalInconclusiveAfter += inconclusiveAfter;

        // Aggregate stats
        totalDeduped += queueState.dedupedTemplates.length;
        totalBlocked += queueState.blockedTemplates.length;
        totalInvalidAnswers += queueState.invalidAnswers.length;
        totalPasses += passesUsed;

        updatedCases.push(current);
        perCase.push({
            caseId: c.id,
            triggeredTemplates,
            writebacksApplied,
            inconclusiveBefore,
            inconclusiveAfter,
            notes,
            askedTemplateIds: queueState.askedTemplateIds,
            dedupedTemplates: queueState.dedupedTemplates,
            blockedTemplates: queueState.blockedTemplates,
            invalidAnswers: queueState.invalidAnswers,
            passesUsed,
        });
    }

    const report: SimulationReportV3 = {
        meta: {
            timestamp: new Date().toISOString(),
            casesProcessed: casePack.cases.length,
            version: 'v3',
        },
        summary: {
            inconclusiveBefore: totalInconclusiveBefore,
            inconclusiveAfter: totalInconclusiveAfter,
            reduction: totalInconclusiveBefore - totalInconclusiveAfter,
            templatesTriggered: totalTriggered,
            writebacksApplied: totalWritebacks,
            totalDeduped,
            totalBlocked,
            totalInvalidAnswers,
            passesUsedAvg: casePack.cases.length > 0 ? totalPasses / casePack.cases.length : 0,
        },
        perCase,
    };

    return { updatedCases, report };
}

// Re-export queue utilities for external use
export {
    buildAskbackQueue,
    selectNextAskback,
    validateAnswer,
    createQueueState,
    calculatePriority,
    generateDedupeKey,
    checkDependencies,
} from './askbackQueue';
