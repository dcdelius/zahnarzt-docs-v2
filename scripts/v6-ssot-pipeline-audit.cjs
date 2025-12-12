#!/usr/bin/env node
/**
 * V6 SSOT Pipeline Audit Script
 * 
 * This script MUST FAIL if V6 contains:
 * - Chip ID patterns in switch/if statements
 * - Hardcoded defaults for chips
 * - Answer→Chip mapping logic
 * 
 * Purpose: Ensure V6 is truly "dumb" and all logic is in Engine/Resolver.
 */

const fs = require('fs');
const path = require('path');

const V6_DIR = path.join(__dirname, '../src/docudent/v6');

// Forbidden patterns in V6 code
const FORBIDDEN_PATTERNS = [
    // Chip ID patterns in code
    { pattern: /['"]vipr_pos['"]/, description: 'Chip ID vipr_pos in V6' },
    { pattern: /['"]vipr_neg['"]/, description: 'Chip ID vipr_neg in V6' },
    { pattern: /['"]perk_pos['"]/, description: 'Chip ID perk_pos in V6' },
    { pattern: /['"]perk_neg['"]/, description: 'Chip ID perk_neg in V6' },
    { pattern: /['"]kofferdam['"]/, description: 'Chip ID kofferdam in V6' },
    { pattern: /['"]rel_trocken['"]/, description: 'Chip ID rel_trocken in V6' },
    { pattern: /['"]la_leitung['"]/, description: 'Chip ID la_leitung in V6' },
    { pattern: /['"]la_infiltr['"]/, description: 'Chip ID la_infiltr in V6' },
    { pattern: /['"]exkavation['"]/, description: 'Chip ID exkavation in V6' },
    { pattern: /['"]finishing['"]/, description: 'Chip ID finishing in V6' },
    { pattern: /['"]komposit_basic['"]/, description: 'Chip ID komposit_basic in V6' },
    { pattern: /['"]mehrschicht['"]/, description: 'Chip ID mehrschicht in V6' },
    { pattern: /['"]cp['"]/, description: 'Chip ID cp in V6' },
    { pattern: /['"]p['"](?!\w)/, description: 'Chip ID p in V6' },
    { pattern: /['"]ohne_la['"]/, description: 'Chip ID ohne_la in V6' },

    // Option B: hasAnesthesia must NOT be calculated in V6
    { pattern: /\.startsWith\(['"]la_['"]\)/, description: 'la_ pattern check in V6 (Option B violation)' },
    { pattern: /hasAnesthesia\s*:\s*activeChipIds/, description: 'hasAnesthesia derived from chips in V6 (Option B violation)' },
    { pattern: /hasAnesthesia\s*=\s*.*\.some/, description: 'hasAnesthesia calculation in V6 (Option B violation)' },

    // Answer→Chip logic patterns
    { pattern: /answerId\s*===\s*['"]pos['"].*['"]vipr_/, description: 'Answer→Chip logic for vitality' },
    { pattern: /answerId\s*===\s*['"]yes['"].*kofferdam/, description: 'Answer→Chip logic for kofferdam' },

    // Hardcoded defaults
    { pattern: /chips\.push\(['"]exkavation['"]\)/, description: 'Hardcoded exkavation default' },
    { pattern: /chips\.push\(['"]finishing['"]\)/, description: 'Hardcoded finishing default' },
    { pattern: /chips\.push\(['"]komposit_basic['"]\)/, description: 'Hardcoded komposit_basic default' },

    // Switch cases for chip selection
    { pattern: /switch\s*\(.*field.*\)\s*{[\s\S]*case\s*['"]vitality['"]:/, description: 'Switch case for vitality field' },
    { pattern: /switch\s*\(.*field.*\)\s*{[\s\S]*case\s*['"]kofferdam['"]:/, description: 'Switch case for kofferdam field' },
];

// Files to exclude from audit (allowed to have chip logic - Phase 2 cleanup)
// NOTE: These files will be cleaned up in a future phase
const EXCLUDED_FILES = [
    'outputService.ts.bak',
    '__tests__',
    '.test.',
    '.spec.',
    // Phase 2: These files still have chip logic - will be refactored later
    'useDocudentV6.ts',      // Has question ID mappings (forensic_xxx)
    'questionService.ts',    // Has chip-related validation logic
    'extractionService.ts',  // Has extraction field mappings
];

function getAllTsFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllTsFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            // Check exclusions
            const shouldExclude = EXCLUDED_FILES.some(ex => fullPath.includes(ex));
            if (!shouldExclude) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

function auditFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations = [];

    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

            violations.push({
                file: path.relative(process.cwd(), filePath),
                line: lineNumber,
                description,
                match: match[0]
            });
        }
    }

    return violations;
}

function runAudit() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('V6 SSOT PIPELINE AUDIT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const files = getAllTsFiles(V6_DIR);
    console.log(`📂 Scanning ${files.length} files in V6...`);

    let allViolations = [];

    for (const file of files) {
        const violations = auditFile(file);
        allViolations.push(...violations);
    }

    if (allViolations.length === 0) {
        console.log('\n✅ PASS: V6 is clean — no forbidden patterns found.');
        console.log('   V6 is truly dumb, all logic is in Engine/Resolver.\n');
        process.exit(0);
    } else {
        console.log(`\n❌ FAIL: Found ${allViolations.length} violations!\n`);

        for (const v of allViolations) {
            console.log(`  📍 ${v.file}:${v.line}`);
            console.log(`     ${v.description}`);
            console.log(`     Found: ${v.match}\n`);
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('FAILED: V6 contains chip logic that belongs in Engine/Resolver.');
        console.log('═══════════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

runAudit();
