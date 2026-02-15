/**
 * V10 Endo Question Adapter — bridges core playbooks to V10 UI contracts
 */

import type { EngineQuestion, EndoPhase } from '../../contracts/questionEngineTypes';
import type { DynamicQuestion, QuestionBundle } from '../../contracts/questions';
import { evaluateQuestionsV2 } from '../../core/questionEngine/questionEngineV2';
import { parseEndoSignals } from '../../core/playbooks/endo/endoSignalParser';

const DEFAULT_DOC_MODE: QuestionBundle['docMode'] = 'balanced';

type EndoQuestionBuildResult = {
    engineQuestions: EngineQuestion[];
    questions: DynamicQuestion[];
    bundle: QuestionBundle;
};

function mapAnswerTypeToDynamic(type: EngineQuestion['answerType']): DynamicQuestion['type'] {
    switch (type) {
        case 'select':
            return 'single';
        case 'multiSelect':
            return 'multi';
        case 'number':
            return 'number';
        case 'text':
            return 'text';
        case 'perCanalTable':
            return 'perCanalTable';
        default:
            return 'single';
    }
}

function mapOptions(options?: string[]): DynamicQuestion['options'] {
    if (!options || options.length === 0) return undefined;
    return options.map((label, index) => ({
        id: `${index}_${label.toLowerCase().replace(/\s+/g, '_')}`,
        label,
        dataValue: label,
    }));
}

function buildQuestionBundle(questions: DynamicQuestion[]): QuestionBundle {
    const required = questions.filter(q => q.medicalSeverity === 'hard');
    const optional = questions.filter(q => q.medicalSeverity !== 'hard');

    return {
        required,
        optionalVisible: optional.slice(0, 3),
        optionalHidden: optional.slice(3),
        optionalTotal: optional.length,
        docMode: DEFAULT_DOC_MODE,
    };
}

function inferDefaultPhase(visitNumber: number): EndoPhase {
    if (visitNumber === 2) return 't2';
    if (visitNumber === 3) return 't3';
    return 't1';
}

export function buildEndoQuestions(
    dictationText: string,
    settings: Record<string, unknown> = {}
): EndoQuestionBuildResult {
    const signals = parseEndoSignals(dictationText);
    const visitNumber = (signals.visitNumber ?? 1) as 1 | 2 | 3;
    const phase = signals.phase ?? inferDefaultPhase(visitNumber);

    const engineOutput = evaluateQuestionsV2({
        treatmentId: 'endo',
        visit: { number: visitNumber, phase },
        dictationText,
        extracted: signals,
        settings,
    });

    const questions: DynamicQuestion[] = engineOutput.questions.map((q) => ({
        id: q.id,
        questionKey: q.id,
        category: q.severity === 'required' ? 'medical' : 'forensic',
        question: q.prompt,
        type: mapAnswerTypeToDynamic(q.answerType),
        options: mapOptions(q.options),
        dataField: q.fieldsWritten?.[0],
        medicalSeverity: q.severity === 'required' ? 'hard' : 'soft',
        regressRisk: q.severity === 'required',
    }));

    return {
        engineQuestions: engineOutput.questions,
        questions,
        bundle: buildQuestionBundle(questions),
    };
}

export function deriveEndoAnswerOverrides(
    answers: Map<string, unknown>
): Record<string, unknown> {
    const pickByRegex = (regex: RegExp): unknown => {
        for (const [key, value] of answers) {
            if (regex.test(key)) return value;
        }
        return undefined;
    };

    const overrides: Record<string, unknown> = {};

    const kofferdam = pickByRegex(/ENDO_.*RUBBER_DAM/i);
    if (kofferdam !== undefined) {
        overrides.endo_kofferdam = kofferdam;
    }

    const wlMethod = pickByRegex(/ENDO_.*WORKING_LENGTH_METHOD/i);
    if (wlMethod !== undefined) {
        overrides.endo_wl_method = wlMethod;
    }

    const irrigation = pickByRegex(/ENDO_.*IRRIGATION/i);
    if (irrigation !== undefined) {
        overrides.endo_irrigation = irrigation;
    }

    const medication = pickByRegex(/ENDO_.*MEDICATION/i);
    if (medication !== undefined) {
        overrides.endo_medication = medication;
    }

    const obturation = pickByRegex(/ENDO_.*OBTURATION_TECHNIQUE/i);
    if (obturation !== undefined) {
        overrides.endo_obturation_technique = obturation;
    }

    return overrides;
}
