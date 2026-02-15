import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

type Args = {
    version: string | null;
    treatments: string[] | null;
    dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
    const args: Args = { version: null, treatments: null, dryRun: false };
    for (const arg of argv) {
        if (arg.startsWith('--version=')) {
            args.version = arg.replace('--version=', '').trim();
        } else if (arg.startsWith('--treatments=')) {
            const list = arg.replace('--treatments=', '').trim();
            args.treatments = list ? list.split(',').map(v => v.trim()).filter(Boolean) : null;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
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

function loadTreatmentKbFiles(rootDir: string): Array<{ id: string; filePath: string }> {
    const baseDir = path.join(rootDir, 'src', 'docudent', 'core', 'billing', 'knowledgeBase', 'treatments');
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const result: Array<{ id: string; filePath: string }> = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const filePath = path.join(baseDir, entry.name, 'unified.json');
        if (!fs.existsSync(filePath)) continue;
        result.push({ id: entry.name, filePath });
    }
    return result;
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
        throw new Error('No treatment KB files found to seed.');
    }

    ensureAdminInitialized();
    const db = admin.firestore();
    const batch = db.batch();

    for (const entry of selected) {
        const raw = fs.readFileSync(entry.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (!data?._meta?.id) {
            throw new Error(`Missing _meta.id in ${entry.filePath}`);
        }
        const treatmentId = String(data._meta.id);
        if (treatmentId !== entry.id) {
            throw new Error(`Treatment id mismatch: folder=${entry.id}, _meta.id=${treatmentId}`);
        }
        const ref = db.doc(`medical_kb/${version}/treatments/${treatmentId}`);
        if (!args.dryRun) {
            batch.set(ref, data);
        }
        console.log(`[seed] ${treatmentId} -> medical_kb/${version}/treatments/${treatmentId}`);
    }

    if (args.dryRun) {
        console.log('[seed] Dry run complete. No writes performed.');
        return;
    }

    await batch.commit();
    console.log(`[seed] Seeded ${selected.length} treatment KB docs for version ${version}.`);
}

main().catch(error => {
    console.error('[seed] Failed:', error);
    process.exit(1);
});
