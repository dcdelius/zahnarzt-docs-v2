#!/usr/bin/env npx tsx
/**
 * HTML Comment Import Script
 * 
 * Imports HTML comment files from local directories into structured JSON/DB.
 * 
 * Usage:
 *   npx tsx scripts/import_comment_html.ts --dir "/path/to/folder" --provider "wissing-kommentar"
 * 
 * Options:
 *   --dir        Source directory containing HTML files (required)
 *   --provider   Source provider name (default: wissing-kommentar)
 *   --dryRun     Only parse, don't write output (default: true)
 *   --writeDb    Write to database (default: false)
 *   --outJson    Write JSON output files (default: false)
 *   --maxFiles   Limit files to process (for testing)
 *   --verbose    Show detailed output
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    parseHtmlContent,
    type CommentCard,
    type CodeSystem,
} from '../src/docudent/core/billing/knowledgeBase/secondary/commentParser';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// CLI ARGS
// ═══════════════════════════════════════════════════════════════

type SystemHint = 'BEMA' | 'GOZ' | 'BEL' | undefined;

interface CliOptions {
    dir: string;
    provider: 'wissing-kommentar' | 'unknown';
    dryRun: boolean;
    writeDb: boolean;
    outJson: boolean;
    maxFiles?: number;
    verbose: boolean;
    systemHint: SystemHint;
}

function parseArgs(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {
        dir: '',
        provider: 'wissing-kommentar',
        dryRun: true,
        writeDb: false,
        outJson: false,
        verbose: false,
        systemHint: undefined,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = args[i + 1];

        switch (arg) {
            case '--dir':
                options.dir = next;
                i++;
                break;
            case '--provider':
                options.provider = next as any;
                i++;
                break;
            case '--dryRun':
                options.dryRun = next !== 'false';
                i++;
                break;
            case '--writeDb':
                options.writeDb = next === 'true';
                i++;
                break;
            case '--outJson':
                options.outJson = next === 'true';
                i++;
                break;
            case '--maxFiles':
                options.maxFiles = parseInt(next, 10);
                i++;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--systemHint':
                options.systemHint = next?.toUpperCase() as SystemHint;
                i++;
                break;
        }
    }

    return options;
}

// ═══════════════════════════════════════════════════════════════
// FILE DISCOVERY
// ═══════════════════════════════════════════════════════════════

function findHtmlFiles(dir: string, maxFiles?: number): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
        if (maxFiles && files.length >= maxFiles) return;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (maxFiles && files.length >= maxFiles) break;

            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                files.push(fullPath);
            }
        }
    }

    walk(dir);
    return files;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT REPORT
// ═══════════════════════════════════════════════════════════════

interface FileSkipped {
    file: string;
    reason: string;
}

interface FileFailed {
    file: string;
    error: string;
}

interface ImportReport {
    meta: {
        timestamp: string;
        sourceDir: string;
        provider: string;
        options: Partial<CliOptions>;
        totalDirs: number;
    };
    discovery: {
        filesDiscovered: number;
        filesProcessed: number;
        filesSkipped: FileSkipped[];
        filesFailed: FileFailed[];
    };
    summary: {
        totalFiles: number;
        successCount: number;
        errorCount: number;
        uniqueCodes: number;
        dedupeCount: number;
        bySystem: Record<CodeSystem, number>;
    };
    uniqueCodesBySystem: {
        BEL: string[];
        GOZ: string[];
        BEMA: string[];
        UNKNOWN: string[];
    };
    topCodes: Array<{ code: string; count: number }>;
    errors: Array<{ file: string; error: string }>;
    sampleEntries: CommentCard[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const options = parseArgs();

    if (!options.dir) {
        console.error('Error: --dir is required');
        console.log('Usage: npx tsx scripts/import_comment_html.ts --dir "/path/to/folder"');
        process.exit(1);
    }

    if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
    }

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║          HTML Comment Import Pipeline                      ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`Source:   ${options.dir}`);
    console.log(`Provider: ${options.provider}`);
    console.log(`DryRun:   ${options.dryRun}`);
    console.log(`WriteDB:  ${options.writeDb}`);
    console.log(`OutJSON:  ${options.outJson}`);
    if (options.maxFiles) console.log(`MaxFiles: ${options.maxFiles}`);
    console.log('');

    // Find files
    console.log('🔍 Scanning for HTML files...');
    const files = findHtmlFiles(options.dir, options.maxFiles);
    console.log(`   Found ${files.length} HTML files\n`);

    if (files.length === 0) {
        console.log('No HTML files found.');
        return;
    }

    // Process files
    const cards: CommentCard[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    const seenIds = new Set<string>();
    const codeCounts: Record<string, number> = {};
    const systemCounts: Record<CodeSystem, number> = {
        BEL: 0,
        GOZ: 0,
        BEMA: 0,
        UNKNOWN: 0,
    };
    let dedupeCount = 0;

    console.log('📝 Processing files...');
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = path.relative(options.dir, file);

        try {
            const content = fs.readFileSync(file, 'utf8');
            const result = parseHtmlContent(content, relativePath, options.provider, options.systemHint);

            if (result.success && result.card) {
                // Check for duplicates
                if (seenIds.has(result.card.id)) {
                    dedupeCount++;
                    if (options.verbose) {
                        console.log(`   [DEDUPE] ${result.card.id}`);
                    }
                } else {
                    seenIds.add(result.card.id);
                    cards.push(result.card);

                    // Update counts
                    systemCounts[result.card.system]++;
                    codeCounts[result.card.code] = (codeCounts[result.card.code] || 0) + 1;

                    if (options.verbose) {
                        console.log(`   [OK] ${result.card.code} - ${result.card.title?.slice(0, 40) || 'No title'}`);
                    }
                }
            } else {
                errors.push({ file: relativePath, error: result.error || 'Unknown error' });
                if (options.verbose) {
                    console.log(`   [ERR] ${relativePath}: ${result.error}`);
                }
            }
        } catch (err) {
            errors.push({ file: relativePath, error: String(err) });
        }

        // Progress indicator
        if (!options.verbose && (i + 1) % 20 === 0) {
            process.stdout.write(`   Processed ${i + 1}/${files.length} files\r`);
        }
    }
    console.log('');

    // Build top codes
    const topCodes = Object.entries(codeCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) // stable sort
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

    // Build unique codes by system (sorted)
    const codesBySystem: Record<CodeSystem, Set<string>> = {
        BEL: new Set(),
        GOZ: new Set(),
        BEMA: new Set(),
        UNKNOWN: new Set(),
    };
    for (const card of cards) {
        codesBySystem[card.system].add(card.code);
    }

    // Count directories
    const dirs = new Set<string>();
    for (const file of files) {
        dirs.add(path.dirname(file));
    }
    const totalDirs = dirs.size;

    // Categorize errors as skipped vs failed
    const filesSkipped: FileSkipped[] = [];
    const filesFailed: FileFailed[] = [];
    for (const err of errors) {
        if (err.error.includes('No code detected') || err.error.includes('No sections')) {
            filesSkipped.push({ file: err.file, reason: err.error });
        } else {
            filesFailed.push({ file: err.file, error: err.error });
        }
    }

    // Build report
    const report: ImportReport = {
        meta: {
            timestamp: new Date().toISOString(),
            sourceDir: options.dir,
            provider: options.provider,
            options: { dryRun: options.dryRun, writeDb: options.writeDb, outJson: options.outJson },
            totalDirs,
        },
        discovery: {
            filesDiscovered: files.length,
            filesProcessed: cards.length + dedupeCount,
            filesSkipped,
            filesFailed,
        },
        summary: {
            totalFiles: files.length,
            successCount: cards.length,
            errorCount: errors.length,
            uniqueCodes: Object.keys(codeCounts).length,
            dedupeCount,
            bySystem: systemCounts,
        },
        uniqueCodesBySystem: {
            BEL: Array.from(codesBySystem.BEL).sort(),
            GOZ: Array.from(codesBySystem.GOZ).sort(),
            BEMA: Array.from(codesBySystem.BEMA).sort(),
            UNKNOWN: Array.from(codesBySystem.UNKNOWN).sort(),
        },
        topCodes,
        errors: errors.slice(0, 50), // Show more errors in report
        sampleEntries: cards.slice(0, 3),
    };

    // Sort cards deterministically before output (by id)
    cards.sort((a, b) => a.id.localeCompare(b.id));

    // Output summary
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                    IMPORT SUMMARY                          ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`  📂 Discovery:`);
    console.log(`     Directories:      ${report.meta.totalDirs}`);
    console.log(`     Files Discovered: ${report.discovery.filesDiscovered}`);
    console.log(`     Files Processed:  ${report.discovery.filesProcessed}`);
    console.log(`     Files Skipped:    ${report.discovery.filesSkipped.length}`);
    console.log(`     Files Failed:     ${report.discovery.filesFailed.length}`);
    console.log('');
    console.log(`  📊 Results:`);
    console.log(`     Unique Cards:     ${report.summary.successCount}`);
    console.log(`     Deduplicated:     ${report.summary.dedupeCount}`);
    console.log(`     Unique Codes:     ${report.summary.uniqueCodes}`);
    console.log('');
    console.log('  🏷️  By System:');
    console.log(`     BEL:     ${report.summary.bySystem.BEL} cards (${report.uniqueCodesBySystem.BEL.length} codes)`);
    console.log(`     GOZ:     ${report.summary.bySystem.GOZ} cards (${report.uniqueCodesBySystem.GOZ.length} codes)`);
    console.log(`     BEMA:    ${report.summary.bySystem.BEMA} cards (${report.uniqueCodesBySystem.BEMA.length} codes)`);
    console.log(`     UNKNOWN: ${report.summary.bySystem.UNKNOWN} cards (${report.uniqueCodesBySystem.UNKNOWN.length} codes)`);
    console.log('');
    console.log('  🔝 Top Codes:');
    for (const { code, count } of report.topCodes.slice(0, 5)) {
        console.log(`     ${code}: ${count} entries`);
    }
    console.log('');
    if (report.uniqueCodesBySystem.BEL.length > 0) {
        console.log('  📋 All BEL Codes:');
        console.log(`     ${report.uniqueCodesBySystem.BEL.join(', ')}`);
        console.log('');
    }
    if (report.uniqueCodesBySystem.BEMA.length > 0) {
        console.log('  📋 All BEMA Codes:');
        console.log(`     ${report.uniqueCodesBySystem.BEMA.join(', ')}`);
        console.log('');
    }
    if (report.uniqueCodesBySystem.GOZ.length > 0) {
        console.log('  📋 All GOZ Codes:');
        console.log(`     ${report.uniqueCodesBySystem.GOZ.join(', ')}`);
        console.log('');
    }
    if (filesSkipped.length > 0) {
        console.log(`  ⚠️  Skipped (no code detected): ${filesSkipped.length} files`);
        for (const skip of filesSkipped.slice(0, 5)) {
            console.log(`     - ${skip.file}`);
        }
        if (filesSkipped.length > 5) {
            console.log(`     ... and ${filesSkipped.length - 5} more`);
        }
        console.log('');
    }

    // Write outputs (system-specific paths)
    if (!options.dryRun && options.outJson) {
        // Update sample entries in report with sorted cards
        report.sampleEntries = cards.slice(0, 3);

        // Determine output suffix based on systemHint
        const suffix = options.systemHint ? `_${options.systemHint.toLowerCase()}` : '';

        // Comment index
        const indexPath = path.resolve(__dirname, `../src/docudent/core/billing/knowledgeBase/secondary/commentIndex${suffix}.json`);
        fs.mkdirSync(path.dirname(indexPath), { recursive: true });
        fs.writeFileSync(indexPath, JSON.stringify({
            meta: { version: 'v1', generatedAt: new Date().toISOString(), count: cards.length, system: options.systemHint || 'mixed' },
            cards
        }, null, 2) + '\n');
        console.log(`✓ Written: ${indexPath}`);

        // Report
        const reportPath = path.resolve(__dirname, `../src/docudent/__fixtures__/comment_import_report${suffix}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
        console.log(`✓ Written: ${reportPath}`);
    } else if (options.dryRun) {
        console.log('ℹ Dry run mode - no files written. Use --dryRun false --outJson true to write output.');
    }

    // Write sample to console
    if (cards.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('SAMPLE ENTRY:');
        console.log('═══════════════════════════════════════════════════════════');
        const sample = cards.find(c =>
            c.softRules && c.softRules.length > 0 &&
            (c.tags?.includes('Mengenbegrenzung') || c.tags?.includes('Kombination'))
        ) || cards[0];
        console.log(JSON.stringify(sample, null, 2));
    }

    console.log('\n✅ Import complete!\n');
}

main().catch(console.error);
