/**
 * Gate Test: MKV Minimal Askback 2.0 (GIGAPROMPT 8)
 *
 * Contract (Simplified):
 * If MKV is selected:
 * - If Mehrkosten signals are present → ask amount + justification (as needed).
 * - If signals are unclear → ask mkv_confirmed first (nur Kasse vs Mehrkosten).
 * Suppress only for explicit nurKasse ("nur Kasse", "Kassenleistung").
 *
 * @fast < 3s
 * @deterministic
 */

import { describe, test, expect, it } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MkvAskbackCase {
    id: string;
    description: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    expectedAskback: 'none' | 'mkv_confirmed' | 'mkv_justification' | 'other';
    expectsAmountAskback?: boolean;
    expectedGozAddon: boolean | 'skip'; // 'skip' if in questions state
    textMustContain?: string[];
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES PER GIGAPROMPT 8
// ═══════════════════════════════════════════════════════════════

const MKV_ASKBACK_CASES: MkvAskbackCase[] = [
    // ─── Case 1: MKV + 120€ + Komposit → askback present, amount already known ────
    {
        id: 'mkv_signals_clear',
        description: 'MKV + 120€ + Komposit → askback present',
        dictation: 'Füllung Zahn 36 MOD Komposit 120 Euro',
        insuranceType: 'MKV',
        expectedAskback: 'mkv_justification',
        expectsAmountAskback: false,
        expectedGozAddon: true,
    },

    // ─── Case 2: MKV + 120€ no material → askback appears, amount already known ────
    {
        id: 'mkv_amount_no_material',
        description: 'MKV + 120€ no material keywords → askback present',
        dictation: 'Füllung Zahn 36 MOD 120 Euro',
        insuranceType: 'MKV',
        expectedAskback: 'mkv_justification',
        expectsAmountAskback: false,
        expectedGozAddon: true,
    },

    // ─── Case 3: MKV + "nur Kasse" → NO GOZ addon, askback suppressed ────
    {
        id: 'mkv_nur_kasse',
        description: 'MKV + "nur Kasse" → NO GOZ addon, NO askback',
        dictation: 'Füllung Zahn 36 okklusal nur Kasse',
        insuranceType: 'MKV',
        expectedAskback: 'none', // nurKasse suppresses askback
        expectedGozAddon: false,
        textMustContain: ['nur Kassenleistung'], // Must mention it in documentation
    },

    // ─── Case 5: MKV + Mehrschicht keyword → askback present ────
    {
        id: 'mkv_mehrschicht_keyword',
        description: 'MKV + Mehrschicht keyword → askback present',
        dictation: 'Füllung Zahn 36 MOD Mehrschichttechnik',
        insuranceType: 'MKV',
        expectedAskback: 'mkv_confirmed',
        expectedGozAddon: true,
    },

    // ─── Case 6: MKV ambiguous (no signals) → exactly 1 askback ────
    {
        id: 'mkv_ambiguous',
        description: 'MKV without signals → ask mkv_confirmed only',
        dictation: 'Füllung Zahn 36 okklusal',
        insuranceType: 'MKV',
        expectedAskback: 'mkv_confirmed',
        expectedGozAddon: 'skip', // In questions state
    },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function hasMkvAskback(result: Awaited<ReturnType<typeof runV10>>): boolean {
    if (result.state !== 'questions') return false;
    return result.questions?.some(q =>
        q.id?.includes('mehrkosten') ||
        q.id?.includes('mkv') ||
        q.questionKey?.includes('mehrkosten')
    ) ?? false;
}

function countMkvAskbacks(result: Awaited<ReturnType<typeof runV10>>): number {
    if (result.state !== 'questions') return 0;
    return result.questions?.filter(q =>
        q.id?.includes('mehrkosten') ||
        q.id?.includes('mkv') ||
        q.questionKey?.includes('mehrkosten')
    ).length ?? 0;
}

function hasGozAddon(result: Awaited<ReturnType<typeof runV10>>): boolean {
    if (result.state === 'error') return false;
    const perInstance = result.output?.perInstance ?? {};
    const allBilling = Object.values(perInstance).flatMap(inst => inst.billingRefs ?? []);
    return allBilling.some(b => b.startsWith('GOZ_'));
}

function getFullText(result: Awaited<ReturnType<typeof runV10>>): string {
    if (result.state === 'error') return '';
    return result.output?.fullText ?? '';
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('gate-mkv-minimal-askback-v2', () => {
    describe('MKV Askback Suppression Cases', () => {
        for (const tc of MKV_ASKBACK_CASES) {
            test(`[${tc.id}] ${tc.description}`, async () => {
                const result = await runV10({
                    treatmentId: 'fuellung',
                    dictation: tc.dictation,
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                });

                // Should not error
                expect(result.state, `Case ${tc.id} should not error`).not.toBe('error');

                const mkvAskbackPresent = hasMkvAskback(result);
                const mkvAskbackCount = countMkvAskbacks(result);
                const gozPresent = hasGozAddon(result);
                const fullText = getFullText(result);

                console.log(`[${tc.id}] State:`, result.state);
                console.log(`[${tc.id}] MKV askback present:`, mkvAskbackPresent);
                console.log(`[${tc.id}] MKV askback count:`, mkvAskbackCount);
                console.log(`[${tc.id}] GOZ addon present:`, gozPresent);

                // ─── expectedAskback ───────────────────────────────────
                if (tc.expectedAskback === 'none') {
                    expect(
                        mkvAskbackPresent,
                        `[${tc.id}] Expected NO MKV askback`
                    ).toBe(false);
                } else if (tc.expectedAskback === 'mkv_confirmed') {
                    expect(
                        mkvAskbackPresent,
                        `[${tc.id}] Expected MKV askback to appear`
                    ).toBe(true);
                    const hasConfirmed = result.questions?.some(q =>
                        String(q.questionKey ?? '') === 'mkv_confirmed'
                    );
                    const hasJustification = result.questions?.some(q =>
                        String(q.questionKey ?? '') === 'mkv_justification'
                    );
                    const hasAmount = result.questions?.some(q =>
                        String(q.questionKey ?? '') === 'mkv_betrag'
                    );
                    expect(hasConfirmed, `[${tc.id}] Expected mkv_confirmed`).toBe(true);
                    expect(hasJustification, `[${tc.id}] Expected mkv_justification to be gated (not asked yet)`).toBe(false);
                    expect(hasAmount, `[${tc.id}] Expected mkv_betrag to be gated (not asked yet)`).toBe(false);
                } else if (tc.expectedAskback === 'mkv_justification') {
                    expect(
                        mkvAskbackPresent,
                        `[${tc.id}] Expected MKV askback to appear`
                    ).toBe(true);
                    const hasJustification = result.questions?.some(q =>
                        String(q.questionKey ?? '') === 'mkv_justification'
                    );
                    const hasAmount = result.questions?.some(q =>
                        String(q.questionKey ?? '') === 'mkv_betrag'
                    );
                    expect(hasJustification, `[${tc.id}] Expected mkv_justification`).toBe(true);
                    if (tc.expectsAmountAskback === false) {
                        expect(hasAmount, `[${tc.id}] Expected mkv_betrag to be suppressed (amount known)`).toBe(false);
                    } else {
                        expect(hasAmount, `[${tc.id}] Expected mkv_betrag`).toBe(true);
                    }
                }

                // ─── expectedGozAddon ──────────────────────────────────
                if (tc.expectedGozAddon !== 'skip' && result.state === 'output') {
                    expect(
                        gozPresent,
                        `[${tc.id}] Expected GOZ addon to be ${tc.expectedGozAddon}`
                    ).toBe(tc.expectedGozAddon);
                }

                // ─── textMustContain ───────────────────────────────────
                if (tc.textMustContain && fullText && result.state === 'output') {
                    for (const text of tc.textMustContain) {
                        expect(
                            fullText.toLowerCase().includes(text.toLowerCase()),
                            `[${tc.id}] Expected text to contain "${text}"`
                        ).toBe(true);
                    }
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT: GKV MUST NOT ASK MKV
    // MKV is an explicit contract choice (UI toggle), never inferred.
    // ═══════════════════════════════════════════════════════════════

    describe('GKV Never Gets MKV Askback', () => {
        const gkvDictations = [
            'Füllung Zahn 36 MOD Komposit',
            'Füllung Zahn 26 okklusal',
            'Füllung Zahn 27 MOD tief LA Kofferdam',
        ];

        for (const dictation of gkvDictations) {
            it(`GKV "${dictation.slice(0, 30)}..." → no MKV askback`, async () => {
                const result = await runV10({
                    treatmentId: 'fuellung',
                    dictation,
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                });

                expect(result.state).not.toBe('error');
                expect(hasMkvAskback(result)).toBe(false);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT: SIGNAL DETECTION QUALITY
    // ═══════════════════════════════════════════════════════════════

    describe('Signal Detection Quality', () => {
        it('Amount pattern "120€" triggers askback', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 MOD 120€',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            expect(hasMkvAskback(result)).toBe(true);
        });

        it('Keyword "Adhäsivtechnik" triggers askback', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 MOD Adhäsivtechnik',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            expect(hasMkvAskback(result)).toBe(true);
        });

        it('Keyword "Komposit" triggers askback', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 MOD Komposit',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            expect(hasMkvAskback(result)).toBe(true);
        });

        it('Rejection "nur Kasse" suppresses askback', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal nur Kasse',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            expect(hasMkvAskback(result)).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT: NUR KASSE HANDLING
    // ═══════════════════════════════════════════════════════════════

    describe('nurKasse Handling', () => {
        it('MKV + nurKasse → no GOZ addon in billing', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal nur Kasse',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            if (result.state === 'output') {
                expect(hasGozAddon(result)).toBe(false);
            }
        });
    });
});
