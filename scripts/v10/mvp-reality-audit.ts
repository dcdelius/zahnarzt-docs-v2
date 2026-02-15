/**
 * MVP Reality Audit Script
 * 
 * Simulates 10 dictations through createV10Session and captures
 * instances, questions, and output for analysis.
 * 
 * Run with: npx tsx scripts/v10/mvp-reality-audit.ts
 */

import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';

interface AuditCase {
    id: string;
    dictation: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV';
}

interface AuditResult {
    id: string;
    dictation: string;
    phase: string;
    instanceCount: number;
    instanceIds: string[];
    questionsL1: number;
    questionsL2: number;
    questionsL3: number;
    perInstanceKeys: string[];
    perInstanceTextNonEmpty: boolean[];
    perInstanceBillingNonEmpty: boolean[];
    globalTextLength: number;
    globalBillingCount: number;
    deviation: string;
    rootCause: string;
}

const AUDIT_CASES: AuditCase[] = [
    // Minimal cases
    { id: '01', dictation: 'Füllung 36 okklusal', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: '02', dictation: 'Füllung 14 distal', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // Material specified
    { id: '03', dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: '04', dictation: 'Füllung 24 mesial GIZ', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // Multi-tooth
    { id: '05', dictation: '36 okklusal Komposit; 14 distal GIZ', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: '06', dictation: 'Füllung 36 und 37 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // With isolation
    { id: '07', dictation: 'Füllung 36 okklusal Komposit mit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { id: '08', dictation: 'Füllung 46 mesial Komposit ohne Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // Profunda/deep caries
    { id: '09', dictation: 'Füllung 36 okklusal profunda Komposit Ca(OH)2 Unterfüllung', treatmentId: 'fuellung', insuranceType: 'GKV' },

    // PKV
    { id: '10', dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV' },
];

async function runAudit(): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    for (const c of AUDIT_CASES) {
        console.log(`\n[${c.id}] ${c.dictation.slice(0, 40)}...`);

        try {
            const session = createV10Session();
            const state = await session.start(c.dictation, {
                goldenMode: true,
                treatmentId: c.treatmentId,
                insuranceType: c.insuranceType,
            });

            const instances = session.getInstances();

            let result: AuditResult = {
                id: c.id,
                dictation: c.dictation,
                phase: state.phase,
                instanceCount: instances.length,
                instanceIds: instances.map(i => i.instanceId),
                questionsL1: 0,
                questionsL2: 0,
                questionsL3: 0,
                perInstanceKeys: [],
                perInstanceTextNonEmpty: [],
                perInstanceBillingNonEmpty: [],
                globalTextLength: 0,
                globalBillingCount: 0,
                deviation: 'none',
                rootCause: '-',
            };

            if (state.phase === 'questions') {
                // Count questions by level
                for (const [instanceId, questions] of Object.entries(state.questions)) {
                    for (const q of questions) {
                        if (q.level === 'L1') result.questionsL1++;
                        else if (q.level === 'L2') result.questionsL2++;
                        else result.questionsL3++;
                    }
                }

                // Try to answer L1 questions and get to output
                let currentState = state;
                let maxIterations = 10;

                while (currentState.phase === 'questions' && maxIterations > 0) {
                    const firstInstanceId = Object.keys(currentState.questions)[0];
                    const firstQuestion = currentState.questions[firstInstanceId]?.[0];

                    if (!firstQuestion) break;

                    // Answer with first option
                    const answer = firstQuestion.options[0]?.value || 'ja';
                    currentState = await session.answer(firstInstanceId, firstQuestion.id, answer);
                    maxIterations--;
                }

                // Re-evaluate after answers
                if (currentState.phase === 'output') {
                    result.phase = 'output (after answers)';
                    result.perInstanceKeys = Object.keys(currentState.output.perInstance);
                    result.perInstanceTextNonEmpty = Object.values(currentState.output.perInstance)
                        .map(p => p.text.length > 0);
                    result.perInstanceBillingNonEmpty = Object.values(currentState.output.perInstance)
                        .map(p => p.billingRefs.length > 0);
                    result.globalTextLength = currentState.output.fullText.length;
                    result.globalBillingCount = currentState.output.billingRefs.length;
                }
            } else if (state.phase === 'output') {
                result.perInstanceKeys = Object.keys(state.output.perInstance);
                result.perInstanceTextNonEmpty = Object.values(state.output.perInstance)
                    .map(p => p.text.length > 0);
                result.perInstanceBillingNonEmpty = Object.values(state.output.perInstance)
                    .map(p => p.billingRefs.length > 0);
                result.globalTextLength = state.output.fullText.length;
                result.globalBillingCount = state.output.billingRefs.length;
            } else if (state.phase === 'error') {
                result.deviation = `ERROR: ${state.error}`;
                result.rootCause = 'pipeline/runV10';
            }

            // Detect deviations
            if (result.instanceCount === 0) {
                result.deviation = 'No instances created';
                result.rootCause = 'scoping';
            } else if (result.perInstanceKeys.length === 0 && result.phase.includes('output')) {
                result.deviation = 'perInstance empty in output';
                result.rootCause = 'pipeline/runV10';
            } else if (result.perInstanceTextNonEmpty.includes(false) && result.phase.includes('output')) {
                result.deviation = 'Some perInstance.text empty';
                result.rootCause = 'renderer';
            } else if (result.perInstanceBillingNonEmpty.includes(false) && result.phase.includes('output')) {
                result.deviation = 'Some perInstance.billingRefs empty';
                result.rootCause = 'renderer | askbacks registry (no chips)';
            }

            console.log(`   Phase: ${result.phase}, Instances: ${result.instanceCount}, Q L1: ${result.questionsL1}`);
            results.push(result);

        } catch (err: any) {
            console.log(`   ERROR: ${err.message}`);
            results.push({
                id: c.id,
                dictation: c.dictation,
                phase: 'error',
                instanceCount: 0,
                instanceIds: [],
                questionsL1: 0,
                questionsL2: 0,
                questionsL3: 0,
                perInstanceKeys: [],
                perInstanceTextNonEmpty: [],
                perInstanceBillingNonEmpty: [],
                globalTextLength: 0,
                globalBillingCount: 0,
                deviation: `Exception: ${err.message}`,
                rootCause: 'unknown',
            });
        }
    }

    return results;
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('       V10 MVP REALITY AUDIT');
    console.log('═══════════════════════════════════════════════════');

    const results = await runAudit();

    // Summary stats
    const outputCount = results.filter(r => r.phase.includes('output')).length;
    const questionsCount = results.filter(r => r.phase === 'questions').length;
    const errorCount = results.filter(r => r.phase === 'error').length;
    const deviationCount = results.filter(r => r.deviation !== 'none').length;

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`       SUMMARY: ${outputCount}/10 reached output`);
    console.log(`       Deviations: ${deviationCount}`);
    console.log('═══════════════════════════════════════════════════');

    // Output JSON for artifact
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
