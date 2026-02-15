/**
 * M72: Workflow Contract Runner
 * 
 * Runs pipeline through complete workflow (questions → answers → output)
 * to verify contract compliance.
 * 
 * DETERMINISTIC: Uses forceExtraction and fixed answers.
 */

import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

export interface WorkflowStep {
    step: number;
    state: string;
    questionIds: string[];
    tooth?: string;
    chipIds: string[];
    billingCount: number;
    diagnostic?: Record<string, unknown>;
}

export interface WorkflowAudit {
    steps: WorkflowStep[];
    final: {
        state: string;
        tooth?: string;
        instanceCount: number;
        billingCount: number;
        hasExplainedEmptyBilling: boolean;
        diagnostic?: Record<string, unknown>;
        fullText?: string;
    };
    contracts: {
        C1_sufficiency: boolean;
        C2_nonRedundancy: boolean;
        C3_criticalAskbacks: boolean;
        C4_mkvNoSilentErase: boolean;
    };
    violations: string[];
}

export interface WorkflowCase {
    name: string;
    dictation: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength?: string;
    settings?: Record<string, unknown>;
    forceExtraction: {
        tooth?: string;
        teeth?: Array<{ tooth: string; surfaces?: string[] }>;
        surfaces?: string[];
        diagnosis?: string;
        cariesDepth?: string;
        mentioned?: Record<string, unknown>;
        canalCount?: number;
    };
    /**
     * Answers to provide for each question.
     * Key = questionId, Value = answer value
     */
    answers: Record<string, unknown>;
    /**
     * Questions that should NOT appear (non-redundancy check)
     */
    forbiddenQuestions?: string[];
    /**
     * Questions that MUST appear (critical check)
     */
    requiredQuestions?: string[];
    /**
     * Expected final state
     */
    expectedFinalState?: string;
}

const MAX_STEPS = 10; // Safety limit

/**
 * Run a workflow case through the pipeline until completion.
 */
export async function runWorkflowContractCase(workflowCase: WorkflowCase): Promise<WorkflowAudit> {
    const steps: WorkflowStep[] = [];
    const violations: string[] = [];
    let currentAnswers = new Map<string, unknown>();
    let questionsAsked = new Set<string>();

    // Initial run
    let result = await runV10({
        dictation: workflowCase.dictation,
        treatmentId: workflowCase.treatmentId,
        insuranceType: workflowCase.insuranceType,
        textLength: (workflowCase.textLength || 'kurz') as any,
        testOnly: {
            forceExtraction: workflowCase.forceExtraction,
        },
    });

    let stepNum = 0;

    while (stepNum < MAX_STEPS) {
        stepNum++;

        const currentQuestionIds = result.questions?.map((q: any) => q.id) || [];
        const normalizedQuestionIds = currentQuestionIds.map(id => stripToothScope(id));

        // Record step
        steps.push({
            step: stepNum,
            state: result.state,
            questionIds: normalizedQuestionIds,
            tooth: result.trace?.instances?.[0]?.tooth,
            chipIds: result.meta?.provenance?.chips?.map((c: any) => c.chipId) || [],
            billingCount: result.output?.billingCodes?.length || 0,
            diagnostic: result.meta?.diagnostic,
        });

        // Track all questions asked
        normalizedQuestionIds.forEach((id: string) => questionsAsked.add(id));

        // Check for forbidden questions (non-redundancy)
        if (workflowCase.forbiddenQuestions) {
            for (const forbidden of workflowCase.forbiddenQuestions) {
                if (normalizedQuestionIds.includes(forbidden)) {
                    violations.push(`C2: Forbidden question asked: ${forbidden}`);
                }
            }
        }

        // If state is not questions, we're done
        if (result.state !== 'questions') {
            break;
        }

        const pickDefaultAnswer = (question: any): unknown => {
            if (question?.type === 'multi') {
                const first = question.options?.[0];
                if (!first) return [];
                if (first.dataValue !== undefined) return [first.dataValue];
                if (first.label !== undefined) return [first.label];
                return [first.id];
            }
            if (question?.type === 'number') {
                return question.defaultValue ?? question.presets?.[0] ?? question.min ?? 0;
            }
            if (question?.type === 'text') return '';
            const first = question?.options?.[0];
            if (!first) return 'unknown';
            if (first.dataValue !== undefined) return first.dataValue;
            if (first.label !== undefined) return first.label;
            return first.id;
        };

        // Provide answers for this step
        for (const q of result.questions ?? []) {
            const qid = q.id;
            const normalizedId = stripToothScope(qid);
            if (workflowCase.answers[qid] !== undefined) {
                currentAnswers.set(qid, workflowCase.answers[qid]);
            } else if (workflowCase.answers[normalizedId] !== undefined) {
                currentAnswers.set(qid, workflowCase.answers[normalizedId]);
            } else if (!currentAnswers.has(qid)) {
                currentAnswers.set(qid, pickDefaultAnswer(q));
            }
        }

        // Re-run with answers
        result = await runV10({
            dictation: workflowCase.dictation,
            treatmentId: workflowCase.treatmentId,
            insuranceType: workflowCase.insuranceType,
            textLength: (workflowCase.textLength || 'kurz') as any,
            answers: currentAnswers,
            testOnly: {
                forceExtraction: workflowCase.forceExtraction,
            },
        });
    }

    // Final state analysis
    const finalState = result.state;
    const finalTooth = result.trace?.instances?.[0]?.tooth;
    const finalInstanceCount = result.meta?.instanceCount || 0;
    const finalBillingCount = result.output?.billingCodes?.length || 0;
    const finalDiagnostic = result.meta?.diagnostic;

    // Check if empty billing is explained
    const hasExplainedEmptyBilling = finalBillingCount === 0 && finalDiagnostic && (
        finalDiagnostic.insurance_filtered_all ||
        finalDiagnostic.guard_blocked_all ||
        finalDiagnostic.unsupported_policy ||
        finalDiagnostic.no_billable_chips
    );

    // Contract checks
    const C1_sufficiency = finalState === 'output' ? (
        !!finalTooth && finalBillingCount > 0 || hasExplainedEmptyBilling
    ) : true;

    const C2_nonRedundancy = violations.filter(v => v.startsWith('C2:')).length === 0;

    // C3: Critical askbacks
    let C3_criticalAskbacks = true;
    if (workflowCase.requiredQuestions) {
        for (const required of workflowCase.requiredQuestions) {
            if (!questionsAsked.has(required)) {
                violations.push(`C3: Required question never asked: ${required}`);
                C3_criticalAskbacks = false;
            }
        }
    }

    // C4: MKV no silent erase
    let C4_mkvNoSilentErase = true;
    if (workflowCase.insuranceType === 'MKV') {
        if (finalState === 'output' && finalBillingCount === 0 && !hasExplainedEmptyBilling) {
            violations.push('C4: MKV silently erased all billing without explanation');
            C4_mkvNoSilentErase = false;
        }
    }

    // C1 violation check
    if (!C1_sufficiency) {
        if (finalState === 'output' && !finalTooth) {
            violations.push('C1: Output without tooth identifier');
        }
        if (finalState === 'output' && finalBillingCount === 0 && !hasExplainedEmptyBilling) {
            violations.push('C1: Output with 0 billing codes and no diagnostic explanation');
        }
    }

    return {
        steps,
        final: {
            state: finalState,
            tooth: finalTooth,
            instanceCount: finalInstanceCount,
            billingCount: finalBillingCount,
            hasExplainedEmptyBilling: !!hasExplainedEmptyBilling,
            diagnostic: finalDiagnostic,
            fullText: result.output?.fullText,
        },
        contracts: {
            C1_sufficiency,
            C2_nonRedundancy,
            C3_criticalAskbacks,
            C4_mkvNoSilentErase,
        },
        violations,
    };
}
