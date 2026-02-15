/**
 * Gate M34: Same-Tooth Chain Stability
 * 
 * Same dictation repeated 50x must keep same instance mapping + askback assignment.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    attributeStatement,
} from '../../v10/qa/segmentScoping';

const STABILITY_COUNT = process.env.SOAK_COUNT ? parseInt(process.env.SOAK_COUNT) : 50;

describe('gate-m34-same-tooth-chain-stability', () => {
    const TEST_DICTATION = 'Endo 14 Leitungsanästhesie 2 Kanäle WF, danach Füllung okklusal ohne Betäubung Mehrschichttechnik';

    it(`instance count stable over ${STABILITY_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineCount = baseline.clauses.length;

        for (let i = 0; i < STABILITY_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            expect(result.clauses.length).toBe(baselineCount);
        }
    });

    it(`treatment detection stable over ${STABILITY_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineTreatments = baseline.detectedTreatments.sort();

        for (let i = 0; i < STABILITY_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            expect(result.detectedTreatments.sort()).toEqual(baselineTreatments);
        }
    });

    it(`negation attribution stable over ${STABILITY_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineAttr = attributeStatement('ohne betäubung', baseline);

        for (let i = 0; i < STABILITY_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            const attr = attributeStatement('ohne betäubung', result);

            expect(attr.scope).toBe(baselineAttr.scope);
        }
    });

    it(`clause treatment contexts stable over ${STABILITY_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineContexts = baseline.clauses.map(c => c.treatmentContext);

        for (let i = 0; i < STABILITY_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            const contexts = result.clauses.map(c => c.treatmentContext);
            expect(contexts).toEqual(baselineContexts);
        }
    });

    describe('complex multi-treatment stability', () => {
        const COMPLEX_DICT = 'WKB 36 Kofferdam 3 Kanäle NaOCl EDTA WF warm, anschließend Aufbaufüllung mod Komposit ohne Anästhesie';

        it('complex dictation stable', () => {
            const baseline = parseScopedDictation(COMPLEX_DICT);
            const baselineAttr = attributeStatement('ohne anästhesie', baseline);

            for (let i = 0; i < STABILITY_COUNT; i++) {
                const result = parseScopedDictation(COMPLEX_DICT);
                const attr = attributeStatement('ohne anästhesie', result);

                expect(attr.scope).toBe(baselineAttr.scope);
            }
        });
    });
});
