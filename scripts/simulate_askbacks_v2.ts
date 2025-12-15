/**
 * Simulate Askbacks v2
 * 
 * Runs askback simulation on v2 case pack.
 * 
 * Run: npx tsx scripts/simulate_askbacks_v2.ts
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

const rulesPath = resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/rules/fz_rules_v2.json');
const templatesPath = resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/rules/askback_templates_fz_v2.json');
const casesPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2_imported.json');

const rulesDoc = JSON.parse(fs.readFileSync(rulesPath, 'utf8')) as RulesDoc;
const templatesDoc = JSON.parse(fs.readFileSync(templatesPath, 'utf8')) as AskbackTemplatesDoc;
const casePack = JSON.parse(fs.readFileSync(casesPath, 'utf8')) as CasePack;

// ═══════════════════════════════════════════════════════════════
// CANNED ANSWERS (v2 extended)
// ═══════════════════════════════════════════════════════════════

const cannedAnswers: Record<string, any> = {
    // From v1
    ASK_FZ_3_2A_KIEFER: 'UK',
    ASK_FZ_3_2A_TEETH_LIST: ['33', '43'],
    ASK_FZ_7_1_ZAHNLOS_CONFIRM: true,
    ASK_FZ_7_2_ZAHNLOS_CONFIRM: true,
    ASK_BK6_MULTI_FZ_DOCUMENTED: 'yes_documented',
    ASK_MULTI_BK_TOOTH_MAPPING: {
        'FZ_1.1': ['34', '36'],
        'FZ_2.1': ['35'],
        'FZ_3.1': ['37', '38', '47', '48'],
    },
    ASK_FZ_1_5_REQUIRES_KRONE: true,
    // New for v2
    ASK_UNTERFUETTERUNG_TYPE: 'indirect_lab',
    ASK_BONUS_STATUS: 'none',
    ASK_HARDSHIP_CONFIRMATION: true,
};

const answerProvider: AnswerProvider = (templateId: string) => {
    return cannedAnswers[templateId];
};

// ═══════════════════════════════════════════════════════════════
// RUN SIMULATION
// ═══════════════════════════════════════════════════════════════

console.log('='.repeat(60));
console.log('ASKBACK SIMULATION v2');
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

const askbackedPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2_askbacked.json');
fs.writeFileSync(askbackedPath, JSON.stringify(askbackedCasePack, null, 4) + '\n');
console.log(`✓ Written: ${askbackedPath}`);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Simulation Report
// ═══════════════════════════════════════════════════════════════

const reportPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2_askback_simulation_report.json');
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

// Per-case details for new cases
const newCases = ['CASE_13', 'CASE_14', 'CASE_15', 'CASE_16', 'CASE_17', 'CASE_18', 'CASE_19', 'CASE_20'];
for (const caseId of newCases) {
    const c = report.perCase.find(p => p.caseId === caseId);
    if (c && (c.inconclusiveBefore > 0 || c.triggeredTemplates.length > 0)) {
        console.log(`${caseId}:`);
        console.log(`  Inconclusive: ${c.inconclusiveBefore} → ${c.inconclusiveAfter}`);
        console.log(`  Triggered: ${c.triggeredTemplates.join(', ') || 'none'}`);
        console.log(`  Writebacks: ${c.writebacksApplied.length}`);
    }
}

console.log('');
console.log('Done.');
