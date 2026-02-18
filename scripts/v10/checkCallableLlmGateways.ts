import { resolveFirstDefined, resolveEnvValue } from './shared/resolveEnv';

type CallableCheck = {
    name: string;
    attempted: boolean;
    ok: boolean;
    httpStatus?: number;
    message: string;
};

type CallableDiagnosticsResult = {
    timestamp: string;
    projectId: string | null;
    region: string;
    auth: {
        attempted: boolean;
        ok: boolean;
        message: string;
    };
    callables: CallableCheck[];
};

function resolveFirebaseApiKey(): string | null {
    return resolveFirstDefined(['FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY']);
}

function resolveProjectId(): string | null {
    return resolveFirstDefined(['FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID']);
}

async function postJson(url: string, body: unknown, headers?: Record<string, string>) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(headers ?? {}),
        },
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    return {
        ok: response.ok,
        status: response.status,
        payload,
    };
}

function callableUrl(projectId: string, region: string, callableName: string): string {
    return `https://${region}-${projectId}.cloudfunctions.net/${callableName}`;
}

async function callGateway(
    projectId: string,
    region: string,
    idToken: string,
    callableName: string,
    dictation: string
): Promise<CallableCheck> {
    const url = callableUrl(projectId, region, callableName);
    const response = await postJson(
        url,
        { data: { dictation } },
        { Authorization: `Bearer ${idToken}` }
    );

    if (!response.ok) {
        const errMessage = String(
            response.payload?.error?.message
            ?? response.payload?.error?.status
            ?? `HTTP_${response.status}`
        );
        return {
            name: callableName,
            attempted: true,
            ok: false,
            httpStatus: response.status,
            message: errMessage,
        };
    }

    const content = response.payload?.result?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
        return {
            name: callableName,
            attempted: true,
            ok: true,
            httpStatus: response.status,
            message: 'ok',
        };
    }

    return {
        name: callableName,
        attempted: true,
        ok: false,
        httpStatus: response.status,
        message: 'empty_result_content',
    };
}

async function main() {
    const apiKey = resolveFirebaseApiKey();
    const projectId = resolveProjectId();
    const region = process.env.FIREBASE_FUNCTIONS_REGION?.trim() || 'us-central1';
    const email = resolveEnvValue('E2E_LOGIN_EMAIL');
    const password = resolveEnvValue('E2E_LOGIN_PASSWORD');

    const result: CallableDiagnosticsResult = {
        timestamp: new Date().toISOString(),
        projectId,
        region,
        auth: {
            attempted: false,
            ok: false,
            message: 'credentials missing',
        },
        callables: [
            {
                name: 'extractFromDictationV1',
                attempted: false,
                ok: false,
                message: 'auth not available',
            },
            {
                name: 'detectTreatmentIntentsV1',
                attempted: false,
                ok: false,
                message: 'auth not available',
            },
        ],
    };

    if (!apiKey) {
        result.auth.message = 'missing_api_key';
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
        return;
    }

    if (!projectId) {
        result.auth.message = 'missing_project_id';
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
        return;
    }

    if (email && password) {
        result.auth.attempted = true;
        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
        const signIn = await postJson(signInUrl, {
            email,
            password,
            returnSecureToken: true,
        });

        if (signIn.ok && typeof signIn.payload?.idToken === 'string' && signIn.payload.idToken.length > 0) {
            const idToken = String(signIn.payload.idToken);
            result.auth.ok = true;
            result.auth.message = 'ok';

            const dictation = 'Diagnose-Test: Zahn 36 MOD Komposit unter Kofferdam, Endo-Schritt mit NaOCl dokumentiert.';
            result.callables[0] = await callGateway(projectId, region, idToken, 'extractFromDictationV1', dictation);
            result.callables[1] = await callGateway(projectId, region, idToken, 'detectTreatmentIntentsV1', dictation);
        } else {
            result.auth.ok = false;
            result.auth.message = String(signIn.payload?.error?.message ?? `HTTP_${signIn.status}`);
        }
    }

    console.log(JSON.stringify(result, null, 2));

    const strict = process.env.DOCUDENT_CALLABLE_DIAG_STRICT === '1';
    if (!strict) return;

    const allCallablesOk = result.callables.every((entry) => entry.ok);
    if (!result.auth.ok || !allCallablesOk) {
        process.exit(1);
    }
}

void main();
