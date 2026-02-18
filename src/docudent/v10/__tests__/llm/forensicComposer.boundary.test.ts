import { describe, expect, it } from 'vitest';
import {
    composeForensicDocumentation,
    isForensicCompositionSafe,
} from '../../llm/forensicComposer';

describe('forensicComposer boundary', () => {
    const originalSections = [
        {
            id: 'befund',
            label: 'Befund',
            content: 'Zahn 36 klopfdolent, Sensibilitaet negativ.',
        },
        {
            id: 'behandlung',
            label: 'Behandlung',
            content: 'Trepanation und Spuelung mit NaOCl an Zahn 36 erfolgt.',
        },
    ];

    it('rejects composition with billing tokens', () => {
        const candidate = [
            {
                id: 'befund',
                label: 'Befund',
                content: 'Zahn 36 klopfdolent. GOZ 2400.',
            },
            {
                id: 'behandlung',
                label: 'Behandlung',
                content: 'Trepanation erfolgt.',
            },
        ];
        expect(isForensicCompositionSafe(originalSections, candidate)).toBe(false);
    });

    it('rejects composition with changed numeric clinical facts', () => {
        const candidate = [
            {
                id: 'befund',
                label: 'Befund',
                content: 'Zahn 26 klopfdolent, Sensibilitaet negativ.',
            },
            {
                id: 'behandlung',
                label: 'Behandlung',
                content: 'Trepanation und Spuelung mit NaOCl an Zahn 26 erfolgt.',
            },
        ];
        expect(isForensicCompositionSafe(originalSections, candidate)).toBe(false);
    });

    it('rejects composition with changed section order', () => {
        const candidate = [
            {
                id: 'behandlung',
                label: 'Behandlung',
                content: 'Trepanation und Spuelung mit NaOCl an Zahn 36 erfolgt.',
            },
            {
                id: 'befund',
                label: 'Befund',
                content: 'Zahn 36 klopfdolent, Sensibilitaet negativ.',
            },
        ];
        expect(isForensicCompositionSafe(originalSections, candidate)).toBe(false);
    });

    it('accepts grammar-only composition preserving facts', () => {
        const candidate = [
            {
                id: 'befund',
                label: 'Befund',
                content: 'Zahn 36 ist klopfdolent, die Sensibilitaet ist negativ.',
            },
            {
                id: 'behandlung',
                label: 'Behandlung',
                content: 'An Zahn 36 erfolgten Trepanation und Spuelung mit NaOCl.',
            },
        ];
        expect(isForensicCompositionSafe(originalSections, candidate)).toBe(true);
    });

    it('returns null in test mode (composer disabled)', async () => {
        const output = await composeForensicDocumentation({
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'kurz',
            sections: originalSections,
        });
        expect(output).toBeNull();
    });
});
