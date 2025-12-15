/**
 * Simulate Askbacks v1
 * 
 * Runs askback simulation on imported case pack and outputs:
 * 1. ze_bel_cases_v1_askbacked.json (updated cases)
 * 2. ze_bel_cases_v1_askback_simulation_report.json
 * 
 * Run: npx tsx scripts/simulate_askbacks_v1.ts
 */
import * as fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
    simulateAskbackSession,
    type CasePack,
    type RulesDoc,
    type AskbackTemplatesDoc,
    type AnswerProvider,
} from '../src/docudent/core/billing/knowledgeBase/logic/askbackRunner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// LOAD FILES
// ═══════════════════════════════════════════════════════════════

const rulesPath = resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/rules/fz_rules_v1.json');
const templatesPath = resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/rules/askback_templates_fz_v1.json');
const casesPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v1_imported.json');

const rulesDoc = JSON.parse(fs.readFileSync(rulesPath, 'utf8')) as RulesDoc;
const templatesDoc = JSON.parse(fs.readFileSync(templatesPath, 'utf8')) as AskbackTemplatesDoc;
const casePack = JSON.parse(fs.readFileSync(casesPath, 'utf8')) as CasePack;

// ═══════════════════════════════════════════════════════════════
// CANNED ANSWERS
// ═══════════════════════════════════════════════════════════════

const cannedAnswers: Record<string, any> = {
    ASK_FZ_3_2A_KIEFER: 'UK',
    ASK_FZ_3_2A_TEETH_LIST: ['33', '43'],
    ASK_FZ_7_1_ZAHNLOS_CONFIRM: true,
    ASK_BK6_MULTI_FZ_DOCUMENTED: 'yes_documented',
    ASK_MULTI_BK_TOOTH_MAPPING: {
        'FZ_1.1': ['34', '36'],
        'FZ_2.1': ['35'],
        'FZ_3.1': ['37', '38', '47', '48'],
    },
    ASK_FZ_6_8_UNTERFUETTERUNG_TYPE: 'indirect_lab',
    ASK_FZ_1_5_REQUIRES_KRONE: true,
};

const answerProvider: AnswerProvider = (templateId: string) => {
    return cannedAnswers[templateId];
};

// ═══════════════════════════════════════════════════════════════
// RUN SIMULATION
// ═══════════════════════════════════════════════════════════════

console.log('='.repeat(60));
console.log('ASKBACK SIMULATION v1');
console.log('='.repeat(60));
console.log(`Cases: ${casePack.cases.length}`);
console.log(`Rules: ${rulesDoc.rules.length}`);
console.log(`Templates: ${templatesDoc.templates.length}`);
console.log('');

const { updatedCases, report } = simulateAskbackSession(
    casePack,
    rulesDoc,
    templatesDoc,
    answerProvider
);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Updated Cases
// ═══════════════════════════════════════════════════════════════

const askbackedCasePack = {
    meta: {
        ...casePack.meta,
        askbackSimulation: {
            timestamp: report.meta.timestamp,
            templatesApplied: report.summary.templatesTriggered,
        },
    },
    cases: updatedCases,
};

const askbackedPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v1_askbacked.json');
fs.writeFileSync(askbackedPath, JSON.stringify(askbackedCasePack, null, 4) + '\n');
console.log(`✓ Written: ${askbackedPath}`);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Simulation Report
// ═══════════════════════════════════════════════════════════════

const reportPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v1_askback_simulation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 4) + '\n');
console.log(`✓ Written: ${reportPath}`);

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`INCONCLUSIVE Before: ${report.summary.inconclusiveBefore}`);
console.log(`INCONCLUSIVE After:  ${report.summary.inconclusiveAfter}`);
console.log(`Reduction:           ${report.summary.reduction}`);
console.log(`Templates Triggered: ${report.summary.templatesTriggered}`);
console.log(`Writebacks Applied:  ${report.summary.writebacksApplied}`);
console.log('');

// Per-case details for CASE_03 and CASE_04
const case03 = report.perCase.find(p => p.caseId === 'CASE_03');
const case04 = report.perCase.find(p => p.caseId === 'CASE_04');

if (case03) {
    console.log('CASE_03:');
    console.log(`  Inconclusive: ${case03.inconclusiveBefore} → ${case03.inconclusiveAfter}`);
    console.log(`  Triggered: ${case03.triggeredTemplates.join(', ') || 'none'}`);
    console.log(`  Writebacks: ${case03.writebacksApplied.length}`);
}

if (case04) {
    console.log('CASE_04:');
    console.log(`  Inconclusive: ${case04.inconclusiveBefore} → ${case04.inconclusiveAfter}`);
    console.log(`  Triggered: ${case04.triggeredTemplates.join(', ') || 'none'}`);
    console.log(`  Writebacks: ${case04.writebacksApplied.length}`);
}

console.log('');
console.log('Done.');
