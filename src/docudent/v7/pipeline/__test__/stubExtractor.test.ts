import { describe, expect, it } from 'vitest';
import { stubExtractFromDictation } from './stubExtractor';

describe('stubExtractFromDictation', () => {
    it('does not infer phantom teeth from endo working-length values', () => {
        const dictation = 'Zahn 36. Zweiter Termin. Kein Kofferdam möglich wegen Kronenrand. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. ISO 30. Maschinell aufbereitet. NaOCl + EDTA Spülung. Einlage CaOH2.';
        const extracted = stubExtractFromDictation(dictation, 'endo');

        expect(extracted.teeth).toContain('36');
        expect(extracted.teeth).not.toContain('21');
        expect(extracted.teeth).not.toContain('20');
        expect(extracted.teeth).not.toContain('19');
    });

    it('keeps explicit tooth reference even if same number appears as canal length', () => {
        const dictation = 'Endo Zahn 21. Arbeitslängen per Apex Locator: MB 20, D 21. NaOCl Spülung.';
        const extracted = stubExtractFromDictation(dictation, 'endo');

        expect(extracted.teeth).toContain('21');
    });
});
