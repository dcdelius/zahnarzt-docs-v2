import { describe, expect, it } from 'vitest';
import { validateHostedRunEnv } from '../../../../scripts/v10/shared/hostedEnv';

describe('gate-v10-hosted-env-validator', () => {
    it('requires hosted base url and credentials by default', () => {
        const validation = validateHostedRunEnv({
            baseUrl: '',
            loginEmail: '',
            loginPassword: '',
        });
        expect(validation.ok).toBe(false);
        expect(validation.issues).toContain('PLAYWRIGHT_BASE_URL fehlt. Beispiel: https://app.docudent.de');
        expect(validation.issues).toContain('E2E_LOGIN_EMAIL und E2E_LOGIN_PASSWORD sind Pflicht.');
    });

    it('rejects localhost base url in hosted mode', () => {
        const validation = validateHostedRunEnv({
            baseUrl: 'http://localhost:4173',
            loginEmail: 'test@example.com',
            loginPassword: 'secret',
        });
        expect(validation.ok).toBe(false);
        expect(validation.issues.join(' ')).toContain('muss auf Hosted zeigen');
    });

    it('can skip credential validation when explicitly configured', () => {
        const validation = validateHostedRunEnv(
            {
                baseUrl: 'https://app.docudent.de',
                loginEmail: '',
                loginPassword: '',
            },
            { requireCredentials: false }
        );
        expect(validation.ok).toBe(true);
        expect(validation.issues).toHaveLength(0);
    });
});
