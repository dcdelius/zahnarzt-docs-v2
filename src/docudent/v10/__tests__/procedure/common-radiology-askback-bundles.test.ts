import { describe, it, expect } from 'vitest';

import { createRadiologyEvidenceAskbackBundles } from '../../procedure/events/common';

describe('createRadiologyEvidenceAskbackBundles', () => {
    it('enforces strict-only mode via contract.strictKzv', () => {
        const bundles = createRadiologyEvidenceAskbackBundles({
            idPrefix: 'test.strict',
            mode: 'strict_only',
            applies: () => true,
        });

        const indication = bundles.find(b => b.id === 'test.strict.roentgen_indikation');
        expect(indication).toBeDefined();

        const facts = { treatmentId: 'endo', radiology: {} };
        const strictOff = indication!.match(facts, { values: { strictKzv: false } });
        const strictOn = indication!.match(facts, { values: { strictKzv: true } });

        expect(strictOff).toBe(false);
        expect(strictOn).toBe(true);
    });

    it('supports custom id suffixes for always-on mode', () => {
        const bundles = createRadiologyEvidenceAskbackBundles({
            idPrefix: 'roentgen.askback',
            applies: (facts) => facts.treatmentId === 'roentgen',
            idSuffixes: {
                indication: 'indikation',
                type: 'typ',
                timing: 'zeitpunkt',
                findings: 'befund',
            },
        });

        expect(bundles.map(b => b.id)).toEqual([
            'roentgen.askback.indikation',
            'roentgen.askback.typ',
            'roentgen.askback.zeitpunkt',
            'roentgen.askback.befund',
        ]);
    });
});

