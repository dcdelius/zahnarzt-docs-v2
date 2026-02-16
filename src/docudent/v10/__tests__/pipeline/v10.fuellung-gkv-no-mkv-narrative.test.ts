import { describe, expect, it } from 'vitest';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Pipeline: fuellung GKV narrative guard', () => {
    it('does not render Mehrschicht/MKV text in pure GKV mode', async () => {
        const result = await runV10WithAutoAnswers({
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            dictation: 'Zahn 36 MOD Kompositfüllung, Kontaktpunkt und Okklusion kontrolliert.',
            answers: new Map<string, unknown>([
                ['fuellung_isolation::tooth:36', 'kofferdam'],
                ['fuellung_material::tooth:36', 'komposit'],
                ['medical_ueberkappung::tooth:36', 'nein'],
                ['fuellung_adhesive::tooth:36', 'yes'],
                ['fuellung_layering::tooth:36', 'yes'],
            ]),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const text = result.output.fullText.toLowerCase();
        expect(text).not.toContain('mehrkosten');
        expect(text).not.toContain('mehrschichttechnik');
        expect(result.output.billingCodes.some(code => code.startsWith('GOZ_'))).toBe(false);
    });
});
