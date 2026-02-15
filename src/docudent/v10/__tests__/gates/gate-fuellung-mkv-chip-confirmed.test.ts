import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Gate: MKV chip requires confirmation', () => {
    it('emits insurance_gkv_mkv when MKV is confirmed', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mod Kompositfüllung Mehrkostenvereinbarung bestätigt',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['mkv_confirmed', 'mehrkosten'],
                ['mkv_betrag', '120'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
                ['fuellung_mkv_justification', 'Ästhetik'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mkvPresent: true,
                    mehrkostenConfirmed: true,
                    mehrkostenMentioned: true,
                    mkvJustification: 'ästhetik',
                },
            },
        });

        expect(result.state).toBe('output');
        const perInstance = Object.values(result.output?.perInstance ?? {});
        const allChips = perInstance.flatMap(instance => instance.chips);
        expect(allChips).toContain('insurance_gkv_mkv');
    });
});
