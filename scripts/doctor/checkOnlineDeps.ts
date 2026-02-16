import 'dotenv/config';

import fs from 'node:fs';
import process from 'node:process';
import admin from 'firebase-admin';

type CheckResult = { ok: boolean; details: Record<string, unknown> };

function readEnv(name: string): string | null {
    const raw = process.env[name];
    if (!raw) return null;
    const cleaned = raw.replace(/^['"]|['"]$/g, '').trim();
    return cleaned.length > 0 ? cleaned : null;
}

function parseArgs(argv: string[]) {
    const args = { skipOpenAI: false, skipFirestore: false, verbose: false };
    for (const arg of argv) {
        if (arg === '--skip-openai') args.skipOpenAI = true;
        if (arg === '--skip-firestore') args.skipFirestore = true;
        if (arg === '--verbose') args.verbose = true;
    }
    return args;
}

async function checkOpenAI(): Promise<CheckResult> {
    let derivedFromVite = false;
    let serverKey = readEnv('OPENAI_API_KEY');
    if (!serverKey) {
        const viteKey = readEnv('VITE_OPENAI_API_KEY');
        if (viteKey) {
            process.env.OPENAI_API_KEY = viteKey;
            serverKey = viteKey;
            derivedFromVite = true;
        }
    }
    const browserKey = readEnv('VITE_OPENAI_API_KEY') ?? readEnv('REACT_APP_OPENAI_API_KEY');
    if (!serverKey) {
        return {
            ok: false,
            details: {
                reason: 'missing_openai_api_key',
                env: ['OPENAI_API_KEY'],
            },
        };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
        }),
    });

    return {
        ok: res.ok,
        details: {
            status: res.status,
            statusText: res.statusText,
            keySource: 'OPENAI_API_KEY',
            serverKeyDerivedFromVite: derivedFromVite,
            browserKeyPresent: Boolean(browserKey),
            browserKeyMatchesServerKey: browserKey ? browserKey === serverKey : null,
        },
    };
}

function ensureAdminInitialized(): { ok: boolean; servicePath?: string; error?: string } {
    try {
        if (admin.apps.length > 0) return { ok: true };
        const servicePath = readEnv('FIREBASE_SERVICE_ACCOUNT') ?? readEnv('GOOGLE_APPLICATION_CREDENTIALS');
        if (!servicePath) {
            return { ok: false, error: 'Missing FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS' };
        }
        if (!fs.existsSync(servicePath)) {
            return { ok: false, servicePath, error: `Service account file not found: ${servicePath}` };
        }
        const raw = fs.readFileSync(servicePath, 'utf-8');
        const credential = admin.credential.cert(JSON.parse(raw));
        admin.initializeApp({ credential });
        return { ok: true, servicePath };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

async function checkFirestoreViaClient(): Promise<CheckResult> {
    const projectId = readEnv('VITE_FIREBASE_PROJECT_ID');
    const apiKey = readEnv('VITE_FIREBASE_API_KEY');
    const appId = readEnv('VITE_FIREBASE_APP_ID');
    const authDomain = readEnv('VITE_FIREBASE_AUTH_DOMAIN');

    if (!projectId || !apiKey || !appId) {
        return {
            ok: false,
            details: {
                reason: 'missing_vite_firebase_config',
                env: ['VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_AUTH_DOMAIN'],
            },
        };
    }

    const { initializeApp, getApps } = await import('firebase/app');
    const { doc, getDoc, getFirestore } = await import('firebase/firestore');

    const app =
        getApps().length > 0
            ? getApps()[0]!
            : initializeApp({
                  projectId,
                  apiKey,
                  appId,
                  ...(authDomain ? { authDomain } : {}),
              });

    const version = readEnv('VITE_KB_FIRESTORE_VERSION') ?? 'UNKNOWN';
    const treatmentId = 'fuellung';
    const ref = doc(getFirestore(app), 'medical_kb', version, 'treatments', treatmentId);

    try {
        const snap = await getDoc(ref);
        return {
            ok: snap.exists(),
            details: {
                mode: 'client',
                version,
                docPath: `medical_kb/${version}/treatments/${treatmentId}`,
                exists: snap.exists(),
            },
        };
    } catch (e) {
        return {
            ok: false,
            details: {
                mode: 'client',
                version,
                docPath: `medical_kb/${version}/treatments/${treatmentId}`,
                reason: 'client_read_failed',
                error: e instanceof Error ? e.message : String(e),
            },
        };
    }
}

async function checkFirestore(): Promise<CheckResult> {
    const init = ensureAdminInitialized();
    if (!init.ok) {
        // Fallback: try Firestore via Firebase client SDK using VITE_* config.
        // This does NOT prove admin access; it only proves network reachability + security rules allow read.
        const client = await checkFirestoreViaClient();
        return {
            ok: client.ok,
            details: {
                reason: 'admin_init_failed',
                ...init,
                fallback: client.details,
            },
        };
    }

    const version = readEnv('VITE_KB_FIRESTORE_VERSION') ?? 'UNKNOWN';
    const db = admin.firestore();
    const treatmentId = 'fuellung';
    const docPath = `medical_kb/${version}/treatments/${treatmentId}`;
    const snap = await db.doc(docPath).get();

    return {
        ok: snap.exists,
        details: {
            mode: 'admin',
            version,
            docPath,
            exists: snap.exists,
        },
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const envSummary = {
        OPENAI_API_KEY: Boolean(readEnv('OPENAI_API_KEY')),
        VITE_OPENAI_API_KEY: Boolean(readEnv('VITE_OPENAI_API_KEY')),
        REACT_APP_OPENAI_API_KEY: Boolean(readEnv('REACT_APP_OPENAI_API_KEY')),
        VITE_FIREBASE_PROJECT_ID: Boolean(readEnv('VITE_FIREBASE_PROJECT_ID')),
        VITE_FIREBASE_API_KEY: Boolean(readEnv('VITE_FIREBASE_API_KEY')),
        VITE_FIREBASE_APP_ID: Boolean(readEnv('VITE_FIREBASE_APP_ID')),
        VITE_KB_FIRESTORE_VERSION: readEnv('VITE_KB_FIRESTORE_VERSION') ?? null,
        FIREBASE_SERVICE_ACCOUNT: Boolean(readEnv('FIREBASE_SERVICE_ACCOUNT') ?? readEnv('GOOGLE_APPLICATION_CREDENTIALS')),
    };

    console.log('[doctor:online] env', envSummary);

    const results: Record<string, CheckResult> = {};

    if (!args.skipOpenAI) {
        results.openai = await checkOpenAI();
        console.log('[doctor:online] openai', results.openai);
    }

    if (!args.skipFirestore) {
        results.firestore = await checkFirestore();
        console.log('[doctor:online] firestore', results.firestore);
    }

    const failed = Object.entries(results).filter(([, r]) => r.ok === false);
    if (failed.length > 0) {
        console.error('[doctor:online] FAILED', failed.map(([k]) => k));
        process.exit(1);
    }

    if (args.verbose) {
        console.log('[doctor:online] OK');
    }
}

main().catch((e) => {
    console.error('[doctor:online] ERROR', e);
    process.exit(1);
});
