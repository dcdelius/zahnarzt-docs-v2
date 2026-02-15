/**
 * Gate: Füllung Truthcases 30 (Scenario-based)
 *
 * Uses the headless scenario suite with explicit answers to validate
 * medical logic + billing invariants for 30 real-world cases.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createV10Session } from '../../uiController/createV10Session';
import type { SettingsContext } from '../../settings/resolveDefaultsToFacts';

interface Scenario {
    id: string;
    title: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    hasMKV: boolean;
    dictation: string;
    forceExtraction?: Record<string, unknown>;
    forceAnswers?: Record<string, unknown>;
    settings?: SettingsContext;
    expected: {
        mustIncludeCodes: string[];
        mustNotIncludePrefixes: string[];
        allowAliases: Record<string, string[]>;
        mustAskQuestionIds: string[];
        mustNotAskQuestionIds: string[];
        combinabilityMustNotBe: string[];
        perInstanceMinKeys?: number;
        textMustInclude?: string[];
    };
    answers: Record<string, string>;
}

function codeMatches(code: string, expected: string, aliases: Record<string, string[]>): boolean {
    if (code === expected) return true;
    const aliasList = aliases[expected] || [];
    return aliasList.includes(code);
}

function hasCode(codes: string[], expected: string, aliases: Record<string, string[]>): boolean {
    return codes.some(c => codeMatches(c, expected, aliases) || codeMatches(expected, c, aliases));
}

function hasForbiddenPrefix(codes: string[], prefixes: string[]): string[] {
    const forbidden: string[] = [];
    for (const code of codes) {
        for (const prefix of prefixes) {
            if (code.startsWith(prefix)) {
                forbidden.push(code);
            }
        }
    }
    return forbidden;
}

function loadScenarios(): Scenario[] {
    const filePath = path.join(process.cwd(), 'scripts/v10/scenarios.v10.fuellung.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { cases: Scenario[] };
    return parsed.cases;
}

describe('Gate: Füllung Truthcases 30 (scenario suite)', () => {
    const cases = loadScenarios().slice(0, 30);

    it('includes exactly 30 cases', () => {
        expect(cases.length).toBe(30);
    });

    for (const scenario of cases) {
        it(`${scenario.id}: ${scenario.title}`, async () => {
            const session = createV10Session();
            const failures: string[] = [];
            const questionsAsked: string[] = [];

            let state = await session.start(scenario.dictation, {
                treatmentId: 'fuellung',
                insuranceType: scenario.insuranceType,
                textLength: 'mittel',
                forceExtraction: scenario.forceExtraction,
                forceAnswers: scenario.forceAnswers,
                settings: scenario.settings,
            });

            let iterations = 0;
            while (state.phase === 'questions' && iterations < 25) {
                iterations++;
                const questionsState = state as {
                    phase: 'questions';
                    questions: Record<string, Array<{ id: string; ruleId: string }>>;
                };

                for (const [instanceId, questions] of Object.entries(questionsState.questions)) {
                    for (const q of questions) {
                        questionsAsked.push(q.id);

                        const ruleId = q.ruleId || q.id.split('::')[1];
                        const answerValue = scenario.answers?.[`${instanceId}::${ruleId}`]
                            || scenario.answers?.[ruleId]
                            || scenario.answers?.[q.id];

                        const defaultOption = (q as any).options?.[0]?.value;
                        const fallbackValue = (() => {
                            const id = q.id.toLowerCase();
                            if (id.includes('mkv_betrag')) return '120';
                            if (id.includes('mkv_justification')) return 'mehrschicht';
                            if (id.includes('mkv_confirmed')) return scenario.hasMKV ? 'mehrkosten' : 'nur_kasse';
                            if (id.includes('vitality')) return 'positiv';
                            if (id.includes('percussion')) return 'negativ';
                            if (id.includes('ueberkappung_material')) return 'Ca(OH)2';
                            if (id.includes('ueberkappung')) return 'keine';
                            if (id.includes('isolation')) return 'relativ';
                            if (id.includes('anesthesia_type') || id.includes('la_type')) return 'infiltr';
                            return undefined;
                        })();

                        const resolvedAnswer = answerValue ?? defaultOption ?? fallbackValue;
                        if (resolvedAnswer) {
                            state = await session.answer(instanceId, q.id, resolvedAnswer);
                        } else {
                            failures.push(`No answer provided for question: ${q.id}`);
                        }
                    }
                }
            }

            if (state.phase === 'error') {
                failures.push(`Pipeline error: ${state.error}`);
            }

            if (state.phase === 'output') {
                const output = state.output;
                const billingRefs = output.billingRefs || [];

                // Expected codes
                for (const code of scenario.expected.mustIncludeCodes) {
                    if (!hasCode(billingRefs, code, scenario.expected.allowAliases)) {
                        failures.push(`Missing expected code: ${code}`);
                    }
                }

                const forbidden = hasForbiddenPrefix(billingRefs, scenario.expected.mustNotIncludePrefixes);
                if (forbidden.length > 0) {
                    failures.push(`Forbidden codes found: ${forbidden.join(', ')}`);
                }

                // Text
                if (scenario.expected.textMustInclude?.length) {
                    for (const snippet of scenario.expected.textMustInclude) {
                        if (!output.fullText?.includes(snippet)) {
                            failures.push(`Expected text to include: ${snippet}`);
                        }
                    }
                }

                // perInstance min keys
                if (scenario.expected.perInstanceMinKeys) {
                    const instanceCount = Object.keys(output.perInstance || {}).length;
                    if (instanceCount < scenario.expected.perInstanceMinKeys) {
                        failures.push(`perInstance has ${instanceCount} keys, expected ${scenario.expected.perInstanceMinKeys}`);
                    }
                }
            } else if (state.phase === 'questions') {
                failures.push('Expected output, got questions');
            }

            // Askback expectations
            for (const qId of scenario.expected.mustAskQuestionIds || []) {
                if (!questionsAsked.some(q => q.includes(qId))) {
                    failures.push(`Expected question not asked: ${qId}`);
                }
            }
            for (const qId of scenario.expected.mustNotAskQuestionIds || []) {
                if (questionsAsked.some(q => q.includes(qId))) {
                    failures.push(`Unexpected question asked: ${qId}`);
                }
            }

            if (failures.length > 0) {
                console.error(`[${scenario.id}] Failures:\n- ${failures.join('\n- ')}`);
            }

            expect(failures).toEqual([]);
        });
    }
});
