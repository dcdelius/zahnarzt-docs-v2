#!/usr/bin/env npx tsx
/**
 * M82 Billing Consumer Analysis
 * Finds all code that consumes billing data
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/docudent');
const OUTPUT_DIR = path.join(ROOT, 'docs/audit/m82');

interface Consumer {
    consumerPath: string;
    usesPaths: string[];
    accessType: 'import' | 'fsRead' | 'dynamic' | 'string_ref';
    evidence: string;
}

// Patterns to find billing consumers
const IMPORT_PATTERNS = [
    /from\s+['"][^'"]*billing[^'"]*['"]/g,
    /from\s+['"][^'"]*kataloge[^'"]*['"]/g,
    /from\s+['"][^'"]*regeln[^'"]*['"]/g,
    /from\s+['"][^'"]*treatments[^'"]*['"]/g,
];

const STRING_PATTERNS = [
    /['"]BEMA_\w+['"]/g,
    /['"]GOZ_\d+['"]/g,
    /['"]GOÄ_\d+['"]/g,
    /['"]BEL_\w+['"]/g,
];

function walkDir(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                files.push(...walkDir(fullPath));
            }
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

function analyzeFile(filePath: string): Consumer[] {
    const consumers: Consumer[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(ROOT, filePath);

    // Check imports
    for (const pattern of IMPORT_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            consumers.push({
                consumerPath: relativePath,
                usesPaths: [match[0]],
                accessType: 'import',
                evidence: `${relativePath}:${lineNum}`,
            });
        }
    }

    // Check string references
    for (const pattern of STRING_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            consumers.push({
                consumerPath: relativePath,
                usesPaths: [match[0]],
                accessType: 'string_ref',
                evidence: `${relativePath}:${lineNum}`,
            });
        }
    }

    return consumers;
}

async function main() {
    console.log('M82 Billing Consumer Analysis');

    const allFiles = walkDir(SRC);
    console.log(`Scanning ${allFiles.length} TypeScript files`);

    const allConsumers: Consumer[] = [];
    for (const file of allFiles) {
        const consumers = analyzeFile(file);
        allConsumers.push(...consumers);
    }

    // Dedupe by consumer path
    const byPath = new Map<string, Consumer[]>();
    for (const c of allConsumers) {
        const existing = byPath.get(c.consumerPath) || [];
        existing.push(c);
        byPath.set(c.consumerPath, existing);
    }

    // Write consumers
    const consumersPath = path.join(OUTPUT_DIR, 'billing.consumers.jsonl');
    fs.writeFileSync(consumersPath, allConsumers.map(c => JSON.stringify(c)).join('\n'));
    console.log(`Wrote ${allConsumers.length} consumer entries to ${consumersPath}`);

    // Build closure set (all billing refs found)
    const refsFound = new Set<string>();
    for (const c of allConsumers) {
        if (c.accessType === 'string_ref') {
            for (const ref of c.usesPaths) {
                const clean = ref.replace(/['"]/g, '');
                refsFound.add(clean);
            }
        }
    }

    // Load catalogs to check coverage
    const bemaPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/kataloge/bema.json');
    const gozPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/kataloge/goz.json');

    const catalogCodes = new Set<string>();
    if (fs.existsSync(bemaPath)) {
        const bema = JSON.parse(fs.readFileSync(bemaPath, 'utf-8'));
        Object.keys(bema).filter(k => k !== '_meta').forEach(k => catalogCodes.add(k));
    }
    if (fs.existsSync(gozPath)) {
        const goz = JSON.parse(fs.readFileSync(gozPath, 'utf-8'));
        Object.keys(goz).filter(k => k !== '_meta').forEach(k => catalogCodes.add(k));
    }

    // Find missing in catalog
    const missingInCatalog = [...refsFound].filter(r => !catalogCodes.has(r));

    // Find orphan catalog codes (not referenced)
    const orphanCodes = [...catalogCodes].filter(c => !refsFound.has(c)).slice(0, 20);

    const closurePath = path.join(OUTPUT_DIR, 'billing.refs.closure.json');
    fs.writeFileSync(closurePath, JSON.stringify({
        refsFound: [...refsFound],
        refsCount: refsFound.size,
        catalogCodesCount: catalogCodes.size,
        missingInCatalog,
        orphanCatalogCodes_sample: orphanCodes,
    }, null, 2));
    console.log(`Wrote closure analysis to ${closurePath}`);

    // Stats
    const stats = {
        total_consumers: allConsumers.length,
        unique_files: byPath.size,
        by_access_type: {
            import: allConsumers.filter(c => c.accessType === 'import').length,
            string_ref: allConsumers.filter(c => c.accessType === 'string_ref').length,
        },
        refs_found: refsFound.size,
        catalog_codes: catalogCodes.size,
        missing_in_catalog: missingInCatalog.length,
    };

    console.log('\n=== CONSUMER STATS ===');
    console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);
