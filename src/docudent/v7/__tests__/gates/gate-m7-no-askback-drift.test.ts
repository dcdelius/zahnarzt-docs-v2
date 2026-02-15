/**
 * Gate M7: No Askback Drift (Snapshot Test)
 *
 * Snapshot-based gate to detect "silent askback disappearance".
 * If askbacks change, the test fails until snapshots are explicitly updated.
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_MEDICAL_CASES } from '../fixtures/goldenMedicalCases.v1';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted, applyAnswersToFacts } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';

// Collect askbacks for a case
function collectAskbacks(caseId: string): string[] {
    const testCase = GOLDEN_MEDICAL_CASES.find(c => c.id === caseId);
    if (!testCase) return [];

    const extracted = stubExtractFromDictation(
        testCase.input.dictation,
        testCase.input.treatmentId
    );

    let facts = createFactsFromExtracted(
        extracted as Record<string, unknown>,
        testCase.input.treatmentId
    );

    // Apply answers if provided (to test "answered" scenarios)
    if (testCase.input.answers) {
        facts = applyAnswersToFacts(facts, testCase.input.answers);
    }

    const engineResult = applyMedicalKb({
        facts: facts as unknown as Record<string, unknown>,
        treatmentId: testCase.input.treatmentId,
    });

    return engineResult.requiredAskbacks.sort();
}

describe('Gate M7: No Askback Drift', () => {
    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOT: Expected askbacks per case
    // Update these if askbacks intentionally change!
    // ═══════════════════════════════════════════════════════════════

    const ASKBACK_SNAPSHOTS: Record<string, string[]> = {
        'profunda-requires-ueberkappung': ['medical_ueberkappung'],
        'profunda-yes-emits-cp': [], // Already answered
        'profunda-no-emits-cp-not-required': [], // Already answered
        'no-trigger-normal-caries': [],
        'synonym-sehr-tief': ['medical_ueberkappung'],
        'typo-pulpannah': ['medical_ueberkappung'],
        'mkv-profunda': ['medical_ueberkappung'],
        'text-kurz-profunda': ['medical_ueberkappung'],
        'text-lang-profunda': ['medical_ueberkappung'],
        'nasty-dictation-1': ['medical_ueberkappung'],
        'bleeding-heavy-requires-hemostasis': ['medical_hemostasis'],
        'sensitivity-high-requires-followup': ['medical_sensitivity_followup'],
        'profunda-plus-bleeding-combo': ['medical_hemostasis', 'medical_ueberkappung'],
    };

    for (const [caseId, expectedAskbacks] of Object.entries(ASKBACK_SNAPSHOTS)) {
        it(`${caseId}: askbacks match snapshot`, () => {
            const actualAskbacks = collectAskbacks(caseId);
            expect(actualAskbacks).toEqual(expectedAskbacks.sort());
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // DRIFT DETECTION: All cases must have stable askbacks
    // ═══════════════════════════════════════════════════════════════

    it('all golden cases produce deterministic askbacks', () => {
        for (const testCase of GOLDEN_MEDICAL_CASES) {
            const askbacks1 = collectAskbacks(testCase.id);
            const askbacks2 = collectAskbacks(testCase.id);

            expect(askbacks1).toEqual(askbacks2);
        }
    });
});
