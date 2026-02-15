/**
 * Gate Test: No Hardcoded Billing Codes in V10 Output
 *
 * Contract: V10 output should NEVER contain raw BEMA/GOZ codes in text.
 * All billing references should be DB keys (BEMA_13, GOZ_2060) not raw codes (13a, 2060).
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// Pattern that should NEVER appear in output text
const HARDCODED_BILLING_PATTERN = /\b(BEMA|GOZ|BEMA_\d+[a-z]?|GOZ_\d+|Position \d+|Pos\.? \d+)\b/i;

// These are TEST DICTATIONS - realistic scenarios
const TEST_DICTATIONS = [
    { dictation: 'Füllung 36 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { dictation: 'Füllung 36 okklusal distal Komposit mit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV' },
    { dictation: 'Füllung 36 okklusal Komposit Mehrschichttechnik Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV' },
    { dictation: 'Füllung 36 und 37 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
] as const;

describe('gate-no-hardcoded-billing-codes', () => {
    describe('output text NEVER contains billing codes', () => {
        for (const tc of TEST_DICTATIONS) {
            test(`${tc.insuranceType}: ${tc.dictation.slice(0, 40)}...`, async () => {
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: tc.treatmentId,
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                });

                // Skip if questions
                if (result.state === 'questions') return;

                // Must not error
                expect(result.state).not.toBe('error');

                if (result.state === 'output') {
                    // Check fullText for any billing codes
                    expect(result.output.fullText).not.toMatch(HARDCODED_BILLING_PATTERN);

                    // Check each instance text
                    for (const [instanceId, instance] of Object.entries(result.output.perInstance)) {
                        expect(instance.text).not.toMatch(HARDCODED_BILLING_PATTERN);
                    }
                }
            });
        }
    });

    describe('billingRefs are DB keys not empty', () => {
        for (const tc of TEST_DICTATIONS) {
            test(`${tc.insuranceType}: has billingRefs`, async () => {
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: tc.treatmentId,
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                });

                if (result.state === 'questions' || result.state === 'error') return;

                const allBillingRefs = Object.values(result.output.perInstance)
                    .flatMap(i => i.billingRefs);

                // Should have at least 1 billing ref
                expect(allBillingRefs.length).toBeGreaterThan(0);

                // Each billing ref should be a DB key format
                for (const ref of allBillingRefs) {
                    expect(ref).toMatch(/^(BEMA|GOZ|GOÄ|BEL)_/);
                }
            });
        }
    });

    describe('billingRefs match DB key format', () => {
        test('valid DB key patterns', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 okklusal Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            if (result.state !== 'output') return;

            const billing = Object.values(result.output.perInstance)
                .flatMap(i => i.billingRefs);

            for (const code of billing) {
                // Must be uppercase prefix + underscore + identifier
                expect(code).toMatch(/^[A-ZÄÖÜ]+_[A-Za-z0-9]+$/);
            }
        });
    });
});
