#!/usr/bin/env npx tsx
/**
 * M82 Billing Inventory Generator
 * Scans all billing data sources and produces inventory artifacts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src/docudent');
const OUTPUT_DIR = path.join(ROOT, 'docs/audit/m82');

interface InventoryEntry {
    path: string;
    kind: 'catalog' | 'rules' | 'mapping' | 'treatment' | 'logic' | 'test' | 'other';
    size_bytes: number;
    sha256: string;
    format: 'json' | 'ts' | 'html' | 'other';
    domain: ('bema' | 'goz' | 'goae' | 'bel' | 'fz' | 'combinability' | 'treatment' | 'other')[];
    notes: string;
}

// Directories to scan
const BILLING_PATHS = [
    'src/docudent/core/billing',
    'src/docudent/BEMA',
    'src/docudent/GOZ',
    'src/docudent/BEL',
    'src/docudent/Analogleistungen',
];

function sha256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function detectDomain(filePath: string, content?: string): string[] {
    const domains: string[] = [];
    const lower = filePath.toLowerCase();
    const c = content?.toLowerCase() || '';

    if (lower.includes('bema') || c.includes('"system": "bema"')) domains.push('bema');
    if (lower.includes('goz') || c.includes('"system": "goz"')) domains.push('goz');
    if (lower.includes('goae') || lower.includes('goa.') || lower.includes('goä') || c.includes('"system": "goä"')) domains.push('goae');
    if (lower.includes('bel') || c.includes('"system": "bel"')) domains.push('bel');
    if (lower.includes('festzusch') || lower.includes('fz_')) domains.push('fz');
    if (lower.includes('kombina') || lower.includes('combinab')) domains.push('combinability');
    if (lower.includes('/treatments/') || lower.includes('unified.json')) domains.push('treatment');

    if (domains.length === 0) domains.push('other');
    return domains;
}

function detectKind(filePath: string): InventoryEntry['kind'] {
    const lower = filePath.toLowerCase();
    if (lower.includes('/kataloge/')) return 'catalog';
    if (lower.includes('/regeln/') || lower.includes('_regeln')) return 'rules';
    if (lower.includes('/mapping') || lower.includes('_map.json')) return 'mapping';
    if (lower.includes('/treatments/')) return 'treatment';
    if (lower.includes('/logic/')) return 'logic';
    if (lower.includes('.test.') || lower.includes('__tests__')) return 'test';
    return 'other';
}

function detectFormat(filePath: string): InventoryEntry['format'] {
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'ts';
    if (filePath.endsWith('.html')) return 'html';
    return 'other';
}

function walkDir(dir: string, files: string[] = []): string[] {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, files);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

async function main() {
    console.log('M82 Billing Inventory Generator');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const inventory: InventoryEntry[] = [];
    const stats = {
        total_files: 0,
        by_kind: {} as Record<string, number>,
        by_format: {} as Record<string, number>,
        by_domain: {} as Record<string, number>,
        total_bytes: 0,
    };

    // Collect all files
    const allFiles: string[] = [];
    for (const basePath of BILLING_PATHS) {
        const fullPath = path.join(ROOT, basePath);
        walkDir(fullPath, allFiles);
    }

    console.log(`Found ${allFiles.length} files in billing paths`);

    for (const filePath of allFiles) {
        const relativePath = path.relative(ROOT, filePath);
        const stat = fs.statSync(filePath);

        let content = '';
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            // Binary or unreadable
        }

        const kind = detectKind(relativePath);
        const format = detectFormat(relativePath);
        const domains = detectDomain(relativePath, content);

        let notes = '';
        if (format === 'json' && content) {
            try {
                const parsed = JSON.parse(content);
                if (parsed._meta) notes = `version: ${parsed._meta.version || 'unknown'}`;
                else if (Array.isArray(parsed)) notes = `array: ${parsed.length} items`;
                else notes = `keys: ${Object.keys(parsed).slice(0, 5).join(', ')}...`;
            } catch {
                notes = 'invalid JSON';
            }
        }

        const entry: InventoryEntry = {
            path: relativePath,
            kind,
            size_bytes: stat.size,
            sha256: sha256(content),
            format,
            domain: domains as InventoryEntry['domain'],
            notes,
        };

        inventory.push(entry);

        // Stats
        stats.total_files++;
        stats.total_bytes += stat.size;
        stats.by_kind[kind] = (stats.by_kind[kind] || 0) + 1;
        stats.by_format[format] = (stats.by_format[format] || 0) + 1;
        for (const d of domains) {
            stats.by_domain[d] = (stats.by_domain[d] || 0) + 1;
        }
    }

    // Write inventory
    const inventoryPath = path.join(OUTPUT_DIR, 'billing.inventory.jsonl');
    fs.writeFileSync(inventoryPath, inventory.map(e => JSON.stringify(e)).join('\n'));
    console.log(`Wrote ${inventory.length} entries to ${inventoryPath}`);

    // Write stats
    const statsPath = path.join(OUTPUT_DIR, 'billing.stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Wrote stats to ${statsPath}`);

    // Generate schema samples
    const schemaSamples: Record<string, any> = {};

    // Sample BEMA
    const bemaPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/kataloge/bema.json');
    if (fs.existsSync(bemaPath)) {
        const bema = JSON.parse(fs.readFileSync(bemaPath, 'utf-8'));
        const firstEntry = Object.entries(bema).find(([k]) => k !== '_meta');
        schemaSamples['bema_catalog'] = {
            _meta: bema._meta,
            sample_entry: firstEntry ? firstEntry[1] : null,
            keys: firstEntry ? Object.keys(firstEntry[1] as object) : [],
        };
    }

    // Sample GOZ
    const gozPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/kataloge/goz.json');
    if (fs.existsSync(gozPath)) {
        const goz = JSON.parse(fs.readFileSync(gozPath, 'utf-8'));
        const firstEntry = Object.entries(goz).find(([k]) => k !== '_meta');
        schemaSamples['goz_catalog'] = {
            _meta: goz._meta,
            sample_entry: firstEntry ? firstEntry[1] : null,
        };
    }

    // Sample unified.json
    const unifiedPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json');
    if (fs.existsSync(unifiedPath)) {
        const unified = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
        schemaSamples['treatment_unified'] = {
            top_keys: Object.keys(unified),
            chips_sample: unified.chips ? Object.keys(unified.chips).slice(0, 5) : [],
        };
    }

    // Sample kombinationen
    const kombPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json');
    if (fs.existsSync(kombPath)) {
        const komb = JSON.parse(fs.readFileSync(kombPath, 'utf-8'));
        schemaSamples['kombinationen_rules'] = {
            top_keys: Object.keys(komb),
            sample_rule: komb.exclusions?.[0] || komb.rules?.[0] || null,
        };
    }

    const schemaPath = path.join(OUTPUT_DIR, 'billing.schema_samples.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schemaSamples, null, 2));
    console.log(`Wrote schema samples to ${schemaPath}`);

    console.log('\n=== STATS ===');
    console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);
