import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Gate: output text section formatting is forensically readable', () => {
    it('fullText uses explicit section headers and paragraph separators', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MOD Karies profunda. Leitungsanästhesie, Kofferdam, Komposit adhäsiv in Mehrschichttechnik, Überkappung indirekt mit MTA.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const text = result.output.fullText;
        expect(text.length).toBeGreaterThan(80);

        const headerMatches = text.match(/\[[^\]\n]+\]\n/g) ?? [];
        expect(headerMatches.length).toBeGreaterThanOrEqual(3);

        const sectionHeaderCount = (text.match(/\[[^\]\n]+\]/g) ?? []).length;
        const paragraphSeparatorCount = (text.match(/\n\n/g) ?? []).length;
        expect(paragraphSeparatorCount).toBeGreaterThanOrEqual(Math.max(1, sectionHeaderCount - 1));

        expect(text).not.toMatch(/\b(BEFUND|AUFKLÄRUNG|BEHANDLUNG|LEISTUNGEN|HINWEISE)Zahn/i);
        expect(text).not.toMatch(/\b(BEFUND|AUFKLÄRUNG|BEHANDLUNG|LEISTUNGEN|HINWEISE)Der\b/i);
        expect(text).not.toMatch(/\b(BEFUND|AUFKLÄRUNG|BEHANDLUNG|LEISTUNGEN|HINWEISE)Zunächst\b/i);
    });
});
