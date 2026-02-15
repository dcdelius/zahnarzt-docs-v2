/**
 * V10 Perfect Output Contract Test
 * 
 * Contract: Output must be KZV-style documentation, not generic placeholders.
 * 
 * ASSERTIONS:
 * - Output contains tooth number (e.g., "27")
 * - Output contains surfaces (e.g., "MOD")
 * - Output contains anesthesia if mentioned
 * - Output contains capping with material
 * - Output contains MKV info if applicable
 * - Output is NOT "Füllungstherapie durchgeführt." only
 * - No raw "true"/"false" in output
 * - Billing codes are BillingRef IDs (no hardcoded strings at runtime)
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

const FULL_DICTATION = 'Zahn 27 mod mit Anästhesie, tief, mit CP, MKV 120€';

describe('V10 Perfect Output Contract', () => {
    describe('KZV-Style Documentation', () => {
        it('should produce structured sections with tooth/surfaces/anesthesia/cp', async () => {
            const result = await runV10({
                dictation: FULL_DICTATION,
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'lang',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                ]),
            });

            console.log('[CONTRACT] State:', result.state);

            if (result.state === 'output') {
                const fullText = result.output?.fullText ?? '';
                const sections = result.output?.sections ?? [];
                console.log('[CONTRACT] Full text:', fullText);
                console.log('[CONTRACT] Sections:', sections.map(s => s.id));

                // 1. MUST contain tooth number
                expect(fullText).toMatch(/27|Zahn\s*27/);

                // 2. MUST contain surfaces
                expect(fullText).toMatch(/MOD|mod|mesio|okkluso|distal/i);

                // 3. MUST contain anesthesia label (if detected)
                expect(fullText).toMatch(/anästhesie|infiltration|lokalanästhesie/i);

                // 4. MUST contain capping reference (if CP detected)
                expect(fullText).toMatch(/überkappung|cp/i);

                // 5. MUST have structured sections
                expect(sections.length).toBeGreaterThan(0);
                expect(sections.some(s => s.id === 'befund' || s.id === 'behandlung')).toBe(true);

                // 6. MUST NOT be generic placeholder only
                expect(fullText).not.toBe('Füllungstherapie durchgeführt.');
                expect(fullText).not.toBe('Füllung durchgeführt.');
                expect(fullText.length).toBeGreaterThan(100);

                // 7. MUST NOT contain raw booleans
                expect(fullText).not.toMatch(/\btrue\b/);
                expect(fullText).not.toMatch(/\bfalse\b/);

                // 8. Billing codes MUST be valid BillingRef IDs
                const billingCodes = result.output?.billingCodes ?? [];
                for (const code of billingCodes) {
                    expect(code).toMatch(/^(BEMA|GOZ|BEL|GOAE)_/);
                }
            }
        });

        it('should detect MKV amount from dictation and include in sections', async () => {
            const result = await runV10({
                dictation: FULL_DICTATION,
                treatmentId: 'fuellung',
                insuranceType: 'MKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                ]),
            });

            if (result.state === 'output') {
                const sections = result.output?.sections ?? [];
                const mkvContent = sections.map(s => s.content).join(' ');
                // MKV content should be present in disclosures (aufklaerung/hinweise)
                expect(mkvContent).toMatch(/120|mehrkosten|mehrkostenvereinbarung/i);
            }
        });

        it('output should NOT equal baseline-only text when facts are present', async () => {
            const result = await runV10({
                dictation: 'Zahn 36 do mit Kofferdam',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'kurz',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            console.log('[BASELINE] State:', result.state);

            if (result.state === 'output') {
                const fullText = result.output?.fullText ?? '';
                console.log('[BASELINE] Full text:', fullText);

                // Must contain tooth and surfaces
                expect(fullText).toMatch(/36/);
                expect(fullText).toMatch(/DO|OD|do/i);

                // Must NOT be only the baseline phrase
                expect(fullText).not.toBe('Füllungstherapie durchgeführt.');
            }
        });

        it('should have Hinweise section with post-op notes when LA present', async () => {
            const result = await runV10({
                dictation: 'Zahn 46 mod mit Anästhesie',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                ]),
            });

            if (result.state === 'output') {
                const sections = result.output?.sections ?? [];
                const hinweiseSection = sections.find(s => s.id === 'hinweise');

                console.log('[HINWEISE] Section:', hinweiseSection);

                expect(hinweiseSection).toBeDefined();
                expect(hinweiseSection?.content).toMatch(/Betäubung|Lokalanästhesie/i);
            }
        });
    });

    describe('No Hardcoded Billing Codes', () => {
        it('billing codes should all be BillingRef format', async () => {
            const result = await runV10({
                dictation: 'Zahn 27 mod mit Anästhesie, tief mit CP',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['fuellung_material', 'komposit'],
                    ['medical_ueberkappung_material', 'Ca(OH)₂'],
                ]),
            });

            if (result.state === 'output') {
                const billingCodes = result.output?.billingCodes ?? [];

                for (const code of billingCodes) {
                    // All billing codes must be in SYSTEM_CODE format
                    expect(code).toMatch(/^(BEMA|GOZ|BEL|GOAE|LAB)_\w+$/);
                }

                // Should have F-code, LA, and CP
                expect(billingCodes.some(c => c.startsWith('BEMA_13') || c.startsWith('GOZ_20'))).toBe(true);
                expect(billingCodes.some(c => c.includes('40') || c.includes('0090'))).toBe(true); // LA
                expect(billingCodes.some(c => c.includes('25') || c.includes('2330'))).toBe(true); // CP
            }
        });
    });
});
