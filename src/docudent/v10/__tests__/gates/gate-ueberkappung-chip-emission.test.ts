/**
 * Gate Test: Überkappung Chip Emission (GP6 Fix)
 *
 * Contract: When user answers medical_ueberkappung = 'indirekt', the cp chip
 * must be emitted with correct billing (BEMA_25 / GOZ_2330).
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: Überkappung Chip Emission (GP6)', () => {
    it('GKV: Überkappung indirekt → cp chip + BEMA_25', async () => {
        const result = await runV10({
            dictation: 'Zahn 27 MOD Karies profunda Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['fuellung_isolation', 'kofferdam'],
                ['fuellung_layering', 'no'],
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'Ca(OH)₂'],
                ['fuellung_material', 'Komposit'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'profunda',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            // Check chips include 'cp'
            const perInstance = Object.values(result.output.perInstance)[0];
            expect(perInstance.chips).toContain('cp');

            // Check billing includes BEMA_25
            expect(result.output.billingCodes).toContain('BEMA_25');

            // Check text mentions Überkappung
            expect(result.output.fullText.toLowerCase()).toMatch(/überkappung|cp/i);

            console.log('✓ GKV Überkappung:', {
                chips: perInstance.chips.filter(c => c.includes('cp') || c.includes('p')),
                billing: result.output.billingCodes.filter(c => c.includes('25') || c.includes('2330')),
            });
        }
    });

    it('PKV: Überkappung indirekt → cp chip + GOZ_2330', async () => {
        const result = await runV10({
            dictation: 'Zahn 16 MOD Karies profunda Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['fuellung_isolation', 'kofferdam'],
                ['fuellung_layering', 'no'],
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
                ['fuellung_material', 'Komposit'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '16',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'profunda',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const perInstance = Object.values(result.output.perInstance)[0];
            expect(perInstance.chips).toContain('cp');
            expect(result.output.billingCodes).toContain('GOZ_2330');

            console.log('✓ PKV Überkappung:', {
                chips: perInstance.chips.filter(c => c.includes('cp') || c.includes('p')),
                billing: result.output.billingCodes.filter(c => c.includes('25') || c.includes('2330')),
            });
        }
    });

    it('MKV: Überkappung indirekt → cp chip + BEMA_25 (base service)', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MOD Karies profunda 120€ Mehrkosten',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['fuellung_isolation', 'kofferdam'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'Ca(OH)₂'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_mkv_justification', 'Ästhetik'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'profunda',
                    mehrkostenConfirmed: true,
                    mkvAmount: 120,
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const perInstance = Object.values(result.output.perInstance)[0];
            expect(perInstance.chips).toContain('cp');

            // In MKV, Cp is base service → BEMA_25 (not GOZ)
            expect(result.output.billingCodes).toContain('BEMA_25');

            console.log('✓ MKV Überkappung:', {
                chips: perInstance.chips.filter(c => c.includes('cp') || c.includes('p')),
                billing: result.output.billingCodes,
            });
        }
    });

    it('Überkappung nein bei profunda → cp_not_required chip', async () => {
        const result = await runV10({
            dictation: 'Zahn 46 MOD Karies profunda Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['fuellung_isolation', 'kofferdam'],
                ['fuellung_layering', 'no'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '46',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'profunda',
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const perInstance = Object.values(result.output.perInstance)[0];
            expect(perInstance.chips).toContain('cp_not_required');

            // No Cp billing when not performed
            expect(result.output.billingCodes).not.toContain('BEMA_25');
            expect(result.output.billingCodes).not.toContain('GOZ_2330');

            console.log('✓ Überkappung nein:', {
                chips: perInstance.chips.filter(c => c.includes('cp')),
                billing: result.output.billingCodes,
            });
        }
    });
});
