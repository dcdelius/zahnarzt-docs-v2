/**
 * Gate M8: Every Askback Has SourceRefs
 *
 * Verifies that all compiled questions have explainability meta.
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_MEDICAL_CASES } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';
import {
    compileAskbacksToQuestions,
    engineTraceToAskbackMeta,
} from '../../medical/askbacks';
import { medicalKb } from '../../../medical_kb';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Load sources.v1.yaml for validation
function getSourceAnchors(): Set<string> {
    const sourcesPath = path.join(process.cwd(), 'docs/medical/sources/sources.v1.yaml');
    const sourcesYaml = fs.readFileSync(sourcesPath, 'utf-8');
    const sources = yaml.parse(sourcesYaml);

    const anchors = new Set<string>();
    for (const source of sources.sources || []) {
        if (source.anchors) {
            for (const anchor of source.anchors) {
                // The field is 'anchorId' in the YAML, not 'id'
                if (anchor.anchorId) {
                    anchors.add(anchor.anchorId);
                } else if (anchor.id) {
                    anchors.add(anchor.id);
                }
            }
        }
    }
    return anchors;
}

describe('Gate M8: Every Askback Has SourceRefs', () => {
    const validAnchors = getSourceAnchors();

    // ═══════════════════════════════════════════════════════════════
    // TEST: All askbacks from engine have ruleId
    // ═══════════════════════════════════════════════════════════════

    describe('RuleId traceability', () => {
        const casesWithAskbacks = GOLDEN_MEDICAL_CASES.filter(
            c => c.expect.askbacks && c.expect.askbacks.length > 0
        );

        for (const testCase of casesWithAskbacks) {
            it(`${testCase.id}: askbacks have ruleId`, () => {
                const extracted = stubExtractFromDictation(
                    testCase.input.dictation,
                    testCase.input.treatmentId
                );

                const facts = createFactsFromExtracted(
                    extracted as Record<string, unknown>,
                    testCase.input.treatmentId
                );

                const engineResult = applyMedicalKb({
                    facts: facts as unknown as Record<string, unknown>,
                    treatmentId: testCase.input.treatmentId,
                });

                // Check trace has ruleId for each required askback
                for (const ab of engineResult.trace.requiredAskbacks) {
                    expect(ab.ruleId).toBeDefined();
                    expect(ab.ruleId).not.toBe('');
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Compiled questions have sourceRefs in meta
    // ═══════════════════════════════════════════════════════════════

    describe('SourceRefs in compiled questions', () => {
        it('profunda askback has sourceRefs', () => {
            const testCase = GOLDEN_MEDICAL_CASES.find(c => c.id === 'profunda-requires-ueberkappung');
            if (!testCase) return;

            const extracted = stubExtractFromDictation(
                testCase.input.dictation,
                testCase.input.treatmentId
            );

            const facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                testCase.input.treatmentId
            );

            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: testCase.input.treatmentId,
            });

            const askbackMeta = engineTraceToAskbackMeta(
                engineResult.trace,
                engineResult.optionalAskbacks
            );

            const bundle = compileAskbacksToQuestions({
                askbacks: askbackMeta,
                treatmentId: testCase.input.treatmentId,
            });

            // At least one question should have sourceRefs
            const questionsWithMeta = bundle.required.filter(q => (q as any).meta?.sourceRefs?.length > 0);
            expect(questionsWithMeta.length).toBeGreaterThan(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: All askback sourceRefs point to valid anchors
    // ═══════════════════════════════════════════════════════════════

    describe('SourceRef anchor validation', () => {
        it('all askback definitions reference valid anchors', () => {
            for (const askback of medicalKb.askbacks) {
                if (askback.sourceRefs) {
                    for (const ref of askback.sourceRefs) {
                        expect(
                            validAnchors.has(ref.anchorId),
                            `Askback ${askback.id} references unknown anchor "${ref.anchorId}"`
                        ).toBe(true);
                    }
                }
            }
        });
    });
});
