import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import admin from 'firebase-admin';

type Args = {
    practiceId: string;
    userId: string;
    suiteFile: string;
};

function parseArgs(argv: string[]): Args {
    let practiceId = 'demo-praxis-nord-2026';
    let userId = 'dr-anna-keller';
    let suiteFile = 'scripts/v10/scenarios.v10.realworld.medical.json';

    for (const arg of argv) {
        if (arg.startsWith('--practice-id=')) {
            practiceId = arg.replace('--practice-id=', '').trim() || practiceId;
        } else if (arg.startsWith('--user-id=')) {
            userId = arg.replace('--user-id=', '').trim() || userId;
        } else if (arg.startsWith('--file=')) {
            suiteFile = arg.replace('--file=', '').trim() || suiteFile;
        }
    }

    return { practiceId, userId, suiteFile };
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

async function loadFirestoreSettings(practiceId: string, userId: string) {
    ensureAdminInitialized();
    const db = admin.firestore();

    const [practiceSnap, userSnap] = await Promise.all([
        db.doc(`Praxen/${practiceId}/Settings/v10`).get(),
        db.doc(`Praxen/${practiceId}/Benutzer/${userId}/Settings/v10`).get(),
    ]);

    if (!practiceSnap.exists) {
        throw new Error(`Missing Firestore doc: Praxen/${practiceId}/Settings/v10`);
    }
    if (!userSnap.exists) {
        throw new Error(`Missing Firestore doc: Praxen/${practiceId}/Benutzer/${userId}/Settings/v10`);
    }

    return {
        practice: practiceSnap.data() ?? {},
        user: userSnap.data() ?? {},
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const suitePath = path.isAbsolute(args.suiteFile) ? args.suiteFile : path.join(process.cwd(), args.suiteFile);
    if (!fs.existsSync(suitePath)) {
        throw new Error(`Suite file not found: ${suitePath}`);
    }

    const firestoreSettings = await loadFirestoreSettings(args.practiceId, args.userId);
    const suite = JSON.parse(fs.readFileSync(suitePath, 'utf-8')) as Record<string, unknown>;
    const suiteMeta = (suite.meta && typeof suite.meta === 'object') ? suite.meta as Record<string, unknown> : {};
    suite.meta = {
        ...suiteMeta,
        settings: firestoreSettings,
        description: `${String(suiteMeta.description ?? '')} [firestore-seeded:${args.practiceId}/${args.userId}]`.trim(),
    };

    const tempFile = path.join(
        os.tmpdir(),
        `v10-medical-suite-firestore-${args.practiceId}-${args.userId}-${Date.now()}.json`
    );
    fs.writeFileSync(tempFile, JSON.stringify(suite, null, 2), 'utf-8');

    console.log(`[v10-firestore-run] practice=${args.practiceId} user=${args.userId}`);
    console.log(`[v10-firestore-run] suite=${suitePath}`);
    console.log(`[v10-firestore-run] temp=${tempFile}`);

    const run = spawnSync(
        'node',
        ['--import', 'tsx', 'scripts/v10/runV10MedicalScenarioRun.ts', '--file', tempFile],
        { stdio: 'inherit', cwd: process.cwd() }
    );

    try {
        fs.unlinkSync(tempFile);
    } catch {
        // Best effort cleanup.
    }

    if (run.status !== 0) {
        process.exit(run.status ?? 1);
    }
}

main().catch(error => {
    console.error('[v10-firestore-run] failed:', error);
    process.exit(1);
});
