/**
 * V10 Medical Askback Adapter — builds questions from medical_kb askbacks
 */

import type { DynamicQuestion } from '../../contracts/questions';
import { medicalKb } from '../../medical_kb';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';

function findAskbackDefinition(questionKey: string) {
    return medicalKb.askbacks.find(a => a.questionKey === questionKey);
}

function buildFallbackQuestion(askbackId: string, questionKey: string): DynamicQuestion {
    return {
        id: askbackId,
        questionKey,
        category: 'medical',
        question: questionKey,
        type: 'text',
        medicalSeverity: 'hard',
        regressRisk: true,
    };
}

export function buildMedicalQuestionsFromKb(askbackIds: string[]): DynamicQuestion[] {
    const questions: DynamicQuestion[] = [];

    for (const askbackId of askbackIds) {
        const questionKey = normalizeAskbackId(askbackId);
        const def = findAskbackDefinition(questionKey);

        if (!def) {
            questions.push(buildFallbackQuestion(askbackId, questionKey));
            continue;
        }

        const options = def.options?.map(opt => ({
            id: opt.id,
            label: opt.label,
            dataValue: opt.dataValue,
        }));

        questions.push({
            id: askbackId,
            questionKey: def.questionKey,
            category: 'medical',
            question: def.name,
            type: options && options.length > 0 ? 'single' : 'text',
            options,
            dataField: def.questionKey,
            medicalSeverity: def.required ? 'hard' : 'soft',
            regressRisk: def.required === true,
        });
    }

    return questions;
}
