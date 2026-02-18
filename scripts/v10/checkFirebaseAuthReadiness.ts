import { resolveEnvValue, resolveFirstDefined } from './shared/resolveEnv';

type FirebaseAuthCheckResult = {
    timestamp: string;
    requirements: {
        strict: boolean;
        requireAnonymous: boolean;
        requirePassword: boolean;
    };
    anonymous: {
        ok: boolean;
        message: string;
    };
    passwordAuth: {
        attempted: boolean;
        ok: boolean;
        message: string;
    };
};

function resolveFirebaseApiKey(): string | null {
    return resolveFirstDefined(['FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY']);
}

async function postJson(url: string, body: unknown): Promise<any> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return {
        ok: response.ok,
        status: response.status,
        payload,
    };
}

async function main() {
    const apiKey = resolveFirebaseApiKey();
    if (!apiKey) {
        console.error('[firebase-auth-readiness] Missing API key env (VITE_FIREBASE_API_KEY or FIREBASE_API_KEY).');
        process.exit(1);
        return;
    }

    const result: FirebaseAuthCheckResult = {
        timestamp: new Date().toISOString(),
        requirements: {
            strict: false,
            requireAnonymous: false,
            requirePassword: false,
        },
        anonymous: {
            ok: false,
            message: 'not checked',
        },
        passwordAuth: {
            attempted: false,
            ok: false,
            message: 'credentials missing',
        },
    };

    const anonUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const anon = await postJson(anonUrl, { returnSecureToken: true });
    if (anon.ok) {
        result.anonymous = {
            ok: true,
            message: 'enabled',
        };
    } else {
        const msg = String(anon.payload?.error?.message ?? `HTTP_${anon.status}`);
        result.anonymous = {
            ok: false,
            message: msg,
        };
    }

    const email = resolveEnvValue('E2E_LOGIN_EMAIL');
    const password = resolveEnvValue('E2E_LOGIN_PASSWORD');
    if (email && password) {
        result.passwordAuth.attempted = true;
        const pwUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
        const pw = await postJson(pwUrl, {
            email,
            password,
            returnSecureToken: true,
        });
        if (pw.ok && typeof pw.payload?.idToken === 'string' && pw.payload.idToken.length > 0) {
            result.passwordAuth = {
                attempted: true,
                ok: true,
                message: 'enabled',
            };
        } else {
            const msg = String(pw.payload?.error?.message ?? `HTTP_${pw.status}`);
            result.passwordAuth = {
                attempted: true,
                ok: false,
                message: msg,
            };
        }
    }

    const strict = process.env.DOCUDENT_AUTH_DIAG_STRICT === '1';
    const requireAnonymousEnv = process.env.DOCUDENT_AUTH_DIAG_REQUIRE_ANON === '1';
    const requirePasswordEnv = process.env.DOCUDENT_AUTH_DIAG_REQUIRE_PASSWORD === '1';
    const hasExplicitRequirements = requireAnonymousEnv || requirePasswordEnv;

    const requireAnonymous = strict
        ? (hasExplicitRequirements ? requireAnonymousEnv : true)
        : requireAnonymousEnv;
    const requirePassword = strict
        ? (hasExplicitRequirements ? requirePasswordEnv : true)
        : requirePasswordEnv;

    result.requirements = {
        strict,
        requireAnonymous,
        requirePassword,
    };

    console.log(JSON.stringify(result, null, 2));

    const shouldFailAnonymous = requireAnonymous && !result.anonymous.ok;
    const shouldFailPassword = requirePassword && !result.passwordAuth.ok;
    if (shouldFailAnonymous || shouldFailPassword) {
        process.exit(1);
    }
}

void main();

