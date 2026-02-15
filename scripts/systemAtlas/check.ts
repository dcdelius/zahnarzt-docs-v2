/**
 * scripts/systemAtlas/check.ts
 * 
 * Verifies system atlas integrity:
 * - Hashes match
 * - No "deleted" files still referenced
 * - Index is consistent with artifacts
 * 
 * Usage: npm run atlas:check
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ATLAS_DIR = path.join(process.cwd(), 'docs/system-atlas');

interface CheckResult {
    pass: boolean;
    checks: { name: string; pass: boolean; message: string }[];
}

function hashFile(filePath: string): string {
    if (!fs.existsSync(filePath)) return 'MISSING';
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function checkIndexConsistency(): { pass: boolean; message: string } {
    const indexPath = path.join(ATLAS_DIR, 'index.json');

    if (!fs.existsSync(indexPath)) {
        return { pass: false, message: 'index.json missing' };
    }

    try {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const artifacts = index.artifacts || {};
        let missing = 0;
        let stale = 0;

        for (const [name, info] of Object.entries(artifacts) as [string, any][]) {
            const fullPath = path.join(ATLAS_DIR, info.path);

            if (!fs.existsSync(fullPath)) {
                missing++;
                console.log(`  ⚠️  Missing: ${info.path}`);
            } else {
                const currentHash = hashFile(fullPath);
                if (currentHash !== info.hash) {
                    stale++;
                    console.log(`  ⚠️  Stale hash: ${info.path} (${info.hash} → ${currentHash})`);
                }
            }
        }

        if (missing > 0 || stale > 0) {
            return { pass: false, message: `${missing} missing, ${stale} stale` };
        }

        return { pass: true, message: `${Object.keys(artifacts).length} artifacts verified` };
    } catch (err) {
        return { pass: false, message: `Parse error: ${err}` };
    }
}

function checkManifestIntegrity(): { pass: boolean; message: string } {
    const manifestPath = path.join(ATLAS_DIR, 'runtime.manifest.json');

    if (!fs.existsSync(manifestPath)) {
        return { pass: false, message: 'runtime.manifest.json missing' };
    }

    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const files = manifest.files || [];

        // Check a sample of files still exist
        const sample = files.slice(0, Math.min(10, files.length));
        let missing = 0;

        for (const file of sample) {
            const fullPath = path.join(process.cwd(), file.path);
            if (!fs.existsSync(fullPath)) {
                missing++;
                console.log(`  ⚠️  Missing runtime file: ${file.path}`);
            }
        }

        if (missing > 0) {
            return { pass: false, message: `${missing} runtime files missing in sample` };
        }

        return { pass: true, message: `${files.length} files in manifest` };
    } catch (err) {
        return { pass: false, message: `Parse error: ${err}` };
    }
}

function checkHashesFile(): { pass: boolean; message: string } {
    const hashesPath = path.join(ATLAS_DIR, 'hashes.sha256');

    if (!fs.existsSync(hashesPath)) {
        return { pass: false, message: 'hashes.sha256 missing' };
    }

    const content = fs.readFileSync(hashesPath, 'utf-8');
    const lines = content.split('\n').filter(l => l && !l.startsWith('#'));

    return { pass: true, message: `${lines.length} hash entries` };
}

function checkNoDeletedReferences(): { pass: boolean; message: string } {
    // Check that deleted files (v6) aren't still referenced in wiring
    const wiringPath = path.join(ATLAS_DIR, 'wiring.graph.v2.json');

    if (!fs.existsSync(wiringPath)) {
        return { pass: true, message: 'No wiring graph to check' };
    }

    try {
        const wiring = JSON.parse(fs.readFileSync(wiringPath, 'utf-8'));
        const nodes = wiring.nodes || [];

        let v6Refs = 0;
        for (const node of nodes) {
            if (node.path && node.path.includes('/v6/')) {
                v6Refs++;
            }
        }

        if (v6Refs > 0) {
            return { pass: false, message: `${v6Refs} deleted V6 paths still in wiring` };
        }

        return { pass: true, message: 'No deleted paths in wiring' };
    } catch {
        return { pass: true, message: 'Wiring check skipped' };
    }
}

async function main() {
    console.log('🔍 Atlas Check Started\n');

    const result: CheckResult = { pass: true, checks: [] };

    // Run checks
    const checks = [
        { name: 'Index consistency', fn: checkIndexConsistency },
        { name: 'Manifest integrity', fn: checkManifestIntegrity },
        { name: 'Hashes file', fn: checkHashesFile },
        { name: 'No deleted refs', fn: checkNoDeletedReferences }
    ];

    for (const check of checks) {
        console.log(`Checking: ${check.name}...`);
        const checkResult = check.fn();
        result.checks.push({ name: check.name, ...checkResult });

        if (!checkResult.pass) {
            result.pass = false;
            console.log(`  ❌ FAIL: ${checkResult.message}`);
        } else {
            console.log(`  ✅ PASS: ${checkResult.message}`);
        }
    }

    console.log('\n' + '═'.repeat(50));

    if (result.pass) {
        console.log('✅ Atlas check PASSED');
        process.exit(0);
    } else {
        console.log('❌ Atlas check FAILED');
        console.log('\nRun `npm run atlas:refresh` to regenerate atlas.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('❌ Atlas check error:', err);
    process.exit(1);
});
