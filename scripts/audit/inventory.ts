#!/usr/bin/env npx ts-node
/**
 * M77 Audit: File Inventory Generator
 * Generates docs/audit/m77/inventory.files.jsonl
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(process.cwd(), 'src/docudent');
const OUTPUT_PATH = path.join(process.cwd(), 'docs/audit/m77/inventory.files.jsonl');

interface FileEntry {
    path: string;
    bytes: number;
    ext: string;
    is_test: boolean;
    is_json: boolean;
    category_guess: string;
}

function guessCategory(filePath: string): string {
    if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        return 'TEST';
    }
    if (filePath.includes('__fixtures__') || filePath.includes('__e2e__')) {
        return 'FIXTURE';
    }
    if (filePath.includes('__archive__')) {
        return 'ARCHIVE';
    }
    if (filePath.endsWith('.json')) {
        if (filePath.includes('unified.json') || filePath.includes('question_bank.json')) {
            return 'KB_DATA';
        }
        if (filePath.includes('medical_kb')) {
            return 'MEDICAL_KB';
        }
        return 'DATA';
    }
    if (filePath.includes('/v6/')) return 'V6_LEGACY';
    if (filePath.includes('/v7/')) return 'V7_RUNTIME';
    if (filePath.includes('/v8/')) return 'V8_RUNTIME';
    if (filePath.includes('/v10/')) return 'V10_RUNTIME';
    if (filePath.includes('/core/')) return 'CORE';
    if (filePath.includes('/medical_kb/')) return 'MEDICAL_KB';
    if (filePath.includes('/contracts/')) return 'CONTRACTS';
    return 'OTHER';
}

function walkDir(dir: string, files: FileEntry[] = []): FileEntry[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                walkDir(fullPath, files);
            }
        } else if (entry.isFile()) {
            const stat = fs.statSync(fullPath);
            const ext = path.extname(entry.name);

            files.push({
                path: relativePath,
                bytes: stat.size,
                ext,
                is_test: relativePath.includes('.test.') || relativePath.includes('.spec.') || relativePath.includes('__tests__'),
                is_json: ext === '.json',
                category_guess: guessCategory(relativePath),
            });
        }
    }

    return files;
}

function main() {
    console.log(`[inventory] Scanning ${SRC_ROOT}...`);

    const files = walkDir(SRC_ROOT);

    // Write JSONL
    const lines = files.map(f => JSON.stringify(f)).join('\n');
    fs.writeFileSync(OUTPUT_PATH, lines + '\n');

    // Stats
    const stats = {
        total_files: files.length,
        ts_tsx: files.filter(f => f.ext === '.ts' || f.ext === '.tsx').length,
        json: files.filter(f => f.is_json).length,
        tests: files.filter(f => f.is_test).length,
        by_category: {} as Record<string, number>,
    };

    for (const f of files) {
        stats.by_category[f.category_guess] = (stats.by_category[f.category_guess] || 0) + 1;
    }

    console.log(`[inventory] Written ${files.length} files to ${OUTPUT_PATH}`);
    console.log(`[inventory] Stats:`, JSON.stringify(stats, null, 2));
}

main();
