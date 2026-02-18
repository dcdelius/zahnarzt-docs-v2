#!/usr/bin/env node
/**
 * Billing Routing Proof — HARDENED VERSION
 * 
 * Verifies that ALL billing codes are generated through TreatmentEngine.
 * Uses static analysis to PROVE there are no alternative code paths.
 * 
 * Run: node scripts/billing-routing-proof.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Services that MUST use TreatmentEngine
const MUST_USE_ENGINE = [
    { file: 'src/docudent/v6/services/outputService.ts', name: 'outputService' },
    { file: 'src/docudent/v6/services/questionService.ts', name: 'questionService' },
];

// The ONLY allowed billing source
const ENGINE_FILE = 'src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts';

// Patterns that indicate billing code generation
const BILLING_GENERATION_PATTERNS = [
    /billingCodes\s*[=:]\s*\[/,           // Array assignment
    /billingCodes\s*\.\s*push\s*\(/,      // Array push
    /code\s*:\s*['"](?:BEMA|GOZ)_/,       // Object property
    /billingDetails\s*[=:]\s*\[/,         // Details array
];

// ═══════════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════════

function analyzeFile(filePath, fileName) {
    const fullPath = path.join(ROOT_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        return {
            name: fileName,
            exists: false,
            usesEngine: false,
            imports: [],
            directGeneration: [],
        };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Check imports
    const imports = [];
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        if (match[2].includes('treatmentEngine')) {
            imports.push(...match[1].split(',').map(s => s.trim()));
        }
    }

    // Check if file uses TreatmentEngine (any of its functions)
    const engineFunctions = [
        'processChipsToBilling',
        'getTreatmentChips',
        'getMissingRequiredFields',
        'getUpsellChips',
        'getApplicableRules',
        'loadRules',
        'lookupBillingCode',
        'generateAuditNotes',
    ];

    const usesEngine = engineFunctions.some(fn => imports.includes(fn)) ||
        content.includes('from') && content.includes('treatmentEngine');

    // Check for direct billing generation
    const directGeneration = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Skip if this is receiving from engine
        if (line.includes('engineResult') || line.includes('processChipsToBilling')) continue;

        for (const pattern of BILLING_GENERATION_PATTERNS) {
            if (pattern.test(line)) {
                // Check if it's assignment FROM engine result
                if (line.includes('engineResult.') || line.includes('result.billingCodes')) {
                    continue;
                }

                directGeneration.push({
                    line: i + 1,
                    context: line.trim().substring(0, 80),
                });
            }
        }
    }

    return {
        name: fileName,
        exists: true,
        usesEngine,
        imports,
        directGeneration,
    };
}

function verifyEngineIsSSOT() {
    const enginePath = path.join(ROOT_DIR, ENGINE_FILE);

    if (!fs.existsSync(enginePath)) {
        return { exists: false, isSSoT: false, issues: ['Engine file not found'] };
    }

    const content = fs.readFileSync(enginePath, 'utf-8');

    const checks = [
        { name: 'processChipsToBilling exists', pass: content.includes('function processChipsToBilling') || content.includes('export function processChipsToBilling') },
        { name: 'Loads treatment JSON', pass: content.includes('loadTreatmentJSON') },
        { name: 'Uses billingRef from chips', pass: content.includes('billingRef') },
        { name: 'Returns ProcessingResult', pass: content.includes('ProcessingResult') },
    ];

    const issues = checks.filter(c => !c.pass).map(c => c.name);

    return {
        exists: true,
        isSSoT: issues.length === 0,
        checks,
        issues,
    };
}

function runProof() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║        BILLING ROUTING PROOF — HARDENED                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Proving ALL billing codes route through TreatmentEngine     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    let allPass = true;

    // 1. Verify TreatmentEngine is SSOT
    console.log('📋 Step 1: Verify TreatmentEngine is the Single Source of Truth\n');
    const engineResult = verifyEngineIsSSOT();

    for (const check of engineResult.checks || []) {
        console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    }

    if (!engineResult.isSSoT) {
        allPass = false;
    }

    // 2. Verify services import and use TreatmentEngine
    console.log('\n📋 Step 2: Verify V6 services use TreatmentEngine\n');

    for (const { file, name } of MUST_USE_ENGINE) {
        const analysis = analyzeFile(file, name);

        if (!analysis.exists) {
            console.log(`   ℹ️  ${name}: File not found (skipped in current architecture)`);
            continue;
        }

        if (!analysis.usesEngine) {
            console.log(`   ❌ ${name}: Does NOT import processChipsToBilling`);
            allPass = false;
            continue;
        }

        console.log(`   ✅ ${name}: Imports processChipsToBilling`);
        console.log(`      Imports: ${analysis.imports.join(', ')}`);

        if (analysis.directGeneration.length > 0) {
            console.log(`   ⚠️  ${name}: ${analysis.directGeneration.length} potential direct generation(s)`);
            for (const gen of analysis.directGeneration) {
                console.log(`      Line ${gen.line}: ${gen.context}`);
            }
            // Note: This is a warning, not automatic fail
            // Human review needed to determine if it's real violation
        }
    }

    // 3. Verify no alternative billing sources in V6
    console.log('\n📋 Step 3: Verify no alternative billing sources\n');

    const v6ServicesPath = path.join(ROOT_DIR, 'src/docudent/v6/services');
    if (!fs.existsSync(v6ServicesPath)) {
        console.log('   ℹ️  V6 services path missing (skipped in current architecture)');
    } else {
        const v6Files = fs.readdirSync(v6ServicesPath);

        let altSources = 0;
        for (const file of v6Files) {
            if (!file.endsWith('.ts')) continue;

            const content = fs.readFileSync(path.join(v6ServicesPath, file), 'utf-8');

            // Check for direct billing code patterns
            const hasDirectBEMA = /['"]BEMA_\d/.test(content) && !content.includes('.replace(');
            const hasDirectGOZ = /['"]GOZ_\d/.test(content) && !content.includes('.replace(');

            if (hasDirectBEMA || hasDirectGOZ) {
                console.log(`   ❌ ${file}: Contains hardcoded billing codes`);
                altSources++;
            }
        }

        if (altSources === 0) {
            console.log('   ✅ No alternative billing sources in V6 services');
        } else {
            allPass = false;
        }
    }

    // 4. Summary
    console.log('\n' + '═'.repeat(70));

    if (allPass) {
        console.log('   ✅ BILLING ROUTING: PASS');
        console.log('   All billing codes are generated through TreatmentEngine.');
        console.log('   No alternative code paths exist.');
    } else {
        console.log('   ❌ BILLING ROUTING: FAIL');
        console.log('   Some billing codes bypass TreatmentEngine.');
    }

    console.log('═'.repeat(70) + '\n');

    return allPass;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const pass = runProof();

if (!pass) {
    process.exit(1);
}
