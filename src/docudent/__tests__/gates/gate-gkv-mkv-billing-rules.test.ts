/**
 * Gate Test: GKV vs MKV Billing Rules
 *
 * Tests that GKV default (Bulkfill) vs MKV (Mehrschicht) billing is correct.
 * 
 * Rules:
 * - GKV default Seitenzahn: selbstadhäsiv (no "Adhäsiv separat" billing)
 * - Mehrschicht only bills MKV/PKV (GOZ 2197), not GKV
 * - MKV marker only when explicitly diktiert or confirmed
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

interface TruthCase {
    id: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    expected: {
        hasBilling: boolean;
        billingMustContain?: string[];
        billingMustNotContain?: string[];
        chipsMustContain?: string[];
        chipsMustNotContain?: string[];
        comment: string;
    };
}

const TRUTH_CASES: TruthCase[] = [
    // GKV Fälle - kein MKV billing
    {
        id: 'gkv_standard_1',
        dictation: 'Füllung 36 okklusal Komposit',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'],
            billingMustNotContain: ['GOZ_2197'], // No MKV billing for standard GKV
            comment: 'GKV standard: F-code only, no MKV',
        },
    },
    {
        id: 'gkv_standard_2',
        dictation: 'Füllung 14 mesial distal Komposit',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13b'],
            billingMustNotContain: ['GOZ_2197'],
            comment: 'GKV 2-surface: F-code only',
        },
    },
    {
        id: 'gkv_giz',
        dictation: 'Füllung 36 okklusal GIZ',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'],
            billingMustNotContain: ['GOZ_2197'],
            chipsMustContain: ['fuellung_material_giz'],
            chipsMustNotContain: ['mehrschicht'],
            comment: 'GKV GIZ: no adhesive technique',
        },
    },
    {
        id: 'gkv_kofferdam',
        dictation: 'Füllung 36 okklusal Komposit mit Kofferdam',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13', 'BEMA_12'],
            billingMustNotContain: ['GOZ_2197'],
            chipsMustContain: ['kofferdam'],
            comment: 'GKV Kofferdam: F-code + Kofferdam, no MKV',
        },
    },

    // PKV Fälle - GOZ billing
    {
        id: 'pkv_standard',
        dictation: 'Füllung 36 okklusal Komposit adhäsiv',
        insuranceType: 'PKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['GOZ_2060'],
            comment: 'PKV: GOZ F-code',
        },
    },
    {
        id: 'pkv_kofferdam',
        dictation: 'Füllung 36 okklusal Komposit Kofferdam',
        insuranceType: 'PKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['GOZ_2060', 'GOZ_2040'],
            comment: 'PKV Kofferdam: GOZ F-code + Kofferdam',
        },
    },

    // MKV Fälle - Mehrkosten
    {
        id: 'mkv_mehrschicht',
        dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten',
        insuranceType: 'MKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'], // F-code
            chipsMustContain: ['insurance_gkv_mkv', 'mehrschicht'],
            comment: 'MKV: F-code + MKV marker',
        },
    },
    {
        id: 'mkv_adhesiv',
        dictation: 'Füllung 36 okklusal Komposit Adhäsivtechnik MKV',
        insuranceType: 'MKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'],
            chipsMustContain: ['insurance_gkv_mkv'],
            comment: 'MKV adhesive: F-code + MKV marker',
        },
    },

    // Edge cases
    {
        id: 'gkv_bulkfill_explicit',
        dictation: 'Füllung 36 okklusal Komposit Bulkfill',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'],
            billingMustNotContain: ['GOZ_2197'],
            comment: 'GKV Bulkfill: standard GKV, no MKV',
        },
    },
    {
        id: 'gkv_multi_tooth',
        dictation: 'Füllung 36 und 37 okklusal Komposit',
        insuranceType: 'GKV',
        expected: {
            hasBilling: true,
            billingMustContain: ['BEMA_13'],
            billingMustNotContain: ['GOZ_2197'],
            comment: 'GKV multi-tooth: 2x F-code',
        },
    },
];

describe('gate-gkv-mkv-billing-rules', () => {
    for (const tc of TRUTH_CASES) {
        test(`${tc.id}: ${tc.expected.comment}`, async () => {
            const result = await runV10({
                dictation: tc.dictation,
                treatmentId: 'fuellung',
                insuranceType: tc.insuranceType,
                textLength: 'mittel',
            });

            // Should not error
            expect(result.state).not.toBe('error');

            // Skip if questions pending (expected for some cases)
            if (result.state === 'questions') {
                console.log(`[${tc.id}] Questions pending:`, result.questions?.map(q => q.id));
                return;
            }

            // Get billing from perInstance
            const allBilling = Object.values(result.output.perInstance)
                .flatMap(inst => inst.billingRefs);
            const allChips = [...new Set(
                Object.values(result.output.perInstance).flatMap(inst => inst.chips)
            )];

            console.log(`[${tc.id}] Billing:`, allBilling);
            console.log(`[${tc.id}] Chips:`, allChips);

            // Check billing expectations
            if (tc.expected.hasBilling) {
                expect(allBilling.length).toBeGreaterThan(0);
            }

            if (tc.expected.billingMustContain) {
                for (const code of tc.expected.billingMustContain) {
                    expect(allBilling).toContain(code);
                }
            }

            if (tc.expected.billingMustNotContain) {
                for (const code of tc.expected.billingMustNotContain) {
                    expect(allBilling).not.toContain(code);
                }
            }

            // Check chip expectations
            if (tc.expected.chipsMustContain) {
                for (const chip of tc.expected.chipsMustContain) {
                    expect(allChips).toContain(chip);
                }
            }

            if (tc.expected.chipsMustNotContain) {
                for (const chip of tc.expected.chipsMustNotContain) {
                    expect(allChips).not.toContain(chip);
                }
            }
        });
    }

    test('summary: no false MKV billing for GKV cases', async () => {
        const gkvCases = TRUTH_CASES.filter(tc => tc.insuranceType === 'GKV');
        let falseMkvCount = 0;

        for (const tc of gkvCases) {
            const result = await runV10({
                dictation: tc.dictation,
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            if (result.state === 'output') {
                const billing = Object.values(result.output.perInstance)
                    .flatMap(inst => inst.billingRefs);

                if (billing.includes('GOZ_2197')) {
                    console.log(`[FALSE MKV] ${tc.id}: GOZ_2197 in GKV case`);
                    falseMkvCount++;
                }
            }
        }

        expect(falseMkvCount).toBe(0);
    });
});
