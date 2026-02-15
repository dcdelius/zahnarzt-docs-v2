/**
 * Gate M49: Repro Import Roundtrip
 * 
 * Export → Import → Export produces identical bundle.
 */

import { describe, it, expect } from 'vitest';
import {
    createReproBundle,
    serializeReproBundle,
    parseReproBundle,
    createMinimalRepro,
    ReproBundleV1,
} from '../../v10/debug/reproBundle';

describe('gate-m49-repro-import-roundtrip', () => {
    const sampleBundle: Omit<ReproBundleV1, 'version' | 'createdAt'> = {
        pipelineInput: {
            dictation: 'Endo an 16 mit 3 Kanälen',
            treatmentId: 'endo',
            insuranceType: 'gkv',
            textLength: 'medium',
        },
        settings: {
            practice: { defaultWLMethod: 'elektrisch' },
            user: { defaultLAType: 'leitung' },
        },
        chipOverrides: {
            'instance-1': {
                'kofferdam': { mode: 'on' },
            },
        },
    };

    it('export produces valid JSON', () => {
        const bundle = createReproBundle(sampleBundle);
        const json = serializeReproBundle(bundle);
        expect(json).toContain('repro-v1');
        expect(json).toContain('Endo an 16');
    });

    it('import parses back correctly', () => {
        const bundle = createReproBundle(sampleBundle);
        const json = serializeReproBundle(bundle);
        const parsed = parseReproBundle(json);

        expect(parsed).not.toBeNull();
        expect(parsed!.pipelineInput.dictation).toBe('Endo an 16 mit 3 Kanälen');
        expect(parsed!.pipelineInput.treatmentId).toBe('endo');
    });

    it('roundtrip is deterministic (excluding createdAt)', () => {
        const bundle1 = createReproBundle(sampleBundle);
        const json1 = serializeReproBundle(bundle1);
        const parsed = parseReproBundle(json1)!;

        // Create new bundle with same createdAt for comparison
        const bundleForCompare = { ...parsed };
        const json2 = serializeReproBundle(bundleForCompare);

        expect(json1).toBe(json2);
    });

    it('minimal repro strips kbMeta', () => {
        const bundleWithKb = createReproBundle({
            ...sampleBundle,
            kbMeta: { treatmentKbVersion: '1.0.0' },
        });
        const minimal = createMinimalRepro(bundleWithKb);

        expect(minimal.kbMeta).toBeUndefined();
        expect(minimal.pipelineInput).toBeDefined();
    });
});
