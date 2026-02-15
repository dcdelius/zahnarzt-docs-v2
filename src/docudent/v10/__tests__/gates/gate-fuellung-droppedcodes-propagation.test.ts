/**
 * Gate Test: DroppedCodes Propagation (GP8)
 *
 * Contract: When combinability drops a code via autoResolve,
 * that code must be absent from:
 *   - output.billingCodes
 *   - perInstance.billingRefs
 *   - output.fullText (Abrechnung section)
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: DroppedCodes Propagation (GP8)', () => {
    it('GOZ_2197 dropped by combinability → absent everywhere', async () => {
        // This scenario triggers GOZ_2197 (mehrschicht) which conflicts with GOZ_2100
        const result = await runV10({
            dictation: 'Zahn 16 MOD Komposit Mehrkosten 120€ Adhäsivtechnik',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['mkv_confirmed', 'mehrkosten'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_mkv_justification', 'Adhäsivtechnik/Mehrschichttechnik'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '16',
                    surfaces: ['m', 'o', 'd'],
                    mehrkostenConfirmed: true,
                    mkvAmount: 120,
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const droppedCodes = result.meta.combinability?.droppedCodes ?? [];

        // For each dropped code, verify complete absence
        for (const droppedCode of droppedCodes) {
            // 1. Not in final billingCodes
            expect(result.output.billingCodes).not.toContain(droppedCode);

            // 2. Not in any perInstance.billingRefs
            for (const [, instance] of Object.entries(result.output.perInstance)) {
                expect(instance.billingRefs).not.toContain(droppedCode);
            }

            // 3. Not mentioned in Abrechnung section
            const abrechnungSection = result.output.sections.find(s => s.id === 'abrechnung');
            if (abrechnungSection) {
                const codeNumber = droppedCode.replace(/^(GOZ|BEMA)_/, '');
                expect(abrechnungSection.content).not.toContain(`• ${codeNumber}`);
            }
        }
    });

    it('Dropped codes are tracked in meta.combinability.droppedCodes', async () => {
        const result = await runV10({
            dictation: 'Zahn 27 MOD Komposit 150€ Mehrschicht',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['mkv_confirmed', 'mehrkosten'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_mkv_justification', 'Mehrschichttechnik'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['medical_vipr', 'positiv'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '27',
                    surfaces: ['m', 'o', 'd'],
                    mehrkostenConfirmed: true,
                    mkvAmount: 150,
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        // Check meta structure
        expect(result.meta.combinability).toBeDefined();
        expect(result.meta.combinability?.verdict).toBeDefined();

        // If GOZ_2197 was dropped, it should be in droppedCodes
        const has2197InDropped = result.meta.combinability?.droppedCodes?.includes('GOZ_2197') ?? false;
        const has2197InFinal = result.output.billingCodes.includes('GOZ_2197');

        // Mutual exclusion: if dropped, not in final; if in final, not dropped
        expect(has2197InDropped && has2197InFinal).toBe(false);
    });

    it('No drop scenario: all codes present in billingCodes and text', async () => {
        // Simple GKV case with no combinability conflicts
        const result = await runV10({
            dictation: 'Zahn 36 OD Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
                ['medical_vipr', 'positiv'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['o', 'd'],
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        // No codes should be dropped in simple GKV case
        const droppedCodes = result.meta.combinability?.droppedCodes ?? [];
        expect(droppedCodes.length).toBe(0);

        // All billingCodes should have representation in Abrechnung section
        const abrechnungSection = result.output.sections.find(s => s.id === 'abrechnung');
        expect(abrechnungSection).toBeDefined();

        for (const code of result.output.billingCodes) {
            const codeNumber = code.replace(/^(GOZ|BEMA)_/, '');
            expect(abrechnungSection?.content).toContain(codeNumber);
        }
    });
});
