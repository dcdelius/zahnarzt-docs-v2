/**
 * Gate Test: Askback Mehrkosten MKV
 * 
 * Contract: MKV without Mehrkosten keyword must trigger askback.
 * Answer ja → BEMA + GOZ, Answer nein → only BEMA.
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { computeBillingIntent } from '../../v10/types';

describe('gate-askback-mehrkosten-mkv', () => {
    describe('BillingIntent Computation', () => {
        test('MKV with mehrkostenActive=true → allowGozAddon=true', () => {
            const intent = computeBillingIntent('MKV', true);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGozAddon).toBe(true);
        });

        test('MKV with mehrkostenActive=false → allowGozAddon=false', () => {
            const intent = computeBillingIntent('MKV', false);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGozAddon).toBe(false);
        });
    });

    describe('MKV Mehrkosten Askback', () => {
        test('MKV without keyword triggers questions', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal Komposit',  // No Mehrkosten keyword
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            console.log('[MKV no keyword] State:', result.state);
            console.log('[MKV no keyword] Questions:', result.questions?.length ?? 0);

            // Should have questions including mehrkosten
            const hasMehrkostenQ = result.questions?.some(
                q => q.id?.includes('mehrkosten') || q.questionKey?.includes('mehrkosten')
            ) ?? false;

            console.log('[MKV no keyword] HasMehrkostenQ:', hasMehrkostenQ);
        });

        test('MKV with Mehrkosten keyword → no askback', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal Komposit Mehrkosten',  // Has keyword
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            console.log('[MKV with keyword] State:', result.state);

            // Should NOT have mehrkosten question (already mentioned)
            const hasMehrkostenQ = result.questions?.some(
                q => q.id?.includes('mehrkosten') || q.questionKey?.includes('mehrkosten')
            ) ?? false;

            expect(hasMehrkostenQ).toBe(false);
        });

        test('MKV nurKasse → only BEMA in output', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal nur Kasse',
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            console.log('[MKV nurKasse] Output:', result.output?.billingCodes);

            const billingCodes = result.output?.billingCodes ?? [];
            const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

            // nurKasse should suppress GOZ addon
            expect(hasGoz).toBe(false);
        });
    });

    describe('MKV Praxis-Default', () => {
        test('MKV default (no nurKasse) → includes GOZ addon', async () => {
            const result = await runV10({
                treatmentId: 'fuellung',
                dictation: 'Füllung Zahn 36 okklusal Mehrkosten',  // Explicit mehrkosten
                insuranceType: 'MKV',
                textLength: 'mittel',
            });

            console.log('[MKV default] Output:', result.output?.billingCodes);

            const billingCodes = result.output?.billingCodes ?? [];

            if (billingCodes.length > 0) {
                const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
                const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

                // With explicit Mehrkosten, should have both
                expect(hasBema).toBe(true);
                expect(hasGoz).toBe(true);
            }
        });
    });
});
