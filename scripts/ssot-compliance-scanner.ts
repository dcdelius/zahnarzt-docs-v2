#!/usr/bin/env node
/**
 * SSOT Compliance Scanner
 * 
 * Scans the codebase for hardcoded billing codes that violate SSOT principles.
 * 
 * ALLOWED: Tests, fixtures, documentation, JSON data files
 * FORBIDDEN: Services, UI components, hooks (production code paths)
 * 
 * Run: npx ts-node scripts/ssot-compliance-scanner.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ROOT_DIR = path.resolve(__dirname, '..');

// Patterns that indicate hardcoded billing codes
const FORBIDDEN_PATTERNS = [
    /BEMA_\d+/g,                    // BEMA_12, BEMA_13c
    /GOZ_\d+/g,                     // GOZ_2197
    /BEL_[A-Z0-9]+/g,               // BEL codes
    /GOÄ_\d+/g,                     // GOÄ codes
    /['"]Ä\d+['"]/g,                // "Ä1", 'Ä2' etc
    /['"](?:01|02|04|12|13)[a-z]?['"]/g,  // BEMA numbers as strings
    /['"](?:2040|2060|2080|2100|2120|2150|2160|2170|2180|2197|2330|2340)['"]/g,  // GOZ numbers
    /surfaceCount\s*[=<>!]+\s*\d+\s*\?\s*['"][A-Z_0-9]+['"]/g,  // Surface mappings
];

// Directories that are ALLOWED to have hardcoded codes (tests, fixtures, data)
const ALLOWED_PATHS = [
    '/test/',
    '/__tests__/',
    '/fixtures/',
    '.test.ts',
    '.test.tsx',
    '.spec.ts',
    '.spec.tsx',
    '/knowledgeBase/',          // JSON data files are the SSOT
    '/kataloge/',
    '/behandlungen/',
    '/regeln/',
    '.json',                    // JSON data files
    '.md',                      // Documentation
    'scripts/',                 // Scripts like this one
    '_legacy/',                 // Legacy code (not used)
];

// Directories to scan
const SCAN_DIRS = [
    'src/docudent/v6/services',
    'src/docudent/v6/hooks',
    'src/docudent/v6/pages',
    'src/docudent/v6/components',
];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Finding {
    file: string;
    line: number;
    pattern: string;
    context: string;
    classification: 'ALLOWED' | 'FORBIDDEN';
}

interface ScanResult {
    findings: Finding[];
    scannedFiles: number;
    allowedCount: number;
    forbiddenCount: number;
    status: 'PASS' | 'FAIL';
}

// ═══════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════

function isAllowedPath(filePath: string): boolean {
    return ALLOWED_PATHS.some(allowed => filePath.includes(allowed));
}

function scanFile(filePath: string): Finding[] {
    const findings: Finding[] = [];

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (const pattern of FORBIDDEN_PATTERNS) {
                // Reset regex state
                pattern.lastIndex = 0;
                let match;

                while ((match = pattern.exec(line)) !== null) {
                    // Skip if it's a display/format string (like .replace('BEMA_', ''))
                    if (line.includes('.replace(') && line.includes(match[0])) {
                        continue;
                    }

                    // Skip comments
                    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                        continue;
                    }

                    const classification = isAllowedPath(filePath) ? 'ALLOWED' : 'FORBIDDEN';

                    findings.push({
                        file: filePath.replace(ROOT_DIR, ''),
                        line: i + 1,
                        pattern: match[0],
                        context: line.trim().substring(0, 100),
                        classification,
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning ${filePath}:`, error);
    }

    return findings;
}

function scanDirectory(dirPath: string): Finding[] {
    const findings: Finding[] = [];

    if (!fs.existsSync(dirPath)) {
        console.warn(`Directory not found: ${dirPath}`);
        return findings;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            findings.push(...scanDirectory(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            findings.push(...scanFile(fullPath));
        }
    }

    return findings;
}

function runScan(): ScanResult {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║             SSOT COMPLIANCE SCANNER                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Scanning for hardcoded billing codes in production code...  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const allFindings: Finding[] = [];
    let scannedFiles = 0;

    for (const scanDir of SCAN_DIRS) {
        const fullPath = path.join(ROOT_DIR, scanDir);
        console.log(`📂 Scanning: ${scanDir}`);

        const dirFindings = scanDirectory(fullPath);
        allFindings.push(...dirFindings);

        // Count files
        if (fs.existsSync(fullPath)) {
            const countFiles = (dir: string): number => {
                let count = 0;
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        count += countFiles(path.join(dir, entry.name));
                    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                        count++;
                    }
                }
                return count;
            };
            scannedFiles += countFiles(fullPath);
        }
    }

    const allowedCount = allFindings.filter(f => f.classification === 'ALLOWED').length;
    const forbiddenCount = allFindings.filter(f => f.classification === 'FORBIDDEN').length;
    const status = forbiddenCount === 0 ? 'PASS' : 'FAIL';

    return {
        findings: allFindings,
        scannedFiles,
        allowedCount,
        forbiddenCount,
        status,
    };
}

function printReport(result: ScanResult): void {
    console.log('\n' + '═'.repeat(70));
    console.log('                         SCAN REPORT');
    console.log('═'.repeat(70));

    console.log(`\n📊 Summary:`);
    console.log(`   Files scanned:     ${result.scannedFiles}`);
    console.log(`   Total findings:    ${result.findings.length}`);
    console.log(`   ALLOWED:           ${result.allowedCount} (tests/fixtures/data)`);
    console.log(`   FORBIDDEN:         ${result.forbiddenCount} (production code)`);

    if (result.forbiddenCount > 0) {
        console.log('\n❌ FORBIDDEN FINDINGS (Production Code):');
        console.log('─'.repeat(70));

        const forbidden = result.findings.filter(f => f.classification === 'FORBIDDEN');
        for (const finding of forbidden) {
            console.log(`\n   📄 ${finding.file}:${finding.line}`);
            console.log(`      Pattern: ${finding.pattern}`);
            console.log(`      Context: ${finding.context}`);
        }
    }

    if (result.allowedCount > 0 && process.argv.includes('--verbose')) {
        console.log('\n✅ ALLOWED FINDINGS (Tests/Fixtures/Data):');
        console.log('─'.repeat(70));

        const allowed = result.findings.filter(f => f.classification === 'ALLOWED');
        for (const finding of allowed) {
            console.log(`   ${finding.file}:${finding.line} → ${finding.pattern}`);
        }
    }

    console.log('\n' + '═'.repeat(70));

    if (result.status === 'PASS') {
        console.log('   ✅ SSOT COMPLIANCE: PASS');
        console.log('   All billing codes are sourced from JSON databases.');
    } else {
        console.log('   ❌ SSOT COMPLIANCE: FAIL');
        console.log(`   ${result.forbiddenCount} hardcoded billing code(s) found in production code.`);
        console.log('   These must be removed and sourced from TreatmentEngine/JSON.');
    }

    console.log('═'.repeat(70) + '\n');

    // Exit with error if FAIL
    if (result.status === 'FAIL') {
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const result = runScan();
printReport(result);
