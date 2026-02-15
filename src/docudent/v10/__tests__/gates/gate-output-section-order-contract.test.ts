import { describe, expect, it } from 'vitest';

import { composeOutput } from '../../../core/billing/knowledgeBase/logic/outputComposer';
import { loadUnifiedConfig } from '../../../core/billing/knowledgeBase/registry';
import type { ProcessingResult } from '../../../core/billing/knowledgeBase/logic/treatmentEngine';

const TREATMENTS = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'] as const;
const ORDER = ['befund', 'aufklaerung', 'behandlung', 'leistungen', 'hinweise', 'abrechnung'] as const;

function buildEngineResult(): ProcessingResult {
    return {
        billingCodes: ['BEMA_13'],
        textLines: [],
        warnings: [],
        optimierungen: [],
        billingDetails: [{ code: 'BEMA_13', bezeichnung: 'Testcode' }],
    };
}

function assertCanonicalOrder(sectionIds: string[], context: string) {
    const present = ORDER.filter(id => sectionIds.includes(id));
    for (let i = 0; i < present.length - 1; i += 1) {
        const current = present[i];
        const next = present[i + 1];
        expect(
            sectionIds.indexOf(current),
            `${context}: ${current} must be before ${next}`
        ).toBeLessThan(sectionIds.indexOf(next));
    }
}

describe('gate: canonical output section order', () => {
    it('composer keeps Befund -> Aufklaerung -> Behandlung -> Leistungen -> Hinweise -> Abrechnung', () => {
        for (const treatmentId of TREATMENTS) {
            const unified = loadUnifiedConfig(treatmentId) as { chips?: Array<{ id: string }> };
            const activeChips = (unified.chips ?? []).slice(0, 24) as any[];

            const output = composeOutput(
                treatmentId,
                buildEngineResult(),
                activeChips,
                { tooth: '26', surfaces: 'MOD', diagnose: 'Caries profunda' },
                'GKV',
                { textLength: 'mittel', hasMKV: false, nurKasse: false }
            );

            const ids = output.sections.map(section => section.id);
            assertCanonicalOrder(ids, treatmentId);

            const hinweiseIdx = ids.indexOf('hinweise');
            const abrechnungIdx = ids.indexOf('abrechnung');
            if (hinweiseIdx >= 0 && abrechnungIdx >= 0) {
                expect(hinweiseIdx, `${treatmentId}: hinweise must be before abrechnung`).toBeLessThan(abrechnungIdx);
            }
        }
    });
});
