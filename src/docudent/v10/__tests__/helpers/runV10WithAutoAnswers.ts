import type { QuestionOption } from '../../../contracts/questions';
import type { V10PipelineInput } from '../../types';
import { runV10 } from '../../pipeline/runV10';

type V10Result = Awaited<ReturnType<typeof runV10>>;

function normalizeAnswers(
    answers?: Map<string, unknown> | Record<string, unknown>
): Map<string, unknown> {
    if (!answers) return new Map();
    return answers instanceof Map ? new Map(answers) : new Map(Object.entries(answers));
}

function pickOptionValue(first?: QuestionOption): unknown {
    if (!first) return undefined;
    if (first.dataValue !== undefined) return first.dataValue;
    if (first.label !== undefined) return first.label;
    return first.id;
}

function buildAutoAnswers(questions: NonNullable<V10Result['questions']>): Map<string, unknown> {
    const answers = new Map<string, unknown>();
    for (const q of questions) {
        const first = q.options?.[0];
        const firstValue = pickOptionValue(first);

        if (q.type === 'multi') {
            answers.set(q.id, firstValue !== undefined ? [firstValue] : []);
            continue;
        }

        if (q.type === 'number') {
            const num = q.defaultValue ?? q.presets?.[0] ?? q.min ?? 0;
            answers.set(q.id, num);
            continue;
        }

        if (q.type === 'text') {
            answers.set(q.id, '');
            continue;
        }

        answers.set(q.id, firstValue ?? 'unknown');
    }
    return answers;
}

export async function runV10WithAutoAnswers(
    input: V10PipelineInput,
    maxIterations = 5
): Promise<V10Result> {
    const baseAnswers = normalizeAnswers(input.answers);
    let result = await runV10({ ...input, answers: baseAnswers });
    let iterations = 0;

    while (
        result.state === 'questions'
        && (result.questions?.length ?? 0) > 0
        && iterations < maxIterations
    ) {
        const auto = buildAutoAnswers(result.questions);
        for (const [key, value] of auto) {
            if (!baseAnswers.has(key)) {
                baseAnswers.set(key, value);
            }
        }
        result = await runV10({ ...input, answers: baseAnswers });
        iterations += 1;
    }

    return result;
}
