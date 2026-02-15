/**
 * Gate M41: Repro Does Not Include Secrets
 */

import { describe, it, expect } from 'vitest';
import {
    createReproBundle,
    validateNoSecrets,
    stripTestOnlyFields,
    ReproBundleV1,
} from '../../v10/debug/reproBundle';

describe('gate-m41-repro-does-not-include-secrets', () => {
    describe('validateNoSecrets', () => {
        it('valid bundle passes', () => {
            const bundle = createReproBundle({
                pipelineInput: {
                    dictation: 'Füllung 36',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
            });

            expect(validateNoSecrets(bundle)).toBe(true);
        });

        it('rejects bundle with token', () => {
            const bundle = {
                version: 'repro-v1' as const,
                createdAt: new Date().toISOString(),
                pipelineInput: {
                    dictation: 'Test',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
                settings: {
                    user: { token: 'secret123' },
                },
            };

            expect(validateNoSecrets(bundle as ReproBundleV1)).toBe(false);
        });

        it('rejects bundle with apiKey', () => {
            const bundle = {
                version: 'repro-v1' as const,
                createdAt: new Date().toISOString(),
                pipelineInput: {
                    dictation: 'Test',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
                settings: {
                    practice: { apiKey: 'key123' },
                },
            };

            expect(validateNoSecrets(bundle as ReproBundleV1)).toBe(false);
        });
    });

    describe('stripTestOnlyFields', () => {
        it('removes testOnly flag', () => {
            const bundle = createReproBundle({
                pipelineInput: {
                    dictation: 'Test',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                },
                testOnly: true,
            });

            const stripped = stripTestOnlyFields(bundle);

            expect(stripped.testOnly).toBeUndefined();
            expect(stripped.pipelineInput.dictation).toBe('Test');
        });
    });
});
