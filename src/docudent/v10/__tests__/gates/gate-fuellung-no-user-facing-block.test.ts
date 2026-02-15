/**
 * Gate Test: Fuellung No User-Facing BLOCK (GP4)
 *
 * Contract: No Fuellung case returns state=error due to combinability BLOCK.
 * Combinability conflicts must auto-resolve (drop codes) rather than error.
 *
 * FAIL-FAST: This gate fails if ANY Fuellung case gets BLOCK verdict.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTHCASES THAT COULD TRIGGER COMBINABILITY CONFLICTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ConflictTruthcase {
    id: string;
    description: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    forceExtraction?: Record<string, unknown>;
    forceChips?: string[];
    expectedConflictPossible: boolean;  // Whether this case COULD trigger conflict
}

const CONFLICT_TRUTHCASES: ConflictTruthcase[] = [
    // These cases COULD trigger GOZ_2197 conflict if Mehrschicht was emitted
    {
        id: 'NC01',
        description: 'PKV MOD Mehrschicht - potential 2197 conflict',
        dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik',
        insuranceType: 'PKV',
        forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], adhesiveTechnique: true },
        expectedConflictPossible: true,
    },
    {
        id: 'NC02',
        description: 'MKV Mehrschicht confirmed - potential 2197 conflict',
        dictation: 'Zahn 26 mod Mehrschichttechnik Mehrkosten',
        insuranceType: 'MKV',
        forceExtraction: { tooth: '26', surfaces: ['m', 'o', 'd'], mehrkostenConfirmed: true, adhesiveTechnique: true },
        expectedConflictPossible: true,
    },
    // Normal cases that should NOT trigger conflict
    {
        id: 'NC03',
        description: 'GKV MOD standard - no conflict expected',
        dictation: 'Zahn 36 mod Füllung',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC04',
        description: 'PKV O-Fläche - no conflict expected',
        dictation: 'Zahn 16 o Kompositfüllung',
        insuranceType: 'PKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC05',
        description: 'MKV nurKasse - no GOZ, no conflict',
        dictation: 'Zahn 36 mod Füllung nur Kasse',
        insuranceType: 'MKV',
        forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], nurKasse: true },
        expectedConflictPossible: false,
    },
    {
        id: 'NC06',
        description: 'GKV with LA and Kofferdam - no conflict',
        dictation: 'Zahn 36 mod Füllung LA Kofferdam',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC07',
        description: 'GKV with Cp - no conflict',
        dictation: 'Zahn 46 o profunda Cp Ca(OH)2',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC08',
        description: 'PKV MOD with LA - no conflict',
        dictation: 'Zahn 36 mod Füllung Infiltrationsanästhesie',
        insuranceType: 'PKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC09',
        description: 'MKV without Mehrkosten - BEMA only, no conflict',
        dictation: 'Zahn 36 mod Füllung',
        insuranceType: 'MKV',
        forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], mehrkostenConfirmed: false },
        expectedConflictPossible: false,
    },
    {
        id: 'NC10',
        description: 'PKV 4-flächig - no conflict',
        dictation: 'Zahn 37 modl Füllung',
        insuranceType: 'PKV',
        expectedConflictPossible: false,
    },
    // Edge cases
    {
        id: 'NC11',
        description: 'Empty dictation fallback',
        dictation: 'Füllung',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC12',
        description: 'GKV O with Fluoridierung',
        dictation: 'Zahn 16 o Füllung Fluoridierung',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC13',
        description: 'PKV Frontzahn mesial',
        dictation: 'Zahn 11 mesial Kompositfüllung',
        insuranceType: 'PKV',
        expectedConflictPossible: false,
    },
    {
        id: 'NC14',
        description: 'MKV with full chain',
        dictation: 'Zahn 36 mod Füllung LA Kofferdam Cp Ca(OH)2',
        insuranceType: 'MKV',
        forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], anesthesia: 'leitung', kofferdamUsed: true },
        expectedConflictPossible: false,
    },
    {
        id: 'NC15',
        description: 'GKV UK Molar Leitung',
        dictation: 'Zahn 46 mod Füllung Leitungsanästhesie',
        insuranceType: 'GKV',
        expectedConflictPossible: false,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GATE TEST: NO USER-FACING BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate: Fuellung No User-Facing Block (GP4)', () => {
    describe('Contract: No combinability BLOCK returns state=error', () => {
        for (const tc of CONFLICT_TRUTHCASES) {
            it(`${tc.id}: ${tc.description}`, async () => {
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: 'fuellung',
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                    answers: new Map([
                        ['medical_caries_depth', 'normal'],
                        ['medical_ueberkappung', 'nein'],
                    ]),
                    testOnly: tc.forceExtraction ? {
                        enabled: true,
                        forceExtraction: tc.forceExtraction,
                        forceChips: tc.forceChips,
                    } : undefined,
                });

                // === Gate 1: Must NOT be error due to combinability ===
                if (result.state === 'error') {
                    const isCombinabilityError = result.error?.toLowerCase().includes('kombination') ||
                        result.error?.toLowerCase().includes('ausschluss') ||
                        result.error?.toLowerCase().includes('block');

                    if (isCombinabilityError) {
                        console.error(`[${tc.id}] BLOCK ERROR:`, result.error);
                    }
                    expect(isCombinabilityError).toBe(false);
                }

                // === Gate 2: If combinability present, verdict !== BLOCK ===
                if (result.state === 'output' && result.meta.combinability) {
                    const verdict = result.meta.combinability.verdict;
                    if (verdict === 'BLOCK') {
                        console.error(`[${tc.id}] BLOCK VERDICT:`, result.meta.combinability);
                    }
                    expect(verdict).not.toBe('BLOCK');

                    // WARN is allowed with droppedCodes
                    if (verdict === 'WARN') {
                        console.log(`[${tc.id}] WARN verdict (allowed):`, {
                            conflicts: result.meta.combinability.conflicts.length,
                            droppedCodes: result.meta.combinability.droppedCodes,
                        });
                    }
                }

                // === Gate 3: Output state or questions state (never error from combinability) ===
                expect(['output', 'questions']).toContain(result.state);

                console.log(`[${tc.id}] ✓ No BLOCK: state=${result.state}`);
            });
        }
    });

    // === Summary test ===
    it('Summary: All conflict cases covered', () => {
        expect(CONFLICT_TRUTHCASES.length).toBeGreaterThanOrEqual(15);
    });
});
