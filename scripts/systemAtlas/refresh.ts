/**
 * scripts/systemAtlas/refresh.ts
 * 
 * Regenerates docs/system-atlas artifacts:
 * - runtime.manifest.json (all runtime files)
 * - index.json (artifact catalog)
 * - hashes.sha256 (integrity verification)
 * - CHANGELOG.md (append-only log)
 * 
 * Usage: npm run atlas:refresh
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ATLAS_DIR = path.join(process.cwd(), 'docs/system-atlas');
const AUDIT_DIR = path.join(process.cwd(), 'docs/audit');
const SRC_DIR = path.join(process.cwd(), 'src/docudent');

interface RuntimeFile {
    path: string;
    type: 'runtime' | 'test' | 'fixture' | 'data';
    size: number;
    hash: string;
}

interface AtlasIndex {
    version: string;
    generatedAt: string;
    gitHash: string;
    runtimeFileCount: number;
    artifactCount: number;
    artifacts: Record<string, { path: string; size: number; hash: string }>;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getGitHash(): string {
    try {
        const { execSync } = require('child_process');
        return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
        return 'unknown';
    }
}

function hashFile(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function getFileType(filePath: string): RuntimeFile['type'] {
    if (filePath.includes('__tests__') || filePath.includes('.test.')) return 'test';
    if (filePath.includes('__fixtures__') || filePath.includes('fixtures')) return 'fixture';
    if (filePath.endsWith('.json') && !filePath.includes('package')) return 'data';
    return 'runtime';
}

function walkDir(dir: string, extensions: string[]): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            files.push(...walkDir(fullPath, extensions));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

// ═══════════════════════════════════════════════════════════════
// MAIN REFRESH LOGIC
// ═══════════════════════════════════════════════════════════════

function generateRuntimeManifest(): RuntimeFile[] {
    console.log('📦 Generating runtime manifest...');

    const runtimeFiles = walkDir(SRC_DIR, ['.ts', '.tsx', '.json']);
    const manifest: RuntimeFile[] = [];

    for (const filePath of runtimeFiles) {
        const relativePath = path.relative(process.cwd(), filePath);
        const stats = fs.statSync(filePath);

        manifest.push({
            path: relativePath,
            type: getFileType(filePath),
            size: stats.size,
            hash: hashFile(filePath)
        });
    }

    // Sort for determinism
    manifest.sort((a, b) => a.path.localeCompare(b.path));

    console.log(`   Found ${manifest.length} files`);
    return manifest;
}

function generateIndex(manifest: RuntimeFile[]): AtlasIndex {
    console.log('📋 Generating index...');

    const artifactsDir = path.join(ATLAS_DIR, 'artifacts');
    const artifacts: AtlasIndex['artifacts'] = {};

    // Collect artifacts from artifacts dir
    if (fs.existsSync(artifactsDir)) {
        const artifactFiles = walkDir(artifactsDir, ['.json', '.md', '.jsonl']);
        for (const file of artifactFiles) {
            const relativePath = path.relative(ATLAS_DIR, file);
            const stats = fs.statSync(file);
            artifacts[relativePath] = {
                path: relativePath,
                size: stats.size,
                hash: hashFile(file)
            };
        }
    }

    // Add top-level atlas files
    const topLevelFiles = fs.readdirSync(ATLAS_DIR)
        .filter(f => f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.jsonl'))
        .filter(f => f !== 'index.json'); // Don't include self

    for (const file of topLevelFiles) {
        const fullPath = path.join(ATLAS_DIR, file);
        const stats = fs.statSync(fullPath);
        artifacts[file] = {
            path: file,
            size: stats.size,
            hash: hashFile(fullPath)
        };
    }

    const index: AtlasIndex = {
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        gitHash: getGitHash(),
        runtimeFileCount: manifest.filter(f => f.type === 'runtime').length,
        artifactCount: Object.keys(artifacts).length,
        artifacts
    };

    console.log(`   Found ${index.artifactCount} artifacts`);
    return index;
}

function generateHashes(manifest: RuntimeFile[], index: AtlasIndex): string {
    console.log('🔐 Generating hashes...');

    const lines: string[] = [
        `# SHA256 Hashes - Generated ${new Date().toISOString()}`,
        `# Git: ${index.gitHash}`,
        ''
    ];

    // Add key atlas files
    const keyFiles = [
        'runtime.manifest.json',
        'index.json',
        'wiring.graph.v2.json',
        'critical_path.json'
    ];

    for (const file of keyFiles) {
        const fullPath = path.join(ATLAS_DIR, file);
        if (fs.existsSync(fullPath)) {
            lines.push(`${hashFile(fullPath)}  ${file}`);
        }
    }

    lines.push('');
    lines.push('# Runtime summary');
    lines.push(`${manifest.length}  total_files`);
    lines.push(`${manifest.filter(f => f.type === 'runtime').length}  runtime_files`);
    lines.push(`${manifest.filter(f => f.type === 'test').length}  test_files`);

    return lines.join('\n');
}

function appendChangelog(summary: string): void {
    const changelogPath = path.join(ATLAS_DIR, 'CHANGELOG.md');
    const timestamp = new Date().toISOString().split('T')[0];
    const gitHash = getGitHash();

    const entry = `\n## ${timestamp} (${gitHash})\n\n${summary}\n`;

    if (fs.existsSync(changelogPath)) {
        const existing = fs.readFileSync(changelogPath, 'utf-8');
        fs.writeFileSync(changelogPath, existing + entry);
    } else {
        const header = `# System Atlas Changelog\n\nAppend-only log of atlas updates.\n${entry}`;
        fs.writeFileSync(changelogPath, header);
    }

    console.log('📝 Updated CHANGELOG.md');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('🔄 Atlas Refresh Started\n');

    const startTime = Date.now();

    // 1. Generate runtime manifest FIRST
    const manifest = generateRuntimeManifest();
    fs.writeFileSync(
        path.join(ATLAS_DIR, 'runtime.manifest.json'),
        JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2)
    );

    // 2. Append changelog BEFORE generating index (so index contains correct CHANGELOG hash)
    const summary = `- Runtime files: ${manifest.filter(f => f.type === 'runtime').length}\n- Test files: ${manifest.filter(f => f.type === 'test').length}\n- Artifacts: TBD`;
    appendChangelog(summary);

    // 3. Generate index AFTER changelog (so CHANGELOG hash is current)
    const index = generateIndex(manifest);
    fs.writeFileSync(
        path.join(ATLAS_DIR, 'index.json'),
        JSON.stringify(index, null, 2)
    );

    // 4. Generate hashes LAST
    const hashes = generateHashes(manifest, index);
    fs.writeFileSync(path.join(ATLAS_DIR, 'hashes.sha256'), hashes);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Atlas refresh complete in ${elapsed}s`);
    console.log(`   Runtime: ${manifest.filter(f => f.type === 'runtime').length} files`);
    console.log(`   Tests: ${manifest.filter(f => f.type === 'test').length} files`);
    console.log(`   Artifacts: ${index.artifactCount}`);
}

main().catch(err => {
    console.error('❌ Atlas refresh failed:', err);
    process.exit(1);
});
