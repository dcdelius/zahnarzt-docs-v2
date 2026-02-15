import { describe, it, expect } from 'vitest';
import { inferBilling, ExtractedData } from '../docudent/core/billing/knowledgeBase/logic/billingInference';

// Mock Defaults (what we want to inject)
const MOCK_DEFAULTS = {
    methodik: { kofferdamStandard: true, kariesdetektorBeiZweifel: false },
    anaesthesie: { ukSeitenzahn: 'leitung', oberflaecheImmer: true },
    tiefKaries: { unterfuellungStandard: true }
};

describe('Verification Suite: 5 Filling Cases', () => {

    // 1. STANDARD CASE (GKV)
    it('Case 1: Standard GKV - Should include Setup Defaults (Kofferdam, Anesthesia)', () => {
        const input: ExtractedData = {
            tooth: '36',
            surfaces: ['m', 'o', 'd'],
            diagnosis: 'Caries profunda',
            material: 'Komposit',
            versorgungsart: 'fuellung'
        };

        // NOTE: We need to update inferBilling to accept defaults!
        // We cast parameters to any to bypass TS check for now until we update the signature
        const result = inferBilling(input, 'GKV', 'ohne', MOCK_DEFAULTS as any);

        const codes = result.suggestions.map(s => s.code);

        // Basic Filling
        expect(codes).toContain('BEMA_13c');

        // Setup Defaults Verification
        expect(codes).toContain('BEMA_12'); // Kofferdam (Standard)
        expect(codes).toContain('BEMA_41a'); // Leitung (UK 36)
        // If defaults.oberflaecheImmer is true, we DOES expect GOZ_0080 even in GKV (as private/optional)
        expect(codes).toContain('GOZ_0080');
    });

    // 2. DEEP CARIES (GKV)
    it('Case 2: Deep Caries - Should handle Cp/P logic', () => {
        const input: ExtractedData = {
            tooth: '46',
            surfaces: ['o'],
            diagnosis: 'Caries profunda, Pulpa eröffnet', // Key phrases
            material: 'Komposit',
            versorgungsart: 'fuellung'
        };

        const result = inferBilling(input, 'GKV', 'ohne', MOCK_DEFAULTS as any);
        const codes = result.suggestions.map(s => s.code);

        // Basic Filling
        expect(codes).toContain('BEMA_13a'); // 1 surface

        // Cp / P Logic
        // The engine should detect 'Pulpa eröffnet' or 'profunda'
        // Ideally suggests BEMA 25 (Cp) or 26 (P)
        // Currently expected to FAIL until logic is added
        // We add expect queries to guide implementation
        const hasCpOrP = codes.includes('BEMA_25') || codes.includes('BEMA_26');
        expect(hasCpOrP).toBe(true);
    });

    // 3. HIGH-END PRIVATE (PKV)
    it('Case 3: High-End Private (PKV) - Analog & Factors', () => {
        const input: ExtractedData = {
            tooth: '11',
            surfaces: ['m', 'i', 'd'], // Class IV approx
            diagnosis: 'Eckenaufbau',
            material: 'Komposit',
            versorgungsart: 'fuellung'
        };

        const result = inferBilling(input, 'PKV', 'ohne', MOCK_DEFAULTS as any);
        const codes = result.suggestions.map(s => s.code);

        // Class IV Filling: GOZ 2100 (3 surfaces) or appropriate
        expect(codes).toContain('GOZ_2100');

        // Defaults: Kofferdam (GOZ 2040)
        expect(codes).toContain('GOZ_2040');

        // Adhesive (GOZ 2197) - should be suggested for Komposit
        // Note: Logic currently only adds GOZ_2197 in GKV block? Need to verify PKV block logic.
        expect(codes).toContain('GOZ_2197');
    });

    // 4. MULTI-TOOTH (GKV)
    it('Case 4: Multi-Tooth - Quadrant Sanierung', () => {
        // Simulating 2 teeth
        const input15: ExtractedData = { tooth: '15', surfaces: ['m', 'o', 'd'], versorgungsart: 'fuellung' };
        const input16: ExtractedData = { tooth: '16', surfaces: ['m', 'o', 'd'], versorgungsart: 'fuellung' };

        const res15 = inferBilling(input15, 'GKV', 'ohne', MOCK_DEFAULTS as any);
        const res16 = inferBilling(input16, 'GKV', 'ohne', MOCK_DEFAULTS as any);

        const codes15 = res15.suggestions.map(s => s.code);
        const codes16 = res16.suggestions.map(s => s.code);

        expect(codes15).toContain('BEMA_13c');
        expect(codes16).toContain('BEMA_13c');

        // Anesthesia: OK (15/16) -> Infiltration (BEMA 40)
        // Defaults say OberflaecheImmer -> GOZ 0080 (Private)
        expect(codes15).toContain('BEMA_40');
        expect(codes16).toContain('BEMA_40');
    });

    // 5. EMERGENCY (GKV)
    it('Case 5: Emergency - Minimal, Defaults Verification', () => {
        const input: ExtractedData = {
            tooth: '24',
            surfaces: ['d'],
            diagnosis: 'Schmerzbehandlung',
            material: 'Prov. Füllung',
            versorgungsart: 'fuellung'
            // Technically "provisorische Füllung" is distinct, but let's see what filling engine does
        };

        const result = inferBilling(input, 'GKV', 'ohne', MOCK_DEFAULTS as any);
        const codes = result.suggestions.map(s => s.code);

        // If material contains 'Prov', maybe we expect BEMA 11? 
        // Current engine treats 'fuellung' as 13a/b/c based on surfaces.
        // It should ideally detect 'provisorisch' -> BEMA 11 (pV).
        // This is a logic gap.

        // Check for defaults: Even in emergency, if profile is active, defaults apply.
        // User must manually disable. Verification here confirms "Risk".
        expect(codes).toContain('BEMA_12'); // Kofferdam default
    });
});
