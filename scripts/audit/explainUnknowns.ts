#!/usr/bin/env npx tsx
/**
 * M79 Unknowns Explainer — Classify UNKNOWN files with reasons
 * 
 * For each UNKNOWN file in the atlas, determine WHY it's unknown:
 * - dynamic_import: loaded via dynamic import()
 * - json_ref_only: only referenced from JSON files
 * - dead_code: no references found anywhere
 * - tool_only: only used by scripts/tools
 * - build_only: only used by build config
 * - test_misclassified: actually a test file
 * - barrel_export: exports from index but no direct imports
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const ATLAS_PATH = path.join(ROOT, 'docs/audit/m79/atlas.files.jsonl');
const OUTPUT_PATH = path.join(ROOT, 'docs/audit/m79/unknowns.explained.jsonl');

interface AtlasEntry {
    path: string;
    category: string;
    primary_layer: string;
    imported_by: string[];
    entrypoint_chain: string[];
    removal_risk: string;
}

interface ExplainedUnknown {
    path: string;
    unknown_reason: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    evidence: string;
    suggested_action: string;
}

function explainUnknown(entry: AtlasEntry): ExplainedUnknown {
    const p = entry.path;

    // Test misclassified
    if (p.includes('__tests__') || p.includes('.test.') || p.includes('.spec.') || p.includes('__e2e__')) {
        return {
            path: p,
            unknown_reason: 'test_misclassified',
            confidence: 'HIGH',
            evidence: 'Path contains test pattern',
            suggested_action: 'Reclassify as TEST_ONLY'
        };
    }

    // Fixtures
    if (p.includes('__fixtures__')) {
        return {
            path: p,
            unknown_reason: 'test_misclassified',
            confidence: 'HIGH',
            evidence: 'Path contains __fixtures__',
            suggested_action: 'Reclassify as TEST_ONLY'
        };
    }

    // JSON data files
    if (p.endsWith('.json')) {
        return {
            path: p,
            unknown_reason: 'json_ref_only',
            confidence: 'HIGH',
            evidence: 'JSON files are loaded at runtime via fs/import',
            suggested_action: 'Keep as DATA_ASSET'
        };
    }

    // Build config
    if (p.includes('vite.config') || p.includes('vitest.config') || p.includes('playwright.config')) {
        return {
            path: p,
            unknown_reason: 'build_only',
            confidence: 'HIGH',
            evidence: 'Build configuration file',
            suggested_action: 'Keep, required for build'
        };
    }

    // Scripts directory
    if (p.includes('/scripts/')) {
        return {
            path: p,
            unknown_reason: 'tool_only',
            confidence: 'HIGH',
            evidence: 'Located in scripts directory',
            suggested_action: 'Keep, CLI tool'
        };
    }

    // Index/barrel files with no importers
    if (p.endsWith('/index.ts') || p.endsWith('/index.tsx')) {
        if (entry.imported_by.length === 0) {
            return {
                path: p,
                unknown_reason: 'barrel_export',
                confidence: 'MEDIUM',
                evidence: 'Barrel export with no direct importers',
                suggested_action: 'Check if re-exported from parent index'
            };
        }
    }

    // Legacy versions (v4, v5, v6)
    if (p.includes('/v4/') || p.includes('/v5/') || p.includes('/v6/')) {
        return {
            path: p,
            unknown_reason: 'dead_code',
            confidence: 'MEDIUM',
            evidence: 'Legacy version directory',
            suggested_action: 'Consider removal after verification'
        };
    }

    // Type definition files
    if (p.includes('types.ts') || p.includes('schema.ts') || p.includes('.d.ts')) {
        return {
            path: p,
            unknown_reason: 'dynamic_import',
            confidence: 'MEDIUM',
            evidence: 'Type files may be used via re-export or declaration merging',
            suggested_action: 'Keep, types are imported via barrel'
        };
    }

    // Dynamic imports (common patterns)
    if (p.includes('/packs/') || p.includes('/kb/') || p.includes('/loader')) {
        return {
            path: p,
            unknown_reason: 'dynamic_import',
            confidence: 'MEDIUM',
            evidence: 'Pack/KB files are loaded dynamically',
            suggested_action: 'Keep, runtime dynamic import'
        };
    }

    // No clear reason - likely dead code
    if (entry.imported_by.length === 0 && entry.entrypoint_chain.length === 0) {
        return {
            path: p,
            unknown_reason: 'dead_code',
            confidence: 'LOW',
            evidence: 'No importers or entrypoint chain found',
            suggested_action: 'Manual review needed, may be safe to delete'
        };
    }

    // Has importers but not traced to entry
    return {
        path: p,
        unknown_reason: 'dynamic_import',
        confidence: 'LOW',
        evidence: `Has ${entry.imported_by.length} importers but not traced to entry`,
        suggested_action: 'Verify import chain manually'
    };
}

async function main() {
    console.log('M79 Unknowns Explainer starting...');

    const atlasLines = fs.readFileSync(ATLAS_PATH, 'utf-8').trim().split('\n');
    const atlas: AtlasEntry[] = atlasLines.map(line => JSON.parse(line));

    const unknowns = atlas.filter(e => e.category === 'UNKNOWN');
    console.log(`Found ${unknowns.length} UNKNOWN files to explain`);

    const explained: ExplainedUnknown[] = unknowns.map(explainUnknown);

    // Write output
    const output = explained.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(OUTPUT_PATH, output);
    console.log(`Wrote ${explained.length} explanations to ${OUTPUT_PATH}`);

    // Summary stats
    const byReason = new Map<string, number>();
    const byConfidence = new Map<string, number>();
    for (const e of explained) {
        byReason.set(e.unknown_reason, (byReason.get(e.unknown_reason) || 0) + 1);
        byConfidence.set(e.confidence, (byConfidence.get(e.confidence) || 0) + 1);
    }

    console.log('\n=== REASON BREAKDOWN ===');
    for (const [k, v] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k}: ${v}`);
    }

    console.log('\n=== CONFIDENCE BREAKDOWN ===');
    for (const [k, v] of byConfidence) {
        console.log(`  ${k}: ${v}`);
    }
}

main().catch(console.error);
