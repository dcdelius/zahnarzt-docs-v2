import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';
import { computeKbHash } from '../../src/docudent/v10/kb/util/hash';

type Args = {
    version: string | null;
    treatments: string[] | null;
    strict: boolean;
    verbose: boolean;
};

type TreatmentEntry = { id: string; filePath: string };

function parseArgs(argv: string[]): Args {
    const args: Args = { version: null, treatments: null, strict: false, verbose: false };
    for (const arg of argv) {
        if (arg.startsWith('--version=')) {
            args.version = arg.replace('--version=', '').trim();
        } else if (arg.startsWith('--treatments=')) {
            const list = arg.replace('--treatments=', '').trim();
            args.treatments = list ? list.split(',').map(v => v.trim()).filter(Boolean) : null;
        } else if (arg === '--strict') {
            args.strict = true;
        } else if (arg === '--verbose') {
            args.verbose = true;
        }
    }
    return args;
}

function ensureAdminInitialized() {
    if (admin.apps.length > 0) return;
    const servicePath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!servicePath) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS');
    }
    const raw = fs.readFileSync(servicePath, 'utf-8');
    const credential = admin.credential.cert(JSON.parse(raw));
    admin.initializeApp({ credential });
}

async function getFirestoreDocData(version: string, treatmentId: string): Promise<{ mode: 'admin' | 'client'; data: unknown | null }> {
    try {
        ensureAdminInitialized();
        const db = admin.firestore();
        const snap = await db.doc(`medical_kb/${version}/treatments/${treatmentId}`).get();
        return { mode: 'admin', data: snap.exists ? snap.data() : null };
    } catch (e) {
        // Fallback: client SDK read (requires VITE_* firebase config and security rules allowing read).
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
        const apiKey = process.env.VITE_FIREBASE_API_KEY;
        const appId = process.env.VITE_FIREBASE_APP_ID;
        const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN;

        if (!projectId || !apiKey || !appId) {
            throw new Error(
                `Firestore admin init failed (${e instanceof Error ? e.message : String(e)}), and client config is missing (need VITE_FIREBASE_PROJECT_ID/VITE_FIREBASE_API_KEY/VITE_FIREBASE_APP_ID).`
            );
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

        const ref = doc(getFirestore(app), 'medical_kb', version, 'treatments', treatmentId);
        const snap = await getDoc(ref);
        return { mode: 'client', data: snap.exists() ? snap.data() : null };
    }
}

function loadTreatmentKbFiles(rootDir: string): TreatmentEntry[] {
    const baseDir = path.join(rootDir, 'src', 'docudent', 'core', 'billing', 'knowledgeBase', 'treatments');
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const result: TreatmentEntry[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const filePath = path.join(baseDir, entry.name, 'unified.json');
        if (!fs.existsSync(filePath)) continue;
        result.push({ id: entry.name, filePath });
    }
    return result;
}

function loadLocalKb(entry: TreatmentEntry): { data: unknown; hash: string } {
    const raw = fs.readFileSync(entry.filePath, 'utf-8');
    const data = JSON.parse(raw);
    const hash = computeKbHash(data);
    return { data, hash };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const version = args.version || process.env.VITE_KB_FIRESTORE_VERSION || null;
    if (!version) {
        throw new Error('Missing version. Provide --version or VITE_KB_FIRESTORE_VERSION');
    }

    const rootDir = process.cwd();
    const allFiles = loadTreatmentKbFiles(rootDir);
    const selected = args.treatments
        ? allFiles.filter(f => args.treatments!.includes(f.id))
        : allFiles;

    if (selected.length === 0) {
        throw new Error('No treatment KB files found to check.');
    }

    const missing: string[] = [];
    const mismatched: Array<{ id: string; localHash: string; remoteHash: string }> = [];
    const matched: string[] = [];
    let modeUsed: 'admin' | 'client' | null = null;

    for (const entry of selected) {
        const local = loadLocalKb(entry);
        const remote = await getFirestoreDocData(version, entry.id);
        modeUsed = modeUsed ?? remote.mode;
        if (!remote.data) {
            missing.push(entry.id);
            console.warn(`[kb-parity] missing: ${entry.id}`);
            continue;
        }
        const remoteHash = computeKbHash(remote.data);
        if (remoteHash !== local.hash) {
            mismatched.push({ id: entry.id, localHash: local.hash, remoteHash });
            console.warn(`[kb-parity] mismatch: ${entry.id} local=${local.hash} remote=${remoteHash}`);
            continue;
        }
        matched.push(entry.id);
        if (args.verbose) {
            console.log(`[kb-parity] ok: ${entry.id} (${local.hash})`);
        }
    }

    console.log('[kb-parity] summary', {
        version,
        mode: modeUsed ?? 'unknown',
        checked: selected.length,
        matched: matched.length,
        missing: missing.length,
        mismatched: mismatched.length,
    });

    if (args.strict && (missing.length > 0 || mismatched.length > 0)) {
        process.exit(1);
    }
}

main().catch(error => {
    console.error('[kb-parity] failed:', error);
    process.exit(1);
});
