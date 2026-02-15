#!/usr/bin/env npx tsx
/**
 * HTML Comment Discovery Script
 * 
 * Discovers and analyzes HTML comment files in a directory without full import.
 * Produces a discovery report with file counts, code samples, and structure analysis.
 * 
 * Usage:
 *   npx tsx scripts/discover_comment_html.ts --dir "/path/to/folder"
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DiscoveryOptions {
    dir: string;
    sampleCount: number;
    verbose: boolean;
}

interface FileSample {
    filePath: string;
    folder: string;
    sizeBytes: number;
    detectedSystem: 'BEMA' | 'GOZ' | 'BEL' | 'UNKNOWN';
    detectedCode: string | null;
    detectionMethod: string;
    titleCandidate: string | null;
}

interface DiscoveryReport {
    meta: {
        timestamp: string;
        sourceDir: string;
        discoveryVersion: string;
    };
    counts: {
        totalDirs: number;
        totalHtmlFiles: number;
        filesByDepth: Record<number, number>;
        filesByFolder: Record<string, number>;
    };
    samples: FileSample[];
    codeDetectionSummary: {
        bema: number;
        goz: number;
        bel: number;
        unknown: number;
    };
}

// ═══════════════════════════════════════════════════════════════
// CODE DETECTION (Enhanced for BEMA HTML)
// ═══════════════════════════════════════════════════════════════

// BEMA patterns for HTML format
const BEMA_TITLE_PATTERN_A = /Ä\s*1\b/;  // "Ä 1" (Beratung)
const BEMA_TITLE_PATTERN_B = /^(\d{1,3})\s+(?=[A-ZÄÖÜ])/m;  // "01 Eingehende" or "13 Präparation"
const BEMA_TITLE_PATTERN_C = /(?:BEMA-?Nr\.?\s*)?(\d{1,3}\s*[a-d]?)(?:\s+|\b)/i;  // "13a" or "91a"
const BEMA_TITLE_PATTERN_D = /\b(IP\s*\d+|FU\s*\d+|Ä\s*\d+)\b/i;  // "IP 1", "FU1", "Ä 1"

// BEL patterns
const BEL_LNR_PATTERN = /L-Nr\.?\s*(\d{3,4})/i;
const BEL_CODE_PATTERN = /(\d{3})\s+(\d)\s+/;  // "001 0" format

// GOZ patterns
const GOZ_PATTERN = /\bGOZ[-_\s]?(\d{4})\b/i;

interface DetectionResult {
    system: 'BEMA' | 'GOZ' | 'BEL' | 'UNKNOWN';
    code: string | null;
    method: string;
}

function detectSystemAndCode(text: string, filePath: string): DetectionResult {
    // Check folder hint first
    const folder = path.dirname(filePath).split('/').pop() || '';
    const isBemaFolder = ['KCH', 'KBR', 'PAR', 'KFO', 'ZE', 'IP:FU'].includes(folder) ||
        filePath.includes('/BEMA/');
    const isBelFolder = filePath.includes('/BEL/');

    // Try GOZ first (most specific)
    const gozMatch = text.match(GOZ_PATTERN);
    if (gozMatch) {
        return { system: 'GOZ', code: `GOZ_${gozMatch[1]}`, method: 'GOZ_PATTERN' };
    }

    // Try BEL patterns
    const belLnr = text.match(BEL_LNR_PATTERN);
    if (belLnr) {
        return { system: 'BEL', code: `BEL_${belLnr[1].padStart(4, '0')}`, method: 'BEL_LNR' };
    }

    // Check BEL code pattern (001 0 format) - only if in BEL folder
    if (isBelFolder) {
        const belCode = text.match(BEL_CODE_PATTERN);
        if (belCode) {
            const code = `BEL_${belCode[1]}${belCode[2]}`;
            return { system: 'BEL', code, method: 'BEL_CODE' };
        }
    }

    // Try BEMA patterns (especially for BEMA folder)
    if (isBemaFolder) {
        // Pattern D: IP/FU/Ä codes
        const bemaD = text.match(BEMA_TITLE_PATTERN_D);
        if (bemaD) {
            const code = `BEMA_${bemaD[1].replace(/\s+/g, '')}`;
            return { system: 'BEMA', code, method: 'BEMA_SPECIAL' };
        }

        // Pattern A: Ä 1
        if (BEMA_TITLE_PATTERN_A.test(text)) {
            return { system: 'BEMA', code: 'BEMA_Ä1', method: 'BEMA_Ä1' };
        }

        // Pattern C: "13a" or "91 a"
        const bemaC = text.match(BEMA_TITLE_PATTERN_C);
        if (bemaC) {
            const rawCode = bemaC[1].replace(/\s+/g, '');
            if (rawCode.match(/^\d{1,3}[a-d]?$/)) {
                return { system: 'BEMA', code: `BEMA_${rawCode}`, method: 'BEMA_NR' };
            }
        }

        // Pattern B: "01 Eingehende" at line start
        const bemaB = text.match(BEMA_TITLE_PATTERN_B);
        if (bemaB) {
            return { system: 'BEMA', code: `BEMA_${bemaB[1]}`, method: 'BEMA_TITLE' };
        }
    }

    // Fallback: assume system from folder
    if (isBemaFolder) {
        return { system: 'BEMA', code: null, method: 'FOLDER_HINT_ONLY' };
    }
    if (isBelFolder) {
        return { system: 'BEL', code: null, method: 'FOLDER_HINT_ONLY' };
    }

    return { system: 'UNKNOWN', code: null, method: 'NONE' };
}

function extractTitleCandidate(content: string): string | null {
    // Look for xaver-titel class
    const titleMatch = content.match(/class="[^"]*xaver-titel[^"]*"[^>]*>([^<]+)</);
    if (titleMatch) {
        return titleMatch[1].trim().slice(0, 100);
    }

    // Look for topub txt field in JSON
    const topubMatch = content.match(/"txt":"([^"]{10,100})"/);
    if (topubMatch) {
        try {
            return decodeURIComponent(topubMatch[1]).slice(0, 100);
        } catch {
            return topubMatch[1].slice(0, 100);
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// FILE DISCOVERY
// ═══════════════════════════════════════════════════════════════

function findHtmlFilesWithDepth(dir: string, baseDir: string): Array<{ path: string; depth: number; folder: string }> {
    const files: Array<{ path: string; depth: number; folder: string }> = [];

    function walk(currentDir: string, depth: number) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath, depth + 1);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                const relPath = path.relative(baseDir, currentDir);
                const folder = relPath.split('/')[0] || '.';
                files.push({ path: fullPath, depth, folder });
            }
        }
    }

    walk(dir, 0);
    return files;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

function parseArgs(): DiscoveryOptions {
    const args = process.argv.slice(2);
    const options: DiscoveryOptions = {
        dir: '',
        sampleCount: 10,
        verbose: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = args[i + 1];
        switch (arg) {
            case '--dir':
                options.dir = next;
                i++;
                break;
            case '--samples':
                options.sampleCount = parseInt(next, 10);
                i++;
                break;
            case '--verbose':
                options.verbose = true;
                break;
        }
    }

    return options;
}

async function main() {
    const options = parseArgs();

    if (!options.dir) {
        console.error('Error: --dir is required');
        console.log('Usage: npx tsx scripts/discover_comment_html.ts --dir "/path/to/folder"');
        process.exit(1);
    }

    if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
    }

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║          HTML Comment Discovery                            ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`Source: ${options.dir}`);
    console.log(`Sample count: ${options.sampleCount}\n`);

    // Find all HTML files with depth info
    console.log('🔍 Scanning for HTML files...');
    const allFiles = findHtmlFilesWithDepth(options.dir, options.dir);
    console.log(`   Found ${allFiles.length} HTML files\n`);

    // Count directories
    const dirs = new Set<string>();
    allFiles.forEach(f => dirs.add(path.dirname(f.path)));
    const totalDirs = dirs.size;

    // Count by depth
    const filesByDepth: Record<number, number> = {};
    allFiles.forEach(f => {
        filesByDepth[f.depth] = (filesByDepth[f.depth] || 0) + 1;
    });

    // Count by folder
    const filesByFolder: Record<string, number> = {};
    allFiles.forEach(f => {
        filesByFolder[f.folder] = (filesByFolder[f.folder] || 0) + 1;
    });

    // Select samples evenly distributed across folders
    const folders = Object.keys(filesByFolder).sort();
    const samplesPerFolder = Math.max(1, Math.floor(options.sampleCount / folders.length));
    const samples: FileSample[] = [];
    const detectionSummary = { bema: 0, goz: 0, bel: 0, unknown: 0 };

    for (const folder of folders) {
        const folderFiles = allFiles.filter(f => f.folder === folder);
        const selectedFiles = folderFiles.slice(0, samplesPerFolder);

        for (const file of selectedFiles) {
            if (samples.length >= options.sampleCount) break;

            try {
                const content = fs.readFileSync(file.path, 'utf8');
                const stats = fs.statSync(file.path);
                const detection = detectSystemAndCode(content, file.path);
                const title = extractTitleCandidate(content);

                samples.push({
                    filePath: path.relative(options.dir, file.path),
                    folder: file.folder,
                    sizeBytes: stats.size,
                    detectedSystem: detection.system,
                    detectedCode: detection.code,
                    detectionMethod: detection.method,
                    titleCandidate: title,
                });

                // Update summary
                switch (detection.system) {
                    case 'BEMA': detectionSummary.bema++; break;
                    case 'GOZ': detectionSummary.goz++; break;
                    case 'BEL': detectionSummary.bel++; break;
                    default: detectionSummary.unknown++; break;
                }

                if (options.verbose) {
                    console.log(`   [${detection.system}] ${detection.code || 'NO_CODE'} - ${title?.slice(0, 40) || 'No title'}`);
                }
            } catch (err) {
                console.error(`   [ERROR] ${file.path}: ${err}`);
            }
        }
    }

    // Build report
    const report: DiscoveryReport = {
        meta: {
            timestamp: new Date().toISOString(),
            sourceDir: options.dir,
            discoveryVersion: 'v1',
        },
        counts: {
            totalDirs,
            totalHtmlFiles: allFiles.length,
            filesByDepth,
            filesByFolder,
        },
        samples,
        codeDetectionSummary: detectionSummary,
    };

    // Output summary
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                    DISCOVERY SUMMARY                       ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`  📂 Directories:   ${totalDirs}`);
    console.log(`  📄 HTML Files:    ${allFiles.length}`);
    console.log('');
    console.log('  📊 Files by Folder:');
    for (const [folder, count] of Object.entries(filesByFolder).sort((a, b) => b[1] - a[1])) {
        console.log(`     ${folder}: ${count}`);
    }
    console.log('');
    console.log('  🔍 Code Detection (from samples):');
    console.log(`     BEMA:    ${detectionSummary.bema}`);
    console.log(`     GOZ:     ${detectionSummary.goz}`);
    console.log(`     BEL:     ${detectionSummary.bel}`);
    console.log(`     UNKNOWN: ${detectionSummary.unknown}`);
    console.log('');

    // Write report
    const reportPath = path.resolve(__dirname, '../src/docudent/__fixtures__/bema_comment_discovery_report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`✓ Written: ${reportPath}`);

    console.log('\n✅ Discovery complete!\n');
}

main().catch(console.error);
