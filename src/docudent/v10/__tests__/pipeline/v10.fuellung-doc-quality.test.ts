import { describe, expect, it } from 'vitest';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Pipeline: fuellung documentation quality', () => {
    it('renders concise MKV fuellung text without redundant komposit line', async () => {
        const result = await runV10WithAutoAnswers({
            treatmentId: 'fuellung',
            dictation: 'Zahn 26 MOD mit Anästhesie war tief',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['fuellung_isolation::tooth:26', 'relativ'],
                ['fuellung_material::tooth:26', 'komposit'],
                ['medical_mkv_confirmed::tooth:26', 'mehrkosten'],
                ['medical_ueberkappung::tooth:26', 'nein'],
                ['fuellung_adhesive::tooth:26', 'yes'],
                ['fuellung_layering::tooth:26', 'yes'],
                ['fuellung_mkv_justification::tooth:26', 'mehrschicht'],
                ['mkv_betrag::tooth:26', '120'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const text = result.output.fullText;

        expect(text).toContain('LA Infiltration (Ultracain D-S, Articain 4% + Adrenalin 1:200.000).');
        expect(text).toContain('Relative Trockenlegung (Watterollen/Speichelsauger).');
        expect(text).toContain('Keine Pulpaeröffnung; Cp nicht erforderlich.');
        expect(text).toContain('Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend.');
        expect(text).not.toContain('Füllung mit lichthärtendem Komposit (komposit) durchgeführt.');
        expect(result.output.billingCodes).toContain('GOZ_2100');
    });
});
