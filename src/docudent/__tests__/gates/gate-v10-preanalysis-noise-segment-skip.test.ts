import { describe, expect, it } from 'vitest';
import { detectTreatmentIntents } from '../../v10/preanalysis/detectTreatmentIntents';

describe('Gate: V10 preanalysis skips low-signal noise segments', () => {
    it('does not emit extra intents for non-treatment follow-up clauses', async () => {
        const dictation = 'Füllung Zahn 36 okklusal mit Komposit, danach Bisskontrolle durchgeführt und Verlauf reizlos.';
        const result = await detectTreatmentIntents(dictation, { forceFallback: true });

        const keys = result.bundle.intents.map(intent => `${intent.treatmentId}::${intent.tooth ?? 'unknown'}`);
        expect(keys).toEqual(['fuellung::36']);
        expect(result.diagnostics).toContain('segment-skipped-no-treatment-signal:2');
    });
});
