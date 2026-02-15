#!/usr/bin/env npx tsx
/**
 * M79 Atlas Generator — Complete File Classification
 * 
 * Produces atlas.files.jsonl with:
 * - path, category, primary_layer, purpose
 * - reachability evidence
 * - removal_risk
 * - duplication_candidates
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SRC_DOCUDENT = path.join(ROOT, 'src/docudent');
const OUTPUT_DIR = path.join(ROOT, 'docs/audit/m79');

// Load existing artifacts
const inventoryPath = path.join(ROOT, 'docs/audit/m78/inventory.files.jsonl');
const reachabilityPath = path.join(ROOT, 'docs/audit/m78/reachability.classification.jsonl');
const edgesPath = path.join(ROOT, 'docs/audit/m78/import-graph.edges.jsonl');

interface InventoryEntry {
    path: string;
    bytes: number;
    ext: string;
    is_test: boolean;
    is_json: boolean;
    category_guess: string;
}

interface ReachabilityEntry {
    path: string;
    classification: string;
    reached_from: string[];
    evidence: string;
}

interface EdgeEntry {
    from: string;
    to: string;
    type: string;
}

interface AtlasEntry {
    path: string;
    category: 'RUNTIME_REACHED' | 'TEST_ONLY' | 'DATA_ASSET' | 'LEGACY' | 'UNKNOWN';
    primary_layer: string;
    purpose: string;
    imported_by: string[];
    entrypoint_chain: string[];
    removal_risk: 'SAFE_DELETE' | 'PROBABLY_SAFE' | 'DANGEROUS';
    removal_reason: string;
    duplication_candidates: string[];
}

// Layer detection patterns
const LAYER_PATTERNS: [RegExp, string][] = [
    [/\/pages\//, 'UI'],
    [/\/components\//, 'UI'],
    [/\/hooks\//, 'Hook'],
    [/\/v7\/(?!.*v10)/, 'Shim/V7'],
    [/\/v10\/pipeline\//, 'V10 runtime'],
    [/\/v10\//, 'V10 runtime'],
    [/\/extraction\//, 'Extraction'],
    [/\/facts\//, 'Facts'],
    [/\/medical_kb\//, 'Medical KB'],
    [/\/askbacks\//, 'Askbacks'],
    [/\/output\//, 'Renderer'],
    [/\/billing\//, 'Billing'],
    [/\/combinability\//, 'Combinability'],
    [/\/settings\//, 'Settings'],
    [/\/__tests__\/|\.test\.|\.spec\./, 'Debug/QA'],
    [/\/__e2e__\//, 'Debug/QA'],
    [/\/contracts\//, 'Contracts'],
    [/\/styles\//, 'UI'],
    [/\/trace\//, 'Debug/QA'],
    [/\/packs\//, 'V10 runtime'],
    [/\/kb\//, 'V10 runtime'],
];

function detectLayer(filePath: string): string {
    for (const [pattern, layer] of LAYER_PATTERNS) {
        if (pattern.test(filePath)) return layer;
    }
    return 'Other';
}

// Purpose detection based on filename and path
function detectPurpose(filePath: string, layer: string): string {
    const basename = path.basename(filePath, path.extname(filePath));

    if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        return `Test file for ${basename.replace(/\.test|\.spec|gate-/g, '')}`;
    }
    if (filePath.includes('__fixtures__')) {
        return `Test fixture data`;
    }
    if (filePath.endsWith('.json')) {
        if (filePath.includes('unified')) return 'SSOT treatment data (KB)';
        if (filePath.includes('medical_kb')) return 'Medical knowledge base rules';
        if (filePath.includes('combinability')) return 'Combinability rules';
        if (filePath.includes('sources')) return 'Source references for KB';
        return 'JSON data asset';
    }
    if (basename === 'index') return `Barrel export for ${path.dirname(filePath).split('/').pop()}`;
    if (basename.includes('Page')) return 'React page component';
    if (basename.includes('types')) return 'TypeScript type definitions';
    if (basename.includes('schema')) return 'Schema definitions';
    if (basename.startsWith('use')) return `React hook: ${basename}`;
    if (layer === 'UI') return 'UI component';
    if (layer === 'Hook') return 'React hook';
    if (layer === 'V10 runtime') return 'V10 pipeline module';
    if (layer === 'Extraction') return 'Extraction/parsing logic';
    if (layer === 'Medical KB') return 'Medical knowledge engine';
    if (layer === 'Billing') return 'Billing calculation logic';
    return 'Utility module';
}

// Removal risk assessment
function assessRemovalRisk(
    entry: InventoryEntry,
    reachability: ReachabilityEntry | undefined,
    importedBy: string[]
): { risk: 'SAFE_DELETE' | 'PROBABLY_SAFE' | 'DANGEROUS'; reason: string } {
    // Tests are always safe to delete (from production perspective)
    if (entry.is_test || entry.path.includes('__tests__') || entry.path.includes('__e2e__')) {
        return { risk: 'SAFE_DELETE', reason: 'Test file, no production impact' };
    }

    // Fixtures are safe
    if (entry.path.includes('__fixtures__')) {
        return { risk: 'SAFE_DELETE', reason: 'Test fixture, no production impact' };
    }

    // If runtime reached with many importers, dangerous
    if (reachability?.classification === 'RUNTIME_REACHED' || importedBy.length > 3) {
        return { risk: 'DANGEROUS', reason: `Runtime reached, ${importedBy.length} importers` };
    }

    // If UNKNOWN but has importers
    if (importedBy.length > 0) {
        return { risk: 'PROBABLY_SAFE', reason: `${importedBy.length} importers but not traced to entry` };
    }

    // UNKNOWN with no importers
    if (reachability?.classification === 'UNKNOWN') {
        // Check if it's a type file (often not imported directly)
        if (entry.path.includes('types.ts') || entry.path.includes('schema')) {
            return { risk: 'PROBABLY_SAFE', reason: 'Type/schema file, may be used via re-export' };
        }
        // Legacy patterns
        if (entry.path.includes('/v6/') || entry.path.includes('/v5/') || entry.path.includes('/v4/')) {
            return { risk: 'PROBABLY_SAFE', reason: 'Legacy version, likely superseded' };
        }
        return { risk: 'PROBABLY_SAFE', reason: 'No importers found, possible dead code' };
    }

    // Legacy classification
    if (reachability?.classification === 'LEGACY') {
        return { risk: 'PROBABLY_SAFE', reason: 'Legacy code, scheduled for removal' };
    }

    // TEST_ONLY
    if (reachability?.classification === 'TEST_ONLY') {
        return { risk: 'SAFE_DELETE', reason: 'Only imported by tests' };
    }

    return { risk: 'DANGEROUS', reason: 'Could not determine risk' };
}

// Find duplication candidates by comparing basenames
function findDuplicationCandidates(filePath: string, allPaths: string[]): string[] {
    const basename = path.basename(filePath, path.extname(filePath)).toLowerCase();
    if (basename === 'index' || basename === 'types') return [];

    const candidates: string[] = [];
    for (const other of allPaths) {
        if (other === filePath) continue;
        const otherBasename = path.basename(other, path.extname(other)).toLowerCase();
        // Check for similar names (e.g., fuellung.ts vs fuellung.v1.ts)
        if (otherBasename.includes(basename) || basename.includes(otherBasename)) {
            if (Math.abs(basename.length - otherBasename.length) < 5) {
                candidates.push(other);
            }
        }
    }
    return candidates.slice(0, 5); // Limit to 5
}

async function main() {
    console.log('M79 Atlas Generator starting...');

    // Create output dir
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Load inventory
    const inventoryLines = fs.readFileSync(inventoryPath, 'utf-8').trim().split('\n');
    const inventory: InventoryEntry[] = inventoryLines.map(line => JSON.parse(line));
    console.log(`Loaded ${inventory.length} inventory entries`);

    // Load reachability
    const reachabilityLines = fs.readFileSync(reachabilityPath, 'utf-8').trim().split('\n');
    const reachabilityMap = new Map<string, ReachabilityEntry>();
    for (const line of reachabilityLines) {
        const entry: ReachabilityEntry = JSON.parse(line);
        reachabilityMap.set(entry.path, entry);
    }
    console.log(`Loaded ${reachabilityMap.size} reachability entries`);

    // Load edges and build reverse map (who imports whom)
    const edgesLines = fs.readFileSync(edgesPath, 'utf-8').trim().split('\n');
    const importedByMap = new Map<string, string[]>();
    for (const line of edgesLines) {
        const edge: EdgeEntry = JSON.parse(line);
        const existing = importedByMap.get(edge.to) || [];
        existing.push(edge.from);
        importedByMap.set(edge.to, existing);
    }
    console.log(`Built import graph with ${edgesLines.length} edges`);

    // All paths for duplication check
    const allPaths = inventory.map(e => e.path);

    // Generate atlas
    const atlas: AtlasEntry[] = [];
    for (const entry of inventory) {
        const reachability = reachabilityMap.get(entry.path);
        const importedBy = importedByMap.get(entry.path) || [];
        const layer = detectLayer(entry.path);
        const purpose = detectPurpose(entry.path, layer);
        const { risk, reason } = assessRemovalRisk(entry, reachability, importedBy);
        const duplicationCandidates = findDuplicationCandidates(entry.path, allPaths);

        // Determine category
        let category: AtlasEntry['category'];
        if (reachability) {
            category = reachability.classification as AtlasEntry['category'];
        } else if (entry.is_test) {
            category = 'TEST_ONLY';
        } else if (entry.is_json) {
            category = 'DATA_ASSET';
        } else {
            category = 'UNKNOWN';
        }

        atlas.push({
            path: entry.path,
            category,
            primary_layer: layer,
            purpose,
            imported_by: importedBy.slice(0, 10),
            entrypoint_chain: reachability?.reached_from || [],
            removal_risk: risk,
            removal_reason: reason,
            duplication_candidates: duplicationCandidates,
        });
    }

    // Write output
    const outputPath = path.join(OUTPUT_DIR, 'atlas.files.jsonl');
    const outputContent = atlas.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(outputPath, outputContent);
    console.log(`Wrote ${atlas.length} entries to ${outputPath}`);

    // Summary stats
    const byCategory = new Map<string, number>();
    const byLayer = new Map<string, number>();
    const byRisk = new Map<string, number>();
    for (const a of atlas) {
        byCategory.set(a.category, (byCategory.get(a.category) || 0) + 1);
        byLayer.set(a.primary_layer, (byLayer.get(a.primary_layer) || 0) + 1);
        byRisk.set(a.removal_risk, (byRisk.get(a.removal_risk) || 0) + 1);
    }

    console.log('\n=== CATEGORY BREAKDOWN ===');
    for (const [k, v] of byCategory) console.log(`  ${k}: ${v}`);

    console.log('\n=== LAYER BREAKDOWN ===');
    for (const [k, v] of [...byLayer.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k}: ${v}`);
    }

    console.log('\n=== REMOVAL RISK ===');
    for (const [k, v] of byRisk) console.log(`  ${k}: ${v}`);
}

main().catch(console.error);
