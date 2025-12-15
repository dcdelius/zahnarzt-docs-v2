/**
 * Gate: Askback Runner v1
 *
 * Tests:
 * 1. Template Coverage - every rule that can be INCONCLUSIVE has a template
 * 2. Simulation Reduces Inconclusive - askbacks reduce INCONCLUSIVE count
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Rule {
    ruleId: string;
    condition: { type: string;[k: string]: any };
    [k: string]: any;
}

interface RulesDoc {
    _meta: any;
    rules: Rule[];
}

interface AskbackTemplate {
    templateId: string;
    ruleId: string;
    [k: string]: any;
}

interface AskbackTemplatesDoc {
    _meta: any;
    templates: AskbackTemplate[];
}

interface CaseSimulationResult {
    caseId: string;
    inconclusiveBefore: number;
    inconclusiveAfter: number;
    triggeredTemplates: string[];
    writebacksApplied: any[];
    notes: string[];
}

interface SimulationReport {
    meta: any;
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
// LOAD FILES
// ═══════════════════════════════════════════════════════════════

const rulesPath = resolve(__dirname, '../../core/billing/knowledgeBase/rules/fz_rules_v1.json');
const templatesPath = resolve(__dirname, '../../core/billing/knowledgeBase/rules/askback_templates_fz_v1.json');
const reportPath = resolve(__dirname, '../../__fixtures__/ze_bel_cases_v1_askback_simulation_report.json');

function loadJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, 'utf8'));
}

// Condition types that can produce INCONCLUSIVE
const INCONCLUSIVE_CONDITION_TYPES = [
    'verblendbereichRequired',
    'zahnlosRequired',
];

describe('GATE: Askback Runner v1', () => {
    // ═══════════════════════════════════════════════════════════
    // 1. TEMPLATE COVERAGE
    // ═══════════════════════════════════════════════════════════

    describe('1) Template Coverage', () => {
        const rulesDoc = loadJson<RulesDoc>(rulesPath);
        const templatesDoc = loadJson<AskbackTemplatesDoc>(templatesPath);

        it('files exist', () => {
            expect(existsSync(rulesPath)).toBe(true);
            expect(existsSync(templatesPath)).toBe(true);
        });

        it('every INCONCLUSIVE-capable rule has at least one template', () => {
            const inconclusiveRules = rulesDoc.rules.filter(
                r => INCONCLUSIVE_CONDITION_TYPES.includes(r.condition.type)
            );

            const templateRuleIds = new Set(templatesDoc.templates.map(t => t.ruleId));

            const missingTemplates: string[] = [];
            for (const rule of inconclusiveRules) {
                if (!templateRuleIds.has(rule.ruleId)) {
                    missingTemplates.push(rule.ruleId);
                }
            }

            expect(missingTemplates, 'Rules without templates').toEqual([]);
        });

        it('all templates reference valid ruleIds', () => {
            const ruleIds = new Set(rulesDoc.rules.map(r => r.ruleId));

            const invalidTemplates = templatesDoc.templates.filter(
                t => !ruleIds.has(t.ruleId)
            );

            expect(invalidTemplates.map(t => t.templateId)).toEqual([]);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 2. SIMULATION REDUCES INCONCLUSIVE
    // ═══════════════════════════════════════════════════════════

    describe('2) Simulation Reduces Inconclusive', () => {
        it('simulation report exists', () => {
            expect(
                existsSync(reportPath),
                `Report not found: ${reportPath}. Run: npx tsx scripts/simulate_askbacks_v1.ts`
            ).toBe(true);
        });

        it('total INCONCLUSIVE reduced or unchanged', () => {
            const report = loadJson<SimulationReport>(reportPath);
            expect(report.summary.inconclusiveAfter).toBeLessThanOrEqual(
                report.summary.inconclusiveBefore
            );
        });

        it('CASE_03 has reduced INCONCLUSIVE', () => {
            const report = loadJson<SimulationReport>(reportPath);
            const case03 = report.perCase.find(p => p.caseId === 'CASE_03');

            expect(case03).toBeDefined();
            expect(case03!.inconclusiveAfter).toBeLessThan(case03!.inconclusiveBefore);
        });

        it('CASE_04 has reduced INCONCLUSIVE', () => {
            const report = loadJson<SimulationReport>(reportPath);
            const case04 = report.perCase.find(p => p.caseId === 'CASE_04');

            expect(case04).toBeDefined();
            expect(case04!.inconclusiveAfter).toBeLessThan(case04!.inconclusiveBefore);
        });

        it('writebacks were applied', () => {
            const report = loadJson<SimulationReport>(reportPath);
            expect(report.summary.writebacksApplied).toBeGreaterThan(0);
        });

        it('templates were triggered', () => {
            const report = loadJson<SimulationReport>(reportPath);
            expect(report.summary.templatesTriggered).toBeGreaterThan(0);
        });
    });
});
