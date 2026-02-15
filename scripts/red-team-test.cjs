#!/usr/bin/env node
/**
 * Red-Team Test — Proof that the Gate BITES
 * 
 * This script:
 * 1. Injects a hardcoded billing code into production code
 * 2. Runs the SSOT scanner (expects FAIL)
 * 3. Removes the injected code
 * 4. Runs the SSOT scanner again (expects PASS)
 * 
 * If both assertions hold, the gate is proven to work.
 * 
 * Run: node scripts/red-team-test.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

// Target file to inject into (production V6 code)
const TARGET_FILE = path.join(ROOT_DIR, 'src/docudent/v6/services/outputService.ts');
const INJECTION_MARKER = '// RED-TEAM-INJECTION';
const INJECTION_CODE = `
${INJECTION_MARKER}
const RED_TEAM_TEST = 'BEMA_13c'; // This should be caught by scanner
${INJECTION_MARKER}
`;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function injectCode() {
    console.log('💉 Injecting hardcoded billing code...');

    const content = fs.readFileSync(TARGET_FILE, 'utf-8');

    // Inject after the first import block
    const injectionPoint = content.indexOf('\n\n', content.lastIndexOf('import'));
    const newContent = content.slice(0, injectionPoint) + '\n' + INJECTION_CODE + content.slice(injectionPoint);

    fs.writeFileSync(TARGET_FILE, newContent);
    console.log(`   Injected into: ${TARGET_FILE.replace(ROOT_DIR, '')}`);
}

function removeInjection() {
    console.log('🧹 Removing injected code...');

    const content = fs.readFileSync(TARGET_FILE, 'utf-8');

    // Find and remove the injection block
    const start = content.indexOf(INJECTION_MARKER);
    const end = content.lastIndexOf(INJECTION_MARKER) + INJECTION_MARKER.length;

    if (start === -1) {
        console.log('   No injection found (already clean)');
        return;
    }

    const newContent = content.slice(0, start) + content.slice(end + 1);
    fs.writeFileSync(TARGET_FILE, newContent);
    console.log('   Injection removed');
}

function runSSOTScanner() {
    try {
        execSync('node scripts/ssot-compliance-scanner.cjs', {
            cwd: ROOT_DIR,
            stdio: 'pipe'
        });
        return { pass: true };
    } catch (error) {
        return { pass: false, output: error.stdout?.toString() || '' };
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║        RED-TEAM TEST — GATE VALIDATION                       ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Proving the scanner catches hardcoded billing codes         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Ensure no leftover injection
removeInjection();

// Test 1: Inject and expect FAIL
console.log('\n📋 Test 1: Inject hardcoded code → Scanner should FAIL\n');
injectCode();

const test1 = runSSOTScanner();

if (test1.pass) {
    console.log('   ❌ GATE FAILED TO CATCH INJECTION!');
    removeInjection();
    process.exit(1);
} else {
    console.log('   ✅ Scanner correctly detected injection (FAIL)');
}

// Test 2: Remove and expect PASS
console.log('\n📋 Test 2: Remove injected code → Scanner should PASS\n');
removeInjection();

const test2 = runSSOTScanner();

if (!test2.pass) {
    console.log('   ❌ SCANNER STILL FAILING AFTER CLEANUP!');
    console.log('   This indicates a pre-existing violation.');
    process.exit(1);
} else {
    console.log('   ✅ Scanner correctly passes after cleanup (PASS)');
}

// Summary
console.log('\n' + '═'.repeat(70));
console.log('   ✅ RED-TEAM TEST: PASS');
console.log('   The SSOT gate is proven to catch hardcoded billing codes.');
console.log('═'.repeat(70) + '\n');

console.log('📝 Red-Team Test Results:');
console.log('   • Injection detected: YES');
console.log('   • Cleanup verified: YES');
console.log('   • Gate is ACTIVE and FUNCTIONAL');
