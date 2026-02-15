import { describe, expect, it } from 'vitest';

import { composeOutput } from '@/docudent/core/billing/knowledgeBase/logic/outputComposer';
import type { ProcessingResult } from '@/docudent/core/billing/knowledgeBase/logic/treatmentEngine';
import { loadUnifiedConfig } from '@/docudent/core/billing/knowledgeBase/registry';

function pickChips(treatmentId: string, chipIds: string[]) {
    const unified = loadUnifiedConfig(treatmentId) as unknown as { chips: Array<{ id: string }> };
    const chipMap = new Map(unified.chips.map(chip => [chip.id, chip]));
    return chipIds.map(id => chipMap.get(id)).filter(Boolean) as any[];
}

describe('gate: disclosures support textLength variants', () => {
    it('renders LA hints with different text for kurz vs lang', () => {
        const engineResult: ProcessingResult = {
            billingCodes: [],
            textLines: [],
            warnings: [],
            optimierungen: [],
            billingDetails: [],
        };

        const activeChips = pickChips('fuellung', ['la_infiltr', 'fuellung_grundleistung']);

        const kurz = composeOutput(
            'fuellung',
            engineResult,
            activeChips,
            { tooth: '27', flaechen: 'MOD' },
            'GKV',
            { textLength: 'kurz', hasMKV: false, nurKasse: false }
        );

        const lang = composeOutput(
            'fuellung',
            engineResult,
            activeChips,
            { tooth: '27', flaechen: 'MOD' },
            'GKV',
            { textLength: 'lang', hasMKV: false, nurKasse: false }
        );

        const kurzHinweise = kurz.sections.find(s => s.id === 'hinweise')?.content ?? '';
        const langHinweise = lang.sections.find(s => s.id === 'hinweise')?.content ?? '';

        expect(kurzHinweise).toContain('Hinweis: erst nach Abklingen der Betäubung essen.');
        expect(langHinweise).toContain('Verletzungsgefahr');
    });

    it('renders MKV agreement with different text for kurz vs lang', () => {
        const engineResult: ProcessingResult = {
            billingCodes: [],
            textLines: [],
            warnings: [],
            optimierungen: [],
            billingDetails: [],
        };

        const activeChips = pickChips('fuellung', ['fuellung_grundleistung']);

        const kurz = composeOutput(
            'fuellung',
            engineResult,
            activeChips,
            { tooth: '27', flaechen: 'MOD' },
            'GKV',
            { textLength: 'kurz', hasMKV: true, mkvBetrag: 120, nurKasse: false }
        );

        const lang = composeOutput(
            'fuellung',
            engineResult,
            activeChips,
            { tooth: '27', flaechen: 'MOD' },
            'GKV',
            { textLength: 'lang', hasMKV: true, mkvBetrag: 120, nurKasse: false }
        );

        const kurzAufklaerung = kurz.sections.find(s => s.id === 'aufklaerung')?.content ?? '';
        const langAufklaerung = lang.sections.find(s => s.id === 'aufklaerung')?.content ?? '';

        expect(kurzAufklaerung).toContain('Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V geschlossen.');
        expect(langAufklaerung).toContain('schriftliche Mehrkostenvereinbarung');
    });
});

