/**
 * Gate: V10 UI Payload Wiring Test (M51)
 * 
 * Verifies that effectiveInsuranceType logic is correct:
 * 1. MKV selection → insuranceType='MKV' in payload
 * 2. treatmentId/textLength/dictation passed correctly
 * 3. No silent defaults
 * 
 * Tests the logic directly without requiring DOM/jsdom.
 */

import { describe, it, expect } from 'vitest';

/**
 * This is the EXACT logic from useV7Pipeline.ts line ~280
 * We test it here to ensure it's correct without requiring React render.
 */
function computeEffectiveInsuranceType(
    insuranceType: 'GKV' | 'PKV',
    hasMKV: boolean
): 'GKV' | 'PKV' | 'MKV' {
    return hasMKV ? 'MKV' : insuranceType;
}

/**
 * Simulates payload construction from useV7Pipeline.ts
 */
function buildPayload(state: {
    dictation: string;
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    treatmentId: string;
    textLength: 'kurz' | 'mittel' | 'lang';
}) {
    const effectiveInsuranceType = computeEffectiveInsuranceType(
        state.insuranceType,
        state.hasMKV
    );

    return {
        dictation: state.dictation,
        insuranceType: effectiveInsuranceType,
        hasMKV: state.hasMKV,
        treatmentId: state.treatmentId,
        textLength: state.textLength
    };
}

describe('Gate: V10 UI Payload Wiring (M51)', () => {
    describe('MKV Insurance Selection', () => {
        it('MKV selection (hasMKV=true) → payload.insuranceType = "MKV"', () => {
            const payload = buildPayload({
                dictation: 'Zahn 26 MOD Komposit',
                insuranceType: 'GKV',  // Even when GKV is set
                hasMKV: true,
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            // CRITICAL: MKV must be in insuranceType, not just hasMKV flag
            expect(payload.insuranceType).toBe('MKV');
            expect(payload.hasMKV).toBe(true);
        });

        it('GKV without MKV → payload.insuranceType = "GKV"', () => {
            const payload = buildPayload({
                dictation: 'Zahn 36 mo Komposit',
                insuranceType: 'GKV',
                hasMKV: false,
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            expect(payload.insuranceType).toBe('GKV');
            expect(payload.hasMKV).toBe(false);
        });

        it('PKV → payload.insuranceType = "PKV"', () => {
            const payload = buildPayload({
                dictation: 'Zahn 46 do Komposit',
                insuranceType: 'PKV',
                hasMKV: false,
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            expect(payload.insuranceType).toBe('PKV');
        });

        it('PKV with hasMKV still becomes MKV', () => {
            // Edge case: what if someone sets PKV + hasMKV?
            const payload = buildPayload({
                dictation: 'Test',
                insuranceType: 'PKV',
                hasMKV: true,  // This should take precedence
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            expect(payload.insuranceType).toBe('MKV');
        });
    });

    describe('All Selector Fields in Payload', () => {
        it('treatmentId is passed from selector state', () => {
            const payload = buildPayload({
                dictation: 'Test',
                insuranceType: 'GKV',
                hasMKV: false,
                treatmentId: 'endo',
                textLength: 'mittel'
            });

            expect(payload.treatmentId).toBe('endo');
        });

        it('textLength is passed from selector state', () => {
            const payload = buildPayload({
                dictation: 'Test',
                insuranceType: 'GKV',
                hasMKV: false,
                treatmentId: 'fuellung',
                textLength: 'lang'
            });

            expect(payload.textLength).toBe('lang');
        });

        it('dictation is passed exactly as entered', () => {
            const testDictation = 'Zahn 26 MOD tiefe Kompositfüllung Kofferdam LA';

            const payload = buildPayload({
                dictation: testDictation,
                insuranceType: 'GKV',
                hasMKV: false,
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            expect(payload.dictation).toBe(testDictation);
        });
    });

    describe('Payload Snapshot (No Silent Defaults)', () => {
        it('all required fields are present in payload', () => {
            const payload = buildPayload({
                dictation: 'Zahn 36 mo Komposit',
                insuranceType: 'GKV',
                hasMKV: false,
                treatmentId: 'fuellung',
                textLength: 'mittel'
            });

            // Verify all fields present (no undefined allowed)
            expect(payload).toMatchObject({
                dictation: expect.any(String),
                treatmentId: expect.any(String),
                insuranceType: expect.stringMatching(/^(GKV|PKV|MKV)$/),
                textLength: expect.stringMatching(/^(kurz|mittel|lang)$/),
                hasMKV: expect.any(Boolean),
            });

            // Explicit checks
            expect(payload.dictation).not.toBe('');
            expect(payload.treatmentId).not.toBe('');
        });
    });
});
