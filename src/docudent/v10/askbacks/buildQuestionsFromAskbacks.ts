/**
 * V10 Askback Question Builder — SSOT via medical_kb askbacks
 */

import type { DynamicQuestion } from '../../contracts/questions';
import { medicalKbV10 } from '../../medical_kb';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';

type AskbackDefinition = {
    questionKey: string;
    name: string;
    category?: string;
    required?: boolean;
    options?: Array<{ id: string; label: string; dataValue?: unknown }>;
};

function findAskbackDefinition(questionKey: string): AskbackDefinition | undefined {
    return medicalKbV10.askbacks.find(a => a.questionKey === questionKey) as AskbackDefinition | undefined;
}

function mapCategory(category?: string): DynamicQuestion['category'] {
    const normalized = String(category ?? '').toLowerCase();
    if (normalized === 'billing' || normalized === 'mkv') return 'mkv';
    if (normalized === 'forensic') return 'forensic';
    if (normalized === 'upsell') return 'upsell';
    if (normalized === 'rule') return 'rule';
    return 'medical';
}

function buildFallbackQuestion(
    askbackId: string,
    questionKey: string,
    medicalSeverity: 'hard' | 'soft'
): DynamicQuestion {
    return {
        id: askbackId,
        questionKey,
        category: 'medical',
        question: questionKey,
        type: 'text',
        medicalSeverity,
        regressRisk: medicalSeverity === 'hard',
    };
}

function buildQuestionFromDefinition(
    askbackId: string,
    def: AskbackDefinition,
    medicalSeverity: 'hard' | 'soft'
): DynamicQuestion {
    const options = def.options?.map(opt => ({
        id: opt.id,
        label: opt.label,
        dataValue: opt.dataValue,
    }));

    return {
        id: askbackId,
        questionKey: def.questionKey,
        category: mapCategory(def.category),
        question: def.name,
        type: options && options.length > 0 ? 'single' : 'text',
        options,
        dataField: def.questionKey,
        medicalSeverity,
        regressRisk: medicalSeverity === 'hard' || def.required === true,
    };
}

export function buildQuestionsFromAskbacks(params: {
    required: string[];
    optional?: string[];
}): DynamicQuestion[] {
    const questions: DynamicQuestion[] = [];
    const seen = new Set<string>();

    const pushQuestion = (askbackId: string, medicalSeverity: 'hard' | 'soft') => {
        if (!askbackId) return;
        if (seen.has(askbackId)) return;
        seen.add(askbackId);

        const questionKey = normalizeAskbackId(askbackId);
        const def = findAskbackDefinition(questionKey);

        if (!def) {
            questions.push(buildFallbackQuestion(askbackId, questionKey, medicalSeverity));
            return;
        }

        questions.push(buildQuestionFromDefinition(askbackId, def, medicalSeverity));
    };

    for (const id of params.required ?? []) {
        pushQuestion(id, 'hard');
    }

    for (const id of params.optional ?? []) {
        if (!seen.has(id)) {
            pushQuestion(id, 'soft');
        }
    }

    return questions;
}
