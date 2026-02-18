import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Gate: endo must not emit filling-family GOZ codes', () => {
    it('PKV endo flow does not emit GOZ_2080/2100/2120', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 21 endodontisch eröffnet, Arbeitslänge elektronisch und radiologisch gesichert, NaOCl/EDTA-Spülung, warm vertikal obturiert, Kofferdam angelegt.',
            treatmentId: 'endo',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const codes = result.output.billingCodes.map(code => code.toUpperCase());
        expect(codes).not.toContain('GOZ_2080');
        expect(codes).not.toContain('GOZ_2100');
        expect(codes).not.toContain('GOZ_2120');
    });
});

