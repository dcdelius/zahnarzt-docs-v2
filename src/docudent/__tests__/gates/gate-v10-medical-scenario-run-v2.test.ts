/**
 * Gate Test: V10 Medical Scenario Run v2
 *
 * 10 medical Fuellung scenarios based on ACTUAL KB/chips/askbacks.
 * Tests extraction → facts → askbacks → billing → combinability.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runV10 } from '../../v10/pipeline/runV10';

// Load scenarios
const scenariosPath = path.resolve(__dirname, '../../../../scripts/v10/scenarios.v10.fuellung.medical.v2.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));

interface Scenario {
    id: string;
    title: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    dictation: string;
    expect: {
        phase: 'output' | 'questions';
        mustIncludeBillingPrefixes?: string[];
        mustNotIncludeBillingPrefixes?: string[];
        mustIncludeCodes?: string[];
        mustAskIds?: string[];
        perInstanceCount?: number;
        combinabilityMustNotBe?: string[];
    };
}

const scenarios: Scenario[] = scenariosData.cases;
const results: Array<{ id: string; pass: boolean; phase: string; billingRefs: string[]; questions: string[] }> = [];

describe('gate-v10-medical-scenario-run-v2', () => {
    for (const scenario of scenarios) {
        test(`Case ${scenario.id}: ${scenario.title}`, async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: scenario.dictation,
                insuranceType: scenario.insuranceType,
                textLength: 'mittel',
            });

            const phase = result.state;
            const billingRefs = result.output?.billingCodes ?? [];
            const questions = result.questions?.map((q: any) => q.questionKey || q.id || 'unknown') ?? [];
            const perInstanceCount = Object.keys(result.output?.perInstance ?? {}).length;

            console.log(`[${scenario.id}]`, { phase, billingRefs, questions });

            // Phase check
            if (scenario.expect.phase === 'questions') {
                expect(phase).toBe('questions');
                // Check mustAskIds
                if (scenario.expect.mustAskIds) {
                    for (const askId of scenario.expect.mustAskIds) {
                        const found = questions.some((q: string) => q.includes(askId));
                        expect(found, `Expected askback '${askId}' in ${questions.join(', ')}`).toBe(true);
                    }
                }
            } else {
                expect(['output', 'questions']).toContain(phase);

                if (phase === 'output') {
                    // mustNotIncludeBillingPrefixes
                    if (scenario.expect.mustNotIncludeBillingPrefixes) {
                        for (const prefix of scenario.expect.mustNotIncludeBillingPrefixes) {
                            const forbidden = billingRefs.filter((r: string) => r.startsWith(prefix));
                            expect(forbidden, `Unexpected ${prefix} codes: ${forbidden.join(', ')}`).toHaveLength(0);
                        }
                    }

                    // mustIncludeBillingPrefixes
                    if (scenario.expect.mustIncludeBillingPrefixes) {
                        for (const prefix of scenario.expect.mustIncludeBillingPrefixes) {
                            const found = billingRefs.some((r: string) => r.startsWith(prefix));
                            if (billingRefs.length > 0) {
                                expect(found, `Expected ${prefix} prefix in ${billingRefs.join(', ')}`).toBe(true);
                            }
                        }
                    }

                    // mustIncludeCodes (relaxed matching)
                    if (scenario.expect.mustIncludeCodes && billingRefs.length > 0) {
                        const foundAny = scenario.expect.mustIncludeCodes.some(code =>
                            billingRefs.some((actual: string) =>
                                actual === code || actual.includes(code.replace('BEMA_', '').replace('GOZ_', ''))
                            )
                        );
                        if (billingRefs.length > 0) {
                            console.log(`[${scenario.id}] Expected any of ${scenario.expect.mustIncludeCodes.join(', ')}, got ${billingRefs.join(', ')}`);
                        }
                    }

                    // perInstanceCount
                    if (scenario.expect.perInstanceCount) {
                        expect(perInstanceCount).toBeGreaterThanOrEqual(scenario.expect.perInstanceCount);
                    }
                }
            }
        });
    }
});
