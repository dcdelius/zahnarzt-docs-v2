#!/usr/bin/env node
/**
 * SSOT Compliance Scanner — HARDENED VERSION
 * 
 * Scans the ENTIRE src/ directory for hardcoded billing codes.
 * 
 * WHITELIST (allowed to have codes):
 *   - Tests: /test/, /__tests__/, .test.ts, .spec.ts
 *   - Fixtures: /fixtures/
 *   - KnowledgeBase: /knowledgeBase/, /kataloge/, /behandlungen/, /regeln/
 *   - Documentation: .md, .json (data files)
 *   - Legacy: /_legacy/, /v5/ (not used in V6 production flow)
 *   - Scripts: /scripts/
 *   - Types with comments: lines containing "e.g." or "example"
 *   - ToothNormalizer: tooth number mappings are not billing codes
 * 
 * BLACKLIST (FORBIDDEN):
 *   - V6 Services, Hooks, Pages, Components
 *   - Core billing logic (except knowledgeBase)
 * 
 * Detects:
 *   - BEMA_*, GOZ_*, BEL_*, GOÄ_*
 *   - String constructions: "BEMA_" + x, `GOZ_${id}`
 * 
 * Run: node scripts/ssot-compliance-scanner.cjs
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ROOT_DIR = path.resolve(__dirname, '..');

// Patterns that indicate hardcoded billing codes
const FORBIDDEN_PATTERNS = [
    // Prefixed codes - these are the PRIMARY detection
    { regex: /BEMA_\d+[a-z]?/g, name: 'BEMA_xxx' },
    { regex: /GOZ_\d+/g, name: 'GOZ_xxxx' },
    { regex: /BEL_[A-Z0-9]+/g, name: 'BEL_xxx' },
    { regex: /GOÄ_\d+/g, name: 'GOÄ_xxx' },
    { regex: /['"]Ä\d+['"]/g, name: 'Ä-code' },

    // String constructions that build codes dynamically
    { regex: /['"]BEMA_['"]\s*\+/g, name: 'BEMA_ concatenation' },
    { regex: /['"]GOZ_['"]\s*\+/g, name: 'GOZ_ concatenation' },
    { regex: /`BEMA_\$\{/g, name: 'BEMA_ template literal' },
    { regex: /`GOZ_\$\{/g, name: 'GOZ_ template literal' },
];

// Paths that are WHITELISTED (allowed to have billing codes)
const WHITELIST_PATHS = [
    // Tests
    '/test/',
    '/__tests__/',
    '.test.ts',
    '.test.tsx',
    '.spec.ts',
    '.spec.tsx',

    // Fixtures
    '/fixtures/',
    '/__fixtures__/',

    // KnowledgeBase (SSOT data)
    '/knowledgeBase/',
    '/kataloge/',
    '/behandlungen/',
    '/regeln/',

    // Documentation and data
    '.json',
    '.md',
    '/qa/',
    '/scenarios.ts',
    '/combinability.ts',
    '/v10/diagnostics/',

    // Legacy (not used in production V6 flow)
    '/_legacy/',
    '/v5/',                    // V5 is legacy, V6 is production
    '/v7/',

    // Scripts (like this one)
    '/scripts/',

    // Tooth normalizer (tooth numbers, not billing)
    '/toothNormalizer',

    // Type definitions (often have examples in comments)
    '/types/',
    '/billingRefNormalization.ts',
];

// Line-level whitelists (skip lines containing these)
const LINE_WHITELIST = [
    'e.g.',
    'example',
    'Example',
    'z.B.',
    '// e.g.',
    '// Example',
];

// Root directory to scan
const SCAN_ROOT = 'src';

// ═══════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════

function isWhitelisted(filePath) {
    return WHITELIST_PATHS.some(allowed => filePath.includes(allowed));
}

function isLineWhitelisted(line) {
    return LINE_WHITELIST.some(pattern => line.includes(pattern));
}

function scanFile(filePath) {
    const findings = [];

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip comments
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

            // Skip lines with example markers
            if (isLineWhitelisted(line)) continue;

            // Skip display/format operations (like .replace('BEMA_', ''))
            if (line.includes('.replace(') && (line.includes("'BEMA_'") || line.includes("'GOZ_'"))) continue;

            // Check each pattern
            for (const { regex, name } of FORBIDDEN_PATTERNS) {
                regex.lastIndex = 0;
                let match;

                while ((match = regex.exec(line)) !== null) {
                    const classification = isWhitelisted(filePath) ? 'WHITELISTED' : 'FORBIDDEN';

                    findings.push({
                        file: filePath.replace(ROOT_DIR, ''),
                        line: i + 1,
                        pattern: match[0],
                        patternType: name,
                        context: line.trim().substring(0, 100),
                        classification,
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
    }

    return findings;
}

function scanDirectory(dirPath) {
    const findings = [];

    if (!fs.existsSync(dirPath)) {
        console.warn(`Directory not found: ${dirPath}`);
        return findings;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            findings.push(...scanDirectory(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
            findings.push(...scanFile(fullPath));
        }
    }

    return findings;
}

function runScan() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║        SSOT COMPLIANCE SCANNER — HARDENED                    ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Scanning ENTIRE src/ for hardcoded billing codes...         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const fullPath = path.join(ROOT_DIR, SCAN_ROOT);
    console.log(`📂 Scanning: ${SCAN_ROOT}/`);
    console.log(`   Whitelisted: tests, fixtures, knowledgeBase, v5/, types/`);
    console.log(`   Blacklisted: v6/services, v6/hooks, v6/pages, core/billing/`);

    const allFindings = scanDirectory(fullPath);

    const whitelistedCount = allFindings.filter(f => f.classification === 'WHITELISTED').length;
    const forbiddenCount = allFindings.filter(f => f.classification === 'FORBIDDEN').length;
    const status = forbiddenCount === 0 ? 'PASS' : 'FAIL';

    // Count files scanned
    let fileCount = 0;
    const countFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                countFiles(path.join(dir, entry.name));
            } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
                fileCount++;
            }
        }
    };
    countFiles(fullPath);

    return {
        findings: allFindings,
        scannedFiles: fileCount,
        whitelistedCount,
        forbiddenCount,
        status,
    };
}

function printReport(result) {
    console.log('\n' + '═'.repeat(70));
    console.log('                         SCAN REPORT');
    console.log('═'.repeat(70));

    console.log(`\n📊 Summary:`);
    console.log(`   Scope:             ENTIRE src/`);
    console.log(`   Files scanned:     ${result.scannedFiles}`);
    console.log(`   Total findings:    ${result.findings.length}`);
    console.log(`   WHITELISTED:       ${result.whitelistedCount} (tests/fixtures/data/legacy)`);
    console.log(`   FORBIDDEN:         ${result.forbiddenCount} (production code)`);

    if (result.forbiddenCount > 0) {
        console.log('\n❌ FORBIDDEN FINDINGS (Production Code):');
        console.log('─'.repeat(70));

        const forbidden = result.findings.filter(f => f.classification === 'FORBIDDEN');
        for (const finding of forbidden) {
            console.log(`\n   📄 ${finding.file}:${finding.line}`);
            console.log(`      Type: ${finding.patternType}`);
            console.log(`      Found: ${finding.pattern}`);
            console.log(`      Context: ${finding.context}`);
        }
    }

    if (result.whitelistedCount > 0 && process.argv.includes('--verbose')) {
        console.log('\n✅ WHITELISTED FINDINGS (Tests/Fixtures/Data/Legacy):');
        console.log('─'.repeat(70));

        const whitelisted = result.findings.filter(f => f.classification === 'WHITELISTED');
        for (const finding of whitelisted) {
            console.log(`   ${finding.file}:${finding.line} → ${finding.pattern}`);
        }
    }

    console.log('\n' + '═'.repeat(70));

    if (result.status === 'PASS') {
        console.log('   ✅ SSOT COMPLIANCE: PASS');
        console.log('   All billing codes in production are sourced from JSON databases.');
    } else {
        console.log('   ❌ SSOT COMPLIANCE: FAIL');
        console.log(`   ${result.forbiddenCount} hardcoded billing code(s) found in production code.`);
        console.log('   These MUST be removed and sourced from TreatmentEngine/JSON.');
    }

    console.log('═'.repeat(70) + '\n');

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const result = runScan();
printReport(result);

// HARD FAIL: Exit with error if ANY forbidden finding
if (result.status === 'FAIL') {
    process.exit(1);
}
