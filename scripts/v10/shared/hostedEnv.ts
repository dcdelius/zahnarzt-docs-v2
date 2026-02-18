import { resolveEnvValue } from './resolveEnv';

export type HostedRunEnv = {
    baseUrl: string | null;
    loginEmail: string | null;
    loginPassword: string | null;
};

export type HostedEnvValidation = {
    ok: boolean;
    issues: string[];
};

export type HostedEnvValidationOptions = {
    requireCredentials?: boolean;
};

export function resolveHostedRunEnv(): HostedRunEnv {
    return {
        baseUrl: resolveEnvValue('PLAYWRIGHT_BASE_URL'),
        loginEmail: resolveEnvValue('E2E_LOGIN_EMAIL'),
        loginPassword: resolveEnvValue('E2E_LOGIN_PASSWORD'),
    };
}

export function validateHostedRunEnv(
    env: HostedRunEnv,
    options: HostedEnvValidationOptions = {}
): HostedEnvValidation {
    const issues: string[] = [];
    const requireCredentials = options.requireCredentials !== false;
    const baseUrl = env.baseUrl?.trim() ?? '';
    const loginEmail = env.loginEmail?.trim() ?? '';
    const loginPassword = env.loginPassword?.trim() ?? '';

    if (!baseUrl) {
        issues.push('PLAYWRIGHT_BASE_URL fehlt. Beispiel: https://app.docudent.de');
    } else if (/localhost|127\.0\.0\.1/i.test(baseUrl)) {
        issues.push(`PLAYWRIGHT_BASE_URL muss auf Hosted zeigen, nicht auf lokal: ${baseUrl}`);
    }

    if (requireCredentials && (!loginEmail || !loginPassword)) {
        issues.push('E2E_LOGIN_EMAIL und E2E_LOGIN_PASSWORD sind Pflicht.');
    }

    return {
        ok: issues.length === 0,
        issues,
    };
}
