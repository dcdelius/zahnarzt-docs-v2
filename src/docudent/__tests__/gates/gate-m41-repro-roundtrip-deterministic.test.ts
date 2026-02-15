/**
 * Gate M41: Repro Roundtrip Deterministic
 */

import { describe, it, expect } from 'vitest';
import {
    createReproBundle,
    serializeReproBundle,
    parseReproBundle,
    validateNoSecrets,
    stripTestOnlyFields,
    createMinimalRepro,
} from '../../v10/debug/reproBundle';

describe('gate-m41-repro-roundtrip-deterministic', () => {
    describe('bundle creation', () => {
        it('creates valid bundle', () => {
            const bundle = createReproBundle({
                pipelineInput: {
                    dictation: 'Füllung 36 mo',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
            });

            expect(bundle.version).toBe('repro-v1');
            expect(bundle.createdAt).toBeDefined();
            expect(bundle.pipelineInput.dictation).toBe('Füllung 36 mo');
        });
    });

    describe('serialization roundtrip', () => {
        it('serialize → parse → same data', () => {
            const original = createReproBundle({
                pipelineInput: {
                    dictation: 'Endo 14 WF',
                    treatmentId: 'endo',
                    insuranceType: 'PKV',
                },
                settings: {
                    user: { defaultLAType: 'infiltration' },
                },
            });

            const json = serializeReproBundle(original);
            const parsed = parseReproBundle(json);

            expect(parsed).not.toBeNull();
            expect(parsed?.pipelineInput.dictation).toBe(original.pipelineInput.dictation);
            expect(parsed?.settings?.user).toEqual(original.settings?.user);
        });

        it('stable stringify 100x', () => {
            const bundle = createReproBundle({
                pipelineInput: {
                    dictation: 'Test',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
            });

            const hashes = [];
            for (let i = 0; i < 100; i++) {
                hashes.push(serializeReproBundle(bundle));
            }

            const unique = new Set(hashes);
            expect(unique.size).toBe(1);
        });
    });

    describe('validation', () => {
        it('rejects invalid version', () => {
            const parsed = parseReproBundle('{"version":"invalid"}');
            expect(parsed).toBeNull();
        });

        it('rejects missing dictation', () => {
            const parsed = parseReproBundle('{"version":"repro-v1","pipelineInput":{}}');
            expect(parsed).toBeNull();
        });

        it('rejects invalid JSON', () => {
            const parsed = parseReproBundle('not json');
            expect(parsed).toBeNull();
        });
    });
});
