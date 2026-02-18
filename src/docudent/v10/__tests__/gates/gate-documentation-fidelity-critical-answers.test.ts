import { describe, expect, it } from 'vitest';
import { createV10Session } from '../../uiController/createV10Session';

type QuestionLike = {
    id: string;
    ruleId?: string;
    question: string;
    options?: Array<{ value: string; label: string }>;
};

type AnswerRecord = {
    questionId: string;
    normalizedKey: string;
    answer: string;
};

type CoverageRule = {
    id: string;
    matches: (normalizedKey: string, answer: string) => boolean;
    assert: (fullTextLower: string, answer: string) => string[];
};

const normalizeQuestionKey = (raw: string): string => {
    let key = raw.replace(/::tooth:\d+$/, '');
    if (key.includes('::')) key = key.split('::').pop() ?? key;
    const prefix = key.match(/^(medical|forensic|rule|mkv|upsell)_(.+)$/);
    return (prefix ? prefix[2] : key).toLowerCase();
};

const pickOptionValue = (
    options: Array<{ value: string; label: string }> | undefined,
    predicates: Array<(candidate: string) => boolean>
): string | undefined => {
    if (!options || options.length === 0) return undefined;
    for (const option of options) {
        const candidate = `${option.value} ${option.label}`.toLowerCase();
        if (predicates.some(predicate => predicate(candidate))) return String(option.value);
    }
    return String(options[0].value);
};

const resolveAnswer = (q: QuestionLike): string => {
    const key = normalizeQuestionKey(q.ruleId ?? q.id);

    if (key.includes('working_lengths')) return 'MB: 19, ML: 18, D: 20';
    if (key.includes('endo_canal_count') || key.includes('canal_count')) return '3';
    if (key.includes('endo_medication') || key.includes('medication')) return 'Calciumhydroxid';

    if (key.includes('ueberkappung')) {
        return pickOptionValue(q.options, [value => value.includes('indirekt')]) ?? 'indirekt';
    }

    if (!q.options || q.options.length === 0) return 'dokumentiert';

    return pickOptionValue(q.options, [
        value => value.includes('naocl'),
        value => value.includes('kofferdam'),
        value => value.includes('warm'),
        value => value.includes('ja'),
    ]) ?? String(q.options[0].value);
};

const COVERAGE_RULES: CoverageRule[] = [
    {
        id: 'endo_working_lengths_visible',
        matches: normalizedKey => normalizedKey.includes('working_lengths'),
        assert: (fullTextLower, answer) => {
            const failures: string[] = [];
            if (!fullTextLower.includes('arbeitsl') || !fullTextLower.includes('dokumentiert')) {
                failures.push('Missing working-length documentation phrase in final text');
            }
            const token = answer.toLowerCase().match(/[a-z]+\s*:\s*\d+/);
            if (token && !fullTextLower.includes(token[0])) {
                failures.push(`Missing canal token from answer in final text: ${token[0]}`);
            }
            return failures;
        },
    },
    {
        id: 'endo_medication_visible',
        matches: (normalizedKey, answer) =>
            normalizedKey.includes('medication') && answer.toLowerCase().includes('calcium'),
        assert: fullTextLower => {
            return fullTextLower.includes('ca(oh)') || fullTextLower.includes('calcium')
                ? []
                : ['Missing endo medication evidence (Ca(OH)2/Calcium) in final text'];
        },
    },
    {
        id: 'fuellung_capping_visible',
        matches: (normalizedKey, answer) =>
            normalizedKey.includes('ueberkappung') && !answer.toLowerCase().includes('nein'),
        assert: fullTextLower => {
            return fullTextLower.includes('überkapp') || fullTextLower.includes('ueberkapp')
                ? []
                : ['Missing capping evidence in final text although capping was answered as performed'];
        },
    },
    {
        id: 'roentgen_findings_visible',
        matches: normalizedKey => normalizedKey.includes('roentgen_befund'),
        assert: (fullTextLower, answer) => {
            const token = answer
                .toLowerCase()
                .split(/\s+/)
                .map(part => part.trim())
                .find(part => part.length >= 6);
            if (!token) return [];
            return fullTextLower.includes(token)
                ? []
                : [`Missing radiology finding token from answer in final text: ${token}`];
        },
    },
    {
        id: 'upt_interval_visible',
        matches: normalizedKey => normalizedKey.includes('upt_intervall') || normalizedKey.includes('upt_interval'),
        assert: (fullTextLower, answer) => {
            const token = answer.toLowerCase().replace(/_/g, ' ').trim();
            if (!token) return [];
            const hasRecallPhrase = fullTextLower.includes('recall') || fullTextLower.includes('intervall');
            if (!hasRecallPhrase) {
                return ['Missing UPT recall/interval phrase in final text'];
            }
            return fullTextLower.includes(token)
                ? []
                : [`Missing UPT interval token from answer in final text: ${token}`];
        },
    },
    {
        id: 'untersuchung_findings_visible',
        matches: normalizedKey => normalizedKey.includes('untersuchung_befunde'),
        assert: (fullTextLower, answer) => {
            const token = answer
                .toLowerCase()
                .split(/\s+/)
                .map(part => part.trim())
                .find(part => part.length >= 6);
            if (!token) return [];
            return fullTextLower.includes(token)
                ? []
                : [`Missing untersuchung findings token from answer in final text: ${token}`];
        },
    },
];

async function runScenario(params: {
    dictation: string;
    treatmentId: 'endo' | 'fuellung';
    insuranceType: 'GKV' | 'PKV' | 'MKV';
}): Promise<{ fullText: string; answered: AnswerRecord[] }> {
    const session = createV10Session();
    let state = await session.start(params.dictation, {
        treatmentId: params.treatmentId,
        insuranceType: params.insuranceType,
        textLength: 'mittel',
    });

    const answered: AnswerRecord[] = [];
    let iterations = 0;
    while (state.phase === 'questions' && iterations < 12) {
        iterations += 1;
        const byInstance = state.questions;
        let answeredAny = false;

        for (const [instanceId, questions] of Object.entries(byInstance)) {
            for (const q of questions) {
                const answer = resolveAnswer(q);
                answered.push({
                    questionId: q.id,
                    normalizedKey: normalizeQuestionKey(q.ruleId ?? q.id),
                    answer,
                });
                state = await session.answer(instanceId, q.id, answer);
                answeredAny = true;
                if (state.phase !== 'questions') break;
            }
            if (state.phase !== 'questions') break;
        }

        if (!answeredAny) break;
    }

    if (state.phase !== 'output') {
        throw new Error(`Expected output phase, got: ${state.phase}`);
    }

    return {
        fullText: state.output.fullText ?? '',
        answered,
    };
}

describe('gate-documentation-fidelity-critical-answers', () => {
    it('requires critical answered askbacks to appear in final text evidence', async () => {
        const scenarios = [
            {
                dictation:
                    'Endo an Zahn 46, Trepanation, Aufbereitung und medikamentoese Einlage. Arbeitslaengen sollen dokumentiert werden.',
                treatmentId: 'endo' as const,
                insuranceType: 'GKV' as const,
            },
            {
                dictation:
                    'Zahn 26 mesio-okklusal tiefe Karies, unter Kofferdam mit Komposit versorgt.',
                treatmentId: 'fuellung' as const,
                insuranceType: 'GKV' as const,
            },
            {
                dictation:
                    'Zur Therapieplanung wurde ein OPG angefertigt, Roentgenbefund apikale Auffaelligkeit regio 36.',
                treatmentId: 'roentgen' as const,
                insuranceType: 'PKV' as const,
            },
        ];

        const failures: string[] = [];

        for (const scenario of scenarios) {
            const result = await runScenario(scenario);
            const fullTextLower = result.fullText.toLowerCase();
            for (const record of result.answered) {
                for (const rule of COVERAGE_RULES) {
                    if (!rule.matches(record.normalizedKey, record.answer)) continue;
                    const ruleFailures = rule.assert(fullTextLower, record.answer);
                    for (const failure of ruleFailures) {
                        failures.push(
                            `${scenario.treatmentId}/${rule.id}/${record.questionId}: ${failure}`
                        );
                    }
                }
            }
        }

        expect(failures).toEqual([]);
    });
});
