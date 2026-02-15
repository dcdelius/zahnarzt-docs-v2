/**
 * Gate M49: Repro Import Blocks Secrets
 * 
 * JSON with token/apiKey must be rejected.
 */

import { describe, it, expect } from 'vitest';
import { validateNoSecrets, parseReproBundle } from '../../v10/debug/reproBundle';

describe('gate-m49-repro-import-blocks-secrets', () => {
    it('rejects bundle with token key', () => {
        const bundleWithToken = {
            version: 'repro-v1',
            createdAt: '2024-01-01T00:00:00Z',
            pipelineInput: {
                dictation: 'test',
                treatmentId: 'endo',
                insuranceType: 'gkv',
            },
            settings: {
                practice: { token: 'secret123' },
            },
        };

        expect(validateNoSecrets(bundleWithToken as any)).toBe(false);
    });

    it('rejects bundle with apiKey key', () => {
        const bundleWithApiKey = {
            version: 'repro-v1',
            createdAt: '2024-01-01T00:00:00Z',
            pipelineInput: {
                dictation: 'test',
                treatmentId: 'endo',
                insuranceType: 'gkv',
            },
            settings: {
                user: { apiKey: 'sk-123' },
            },
        };

        expect(validateNoSecrets(bundleWithApiKey as any)).toBe(false);
    });

    it('rejects bundle with secret key', () => {
        const bundleWithSecret = {
            version: 'repro-v1',
            createdAt: '2024-01-01T00:00:00Z',
            pipelineInput: {
                dictation: 'test with secret in text',
                treatmentId: 'endo',
                insuranceType: 'gkv',
            },
        };

        expect(validateNoSecrets(bundleWithSecret as any)).toBe(false);
    });

    it('accepts clean bundle', () => {
        const cleanBundle = {
            version: 'repro-v1',
            createdAt: '2024-01-01T00:00:00Z',
            pipelineInput: {
                dictation: 'Endo an 16',
                treatmentId: 'endo',
                insuranceType: 'gkv',
            },
            settings: {
                practice: { defaultWL: 'elektrisch' },
            },
        };

        expect(validateNoSecrets(cleanBundle as any)).toBe(true);
    });

    it('rejects bundle with password', () => {
        const bundleWithPassword = {
            version: 'repro-v1',
            createdAt: '2024-01-01T00:00:00Z',
            pipelineInput: {
                dictation: 'test',
                treatmentId: 'endo',
                insuranceType: 'gkv',
            },
            settings: {
                user: { password: 'mypass' },
            },
        };

        expect(validateNoSecrets(bundleWithPassword as any)).toBe(false);
    });
});
