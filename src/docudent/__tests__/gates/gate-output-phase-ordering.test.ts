import { describe, expect, it } from 'vitest';

import { composeOutput } from '@/docudent/core/billing/knowledgeBase/logic/outputComposer';
import type { ProcessingResult } from '@/docudent/core/billing/knowledgeBase/logic/treatmentEngine';
import { loadUnifiedConfig } from '@/docudent/core/billing/knowledgeBase/registry';

function pickChips(treatmentId: string, chipIds: string[]) {
    const unified = loadUnifiedConfig(treatmentId) as unknown as { chips: Array<{ id: string }> };
    const chipMap = new Map(unified.chips.map(chip => [chip.id, chip]));
    return chipIds.map(id => chipMap.get(id)).filter(Boolean) as any[];
}

describe('gate: output composer respects phase order', () => {
    it('fuellung: "vorbereitung" chips render before "fuellung" (and "finishing" after)', () => {
        const engineResult: ProcessingResult = {
            billingCodes: [],
            textLines: [],
            warnings: [],
            optimierungen: [],
            billingDetails: [],
        };

        // Deliberately shuffled input order (mimics emitter ordering chaos)
        const activeChips = pickChips('fuellung', [
            'insurance_gkv_mkv',
            'fuellung_grundleistung',
            'finishing',
            'fuellung_material_komposit',
            'fuellung_material_matrix',
            'kofferdam',
            'fuellung_material_keil',
            'mehrschicht',
            'mkv_begruendung',
        ]);

        const output = composeOutput(
            'fuellung',
            engineResult,
            activeChips,
            { tooth: '14' },
            'GKV',
            { textLength: 'mittel', hasMKV: true, mkvBetrag: 150, nurKasse: false }
        );

        const behandlung = output.sections.find(s => s.id === 'behandlung');
        expect(behandlung, 'behandlung section should exist').toBeTruthy();

        const usedChipIds = (behandlung?.evidenceRefs ?? [])
            .filter(ref => ref.type === 'chip')
            .map(ref => ref.id);

        const idx = (id: string) => usedChipIds.indexOf(id);

        expect(idx('kofferdam')).toBeGreaterThanOrEqual(0);
        expect(idx('fuellung_material_matrix')).toBeGreaterThanOrEqual(0);
        expect(idx('fuellung_material_keil')).toBeGreaterThanOrEqual(0);
        expect(idx('fuellung_grundleistung')).toBeGreaterThanOrEqual(0);
        expect(idx('fuellung_material_komposit')).toBeGreaterThanOrEqual(0);
        expect(idx('finishing')).toBeGreaterThanOrEqual(0);
        expect(idx('insurance_gkv_mkv')).toBeGreaterThanOrEqual(0);

        // Vorbereitung before Füllung
        expect(idx('kofferdam')).toBeLessThan(idx('fuellung_grundleistung'));
        expect(idx('fuellung_material_matrix')).toBeLessThan(idx('fuellung_material_komposit'));
        expect(idx('fuellung_material_keil')).toBeLessThan(idx('fuellung_material_komposit'));

        // Finishing after operative steps
        expect(idx('finishing')).toBeGreaterThan(idx('fuellung_material_komposit'));

        // Contract/info at the end of the workflow
        expect(idx('insurance_gkv_mkv')).toBeGreaterThan(idx('finishing'));
    });
});

