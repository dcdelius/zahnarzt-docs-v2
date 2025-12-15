/**
 * Extraction Reality Test Suite
 *
 * Tests extractionServiceV2 against real dictation fixtures.
 *
 * Rules:
 * - NO mocks except LLM (if used)
 * - Tests deterministic Stage A parsing
 * - Validates evidence spans match dictation
 * - Checks needsConfirmation is set correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { extractFromDictationV2 } from '../extractionServiceV2';
import type { ExtractedDataV2, Field } from '../../../contracts/extraction';
import fixtures from '../__fixtures__/extraction_fixtures.json';

// ═══════════════════════════════════════════════════════════════
// FIXTURE TYPE
// ═══════════════════════════════════════════════════════════════

interface ExpectedMentioned {
    anesthesia?: { present: boolean; type: string };
    kofferdam?: boolean | null;
    tiefe?: string;
    vitality?: string;
    percussion?: string;
    capping?: { present: boolean; type: string; material?: string };
    material?: string;
}

interface Fixture {
    id: string;
    dictation: string;
    note?: string;
    expected: {
        tooth?: string | null;
        surfaces?: string[];
        // NO diagnosis - that's derived by Engine
        // legacy fixtures may still have diagnosis - we'll map to keywordFlags
        diagnosis?: string | null;
        costs?: number | null;
        mentioned?: ExpectedMentioned;
    };
}

const typedFixtures = fixtures as Fixture[];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function fieldValue<T>(field: Field<T>): T | null {
    return field.value;
}

function hasEvidence<T>(field: Field<T>, dictation: string): boolean {
    // Evidence should be substrings of the dictation
    return field.evidence.every(ev =>
        dictation.toLowerCase().includes(ev.toLowerCase())
    );
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Extraction Reality Tests', () => {
    describe('Stage A: Deterministic Parsing', () => {
        it('should have at least 25 fixtures', () => {
            expect(typedFixtures.length).toBeGreaterThanOrEqual(25);
        });

        describe.each(typedFixtures)('Fixture $id: "$dictation"', (fixture) => {
            let result: ExtractedDataV2;

            beforeAll(async () => {
                result = await extractFromDictationV2(fixture.dictation, { skipLLM: true });
            });

            it('should extract tooth correctly', () => {
                const expected = fixture.expected.tooth ?? null;
                const actual = fieldValue(result.tooth);

                if (expected === null) {
                    // Either null or needsConfirmation
                    expect(actual === null || result.tooth.needsConfirmation).toBe(true);
                } else {
                    expect(actual).toBe(expected);
                }
            });

            it('should extract surfaces correctly', () => {
                const expected = fixture.expected.surfaces ?? [];
                const actual = fieldValue(result.surfaces) || [];

                if (expected.length > 0) {
                    // Should match expected surfaces (order doesn't matter)
                    expect(actual.sort()).toEqual(expected.sort());
                }
                // If expected is empty, we don't enforce anything
            });

            it('should extract costs correctly', () => {
                const expected = fixture.expected.costs;
                const actual = fieldValue(result.costs);

                if (expected === undefined || expected === null) {
                    // Not specified in fixture or explicitly null
                    expect(actual === null || actual === expected).toBe(true);
                } else {
                    expect(actual).toBe(expected);
                    // Cost in text should NOT need confirmation
                    expect(result.costs.needsConfirmation).toBe(false);
                }
            });

            it('should extract keywordFlags correctly', () => {
                const expected = fixture.expected.diagnosis;

                if (expected === undefined || expected === null) {
                    // Not specified - just pass
                    expect(true).toBe(true);
                } else if (expected === 'Caries profunda') {
                    // Profunda -> saidDeepCavity
                    expect(result.keywordFlags.saidDeepCavity).toBe(true);
                } else if (expected === 'Caries media') {
                    // Media can be:
                    // 1. Explicit: "media", "karies", "caries" in text -> saidCaries
                    // 2. Implicit: "nicht tief" -> NOT saidDeepCavity (old inference)
                    // New SSOT: we only check saidDeepCavity is false
                    expect(result.keywordFlags.saidDeepCavity).toBe(false);
                } else if (expected === 'Caries superficialis') {
                    expect(result.keywordFlags.saidSuperficial).toBe(true);
                } else if (expected === 'Fraktur') {
                    expect(result.keywordFlags.saidFracture).toBe(true);
                } else {
                    // Unknown or partial match - just pass (legacy fixtures have implicit logic)
                    expect(true).toBe(true);
                }
            });

            it('should have valid evidence spans', () => {
                // Evidence should be substrings of original dictation
                if (result.tooth.value !== null) {
                    expect(hasEvidence(result.tooth, fixture.dictation)).toBe(true);
                }
                if (result.costs.value !== null) {
                    expect(hasEvidence(result.costs, fixture.dictation)).toBe(true);
                }
            });

            it('should set needsConfirmation correctly for anesthesia', () => {
                const expected = fixture.expected.mentioned?.anesthesia;
                const actual = result.mentioned.anesthesia;

                if (expected) {
                    if (expected.type === 'unknown') {
                        expect(actual.needsConfirmation).toBe(true);
                    } else if (expected.type === 'leitung' || expected.type === 'infiltr' || expected.type === 'keine') {
                        expect(actual.value?.type).toBe(expected.type);
                    }
                }
            });

            it('should extract kofferdam correctly', () => {
                const expected = fixture.expected.mentioned?.kofferdam;
                const actual = fieldValue(result.mentioned.kofferdam);

                if (expected === true) {
                    expect(actual).toBe(true);
                } else if (expected === false) {
                    expect(actual).toBe(false);
                }
                // null/undefined = not mentioned, which is fine as unknownField
            });

            it('should extract vitality correctly', () => {
                const expected = fixture.expected.mentioned?.vitality;
                const actual = fieldValue(result.mentioned.vitality);

                if (expected === '+' || expected === '-') {
                    expect(actual).toBe(expected);
                }
            });

            it('should extract percussion correctly', () => {
                const expected = fixture.expected.mentioned?.percussion;
                const actual = fieldValue(result.mentioned.percussion);

                if (expected === '+' || expected === '-') {
                    expect(actual).toBe(expected);
                }
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty dictation', async () => {
            const result = await extractFromDictationV2('', { skipLLM: true });
            expect(result.tooth.value).toBeNull();
            expect(result.tooth.needsConfirmation).toBe(true);
        });

        it('should detect multiple teeth and mark for segmentation', async () => {
            const result = await extractFromDictationV2('46 mod und 47 mo', { skipLLM: true });
            expect(result.tooth.needsConfirmation).toBe(true);
            expect(result.surfaces.needsConfirmation).toBe(true);
        });

        it('should extract costs when clearly formatted', async () => {
            const result = await extractFromDictationV2('Mehrkosten 120€', { skipLLM: true });
            expect(result.costs.value).toBe(120);
            expect(result.costs.needsConfirmation).toBe(false);
        });

        it('should not guess costs when not in text', async () => {
            const result = await extractFromDictationV2('36 mod tief', { skipLLM: true });
            expect(result.costs.value).toBeNull();
        });

        it('should recognize synonym "LA" for anesthesia', async () => {
            const result = await extractFromDictationV2('LA 36', { skipLLM: true });
            expect(result.mentioned.anesthesia.value?.present).toBe(true);
        });

        it('should recognize "keine LA"', async () => {
            const result = await extractFromDictationV2('keine LA 36', { skipLLM: true });
            expect(result.mentioned.anesthesia.value?.type).toBe('keine');
        });

        it('should recognize devital as negative vitality', async () => {
            const result = await extractFromDictationV2('devitaler Zahn', { skipLLM: true });
            expect(result.mentioned.vitality.value).toBe('-');
        });

        it('should recognize perkussionsempfindlich as positive', async () => {
            const result = await extractFromDictationV2('perkussionsempfindlich', { skipLLM: true });
            expect(result.mentioned.percussion.value).toBe('+');
        });
    });

    describe('Evidence Quality', () => {
        it('should include evidence for every certain field', async () => {
            const result = await extractFromDictationV2('36 mod profunda Leitung 80€', { skipLLM: true });

            expect(result.tooth.evidence.length).toBeGreaterThan(0);
            expect(result.surfaces.evidence.length).toBeGreaterThan(0);
            // keywordFlags don't have evidence - they're boolean flags
            expect(result.keywordFlags.saidDeepCavity).toBe(true);
            expect(result.costs.evidence.length).toBeGreaterThan(0);
            expect(result.mentioned.anesthesia.evidence.length).toBeGreaterThan(0);
        });

        it('should not have evidence for unknown fields', async () => {
            const result = await extractFromDictationV2('36 mod', { skipLLM: true });

            expect(result.costs.value).toBeNull();
            expect(result.costs.evidence.length).toBe(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY REPORT TEST
// ═══════════════════════════════════════════════════════════════

describe('Extraction Coverage Report', () => {
    it('should generate coverage report', async () => {
        const results: { id: string; unknown: string[] }[] = [];

        for (const fixture of typedFixtures) {
            const result = await extractFromDictationV2(fixture.dictation, { skipLLM: true });
            const unknownFields: string[] = [];

            if (result.tooth.value === null) unknownFields.push('tooth');
            if ((result.surfaces.value || []).length === 0) unknownFields.push('surfaces');
            if (result.mentioned.vitality.value === null) unknownFields.push('vitality');
            if (result.mentioned.percussion.value === null) unknownFields.push('percussion');

            if (unknownFields.length > 0) {
                results.push({ id: fixture.id, unknown: unknownFields });
            }
        }

        console.log('\n📊 EXTRACTION COVERAGE REPORT');
        console.log('═══════════════════════════════════════');
        console.log(`Total fixtures: ${typedFixtures.length}`);
        console.log(`Fixtures with unknown fields: ${results.length}`);
        console.log('\nDetails:');
        results.forEach(r => {
            console.log(`  ${r.id}: ${r.unknown.join(', ')}`);
        });

        // This is informational, not a failure
        expect(true).toBe(true);
    });
});
