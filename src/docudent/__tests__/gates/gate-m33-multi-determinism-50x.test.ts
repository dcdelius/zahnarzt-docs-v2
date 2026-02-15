/**
 * Gate M33: Multi-Treatment Determinism (50x)
 * 
 * Tests that scope attribution is deterministic across repeated runs.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    attributeStatement,
} from '../../v10/qa/segmentScoping';

const DETERMINISM_COUNT = process.env.SOAK_COUNT ? parseInt(process.env.SOAK_COUNT) : 50;

describe('gate-m33-multi-determinism-50x', () => {
    const TEST_DICTATION = 'Endo 14 2 Kanäle 18mm, danach Füllung okklusal Mehrschichttechnik, ohne Anästhesie';

    it(`clause count is stable over ${DETERMINISM_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineClauseCount = baseline.clauses.length;

        for (let i = 0; i < DETERMINISM_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            expect(result.clauses.length).toBe(baselineClauseCount);
        }
    });

    it(`treatment detection is stable over ${DETERMINISM_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineTreatments = baseline.detectedTreatments.sort();

        for (let i = 0; i < DETERMINISM_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            expect(result.detectedTreatments.sort()).toEqual(baselineTreatments);
        }
    });

    it(`scope attribution is stable over ${DETERMINISM_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);
        const baselineAttr = attributeStatement('ohne anästhesie', baseline);

        for (let i = 0; i < DETERMINISM_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            const attr = attributeStatement('ohne anästhesie', result);

            expect(attr.scope).toBe(baselineAttr.scope);
        }
    });

    it(`isMultiTreatment is stable over ${DETERMINISM_COUNT} runs`, () => {
        const baseline = parseScopedDictation(TEST_DICTATION);

        for (let i = 0; i < DETERMINISM_COUNT; i++) {
            const result = parseScopedDictation(TEST_DICTATION);
            expect(result.isMultiTreatment).toBe(baseline.isMultiTreatment);
        }
    });

    // Additional complex dictation
    it('complex multi-treatment is deterministic', () => {
        const complex = 'Zunächst Endo 14 Kofferdam NaOCl 2 Kanäle WF, im Anschluss Füllung okklusal ohne Betäubung Mehrschicht';

        const baseline = parseScopedDictation(complex);
        const baselineAttr = attributeStatement('ohne betäubung', baseline);

        for (let i = 0; i < DETERMINISM_COUNT; i++) {
            const result = parseScopedDictation(complex);
            const attr = attributeStatement('ohne betäubung', result);

            expect(attr.scope).toBe(baselineAttr.scope);
        }
    });
});
