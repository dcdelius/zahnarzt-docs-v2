#!/usr/bin/env npx tsx
/**
 * M79 CLI Replay Tool — Deterministic V10 Bundle Replay
 * 
 * Usage: npx tsx scripts/audit/replayV10Bundle.ts --bundle <path>
 * 
 * Loads a repro bundle JSON and executes runV10 with the input,
 * then compares output against expected values.
 */

import * as fs from 'fs';
import * as path from 'path';

// Dynamic import to handle ESM
async function main() {
    const args = process.argv.slice(2);
    const bundleIndex = args.indexOf('--bundle');
    if (bundleIndex === -1 || !args[bundleIndex + 1]) {
        console.error('Usage: npx tsx scripts/audit/replayV10Bundle.ts --bundle <path>');
        process.exit(1);
    }

    const bundlePath = args[bundleIndex + 1];
    if (!fs.existsSync(bundlePath)) {
        console.error(`Bundle not found: ${bundlePath}`);
        process.exit(1);
    }

    console.log(`Loading bundle: ${bundlePath}`);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

    // Validate schema
    if (!bundle.input || !bundle.runId) {
        console.error('Invalid bundle: missing input or runId');
        process.exit(1);
    }

    console.log(`Run ID: ${bundle.runId}`);
    console.log(`Input: ${JSON.stringify(bundle.input, null, 2)}`);

    // Import runV10 dynamically
    const { runV10 } = await import('../../src/docudent/v10/pipeline/runV10.js');

    // Build V10 input from bundle
    const v10Input = {
        dictation: bundle.input.dictation,
        treatmentId: bundle.input.treatmentId,
        insuranceType: bundle.input.insuranceType,
        textLength: bundle.input.textLength || 'medium',
        hasMKV: bundle.input.hasMKV || false,
        answers: new Map(Object.entries(bundle.input.answers || {})),
        userSettings: bundle.input.userSettings || {},
    };

    console.log('\nExecuting runV10...');
    const startTime = Date.now();

    try {
        const result = await runV10(v10Input);
        const duration = Date.now() - startTime;

        console.log(`\nExecution completed in ${duration}ms`);
        console.log(`State: ${result.state}`);
        console.log(`Chips: ${(result.chips || []).join(', ')}`);
        console.log(`Questions: ${(result.questions || []).map(q => q.id).join(', ')}`);
        console.log(`Billing codes: ${(result.billingCodes || []).map(b => b.code).join(', ')}`);

        // Compare with expected if present
        if (bundle.expected) {
            console.log('\n=== PARITY CHECK ===');
            let passed = true;

            // Check state sequence
            if (bundle.expected.state_sequence) {
                const expectedFinalState = bundle.expected.state_sequence[bundle.expected.state_sequence.length - 1];
                if (result.state !== expectedFinalState) {
                    console.log(`❌ State mismatch: expected ${expectedFinalState}, got ${result.state}`);
                    passed = false;
                } else {
                    console.log(`✓ State: ${result.state}`);
                }
            }

            // Check required questions
            if (bundle.expected.required_questions) {
                for (const qId of bundle.expected.required_questions) {
                    const found = (result.questions || []).some(q => q.id === qId);
                    if (!found) {
                        console.log(`❌ Missing required question: ${qId}`);
                        passed = false;
                    } else {
                        console.log(`✓ Required question present: ${qId}`);
                    }
                }
            }

            // Check chips must include
            if (bundle.expected.chips_must_include) {
                for (const chipId of bundle.expected.chips_must_include) {
                    const found = (result.chips || []).includes(chipId);
                    if (!found) {
                        console.log(`❌ Missing expected chip: ${chipId}`);
                        passed = false;
                    } else {
                        console.log(`✓ Chip present: ${chipId}`);
                    }
                }
            }

            // Check chips must exclude
            if (bundle.expected.chips_must_exclude) {
                for (const chipId of bundle.expected.chips_must_exclude) {
                    const found = (result.chips || []).includes(chipId);
                    if (found) {
                        console.log(`❌ Unexpected chip present: ${chipId}`);
                        passed = false;
                    } else {
                        console.log(`✓ Chip correctly excluded: ${chipId}`);
                    }
                }
            }

            // Check fullText contains
            if (bundle.expected.fullText_must_contain && result.fullText) {
                for (const substr of bundle.expected.fullText_must_contain) {
                    if (!result.fullText.includes(substr)) {
                        console.log(`❌ fullText missing: "${substr}"`);
                        passed = false;
                    } else {
                        console.log(`✓ fullText contains: "${substr}"`);
                    }
                }
            }

            // Check billing not empty
            if (bundle.expected.billing_not_empty) {
                if (!result.billingCodes || result.billingCodes.length === 0) {
                    console.log('❌ Billing codes empty when expected non-empty');
                    passed = false;
                } else {
                    console.log(`✓ Billing codes present: ${result.billingCodes.length} codes`);
                }
            }

            console.log('\n' + (passed ? '✓ PARITY PASS' : '❌ PARITY FAIL'));
            process.exit(passed ? 0 : 1);
        } else {
            // No expected, just dump result
            console.log('\nFull result:');
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        }
    } catch (error) {
        console.error('Execution failed:', error);
        process.exit(1);
    }
}

main();
