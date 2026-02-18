import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('Gate: roentgen obligation section label formatting', () => {
    it('uses canonical section label when Befund is created from obligations', async () => {
        const result = await runV10({
            dictation: 'Zur praeoperativen Therapieplanung wurde ein OPG angefertigt; Roentgenbefund: apikale Auffaelligkeit regio 36 dokumentiert.',
            treatmentId: 'roentgen',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map(),
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.fullText).toContain('[Befund]');
        expect(result.output.fullText).not.toContain('[befund]');
    });
});
