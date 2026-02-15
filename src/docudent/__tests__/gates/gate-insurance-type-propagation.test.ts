/**
 * Gate Test: InsuranceType Propagation
 *
 * Contract: insuranceType='MKV' must be preserved end-to-end.
 * Note: Uses answers to bypass extraction and set surfaces directly.
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

describe('gate-insurance-type-propagation', () => {
    const DICTATION_WITH_SURFACE = 'Füllung Zahn 36 okklusal Komposit';

    test('MKV propagates to output.perInstance', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: DICTATION_WITH_SURFACE,
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: {
                mkv_mkv_betrag: 100,
                fuellung_mkv_justification: 'mehrschicht',
            },
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['o'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                },
            },
        });

        expect(result.state).toBe('output');
        expect(result.output?.perInstance).toBeDefined();
        expect(Object.keys(result.output?.perInstance ?? {}).length).toBeGreaterThan(0);
    });

    test('MKV produces BEMA + GOZ (Praxis-Default)', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: DICTATION_WITH_SURFACE,
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: {
                mkv_mkv_betrag: 100,
                fuellung_mkv_justification: 'mehrschicht',
            },
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['o'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                },
            },
        });

        const billingCodes = result.output?.billingCodes ?? [];

        // MKV Praxis-Default: BEMA base + GOZ addon
        const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
        const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

        expect(hasBema).toBe(true);
        expect(hasGoz).toBe(true);
    });

    test('GKV produces only BEMA', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: DICTATION_WITH_SURFACE,
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['o'],
                    materialMentioned: 'komposit',
                },
            },
        });

        const billingCodes = result.output?.billingCodes ?? [];

        const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
        const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

        expect(hasBema).toBe(true);
        expect(hasGoz).toBe(false);
    });

    test('PKV produces only GOZ', async () => {
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: DICTATION_WITH_SURFACE,
            insuranceType: 'PKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['o'],
                    materialMentioned: 'komposit',
                },
            },
        });

        const billingCodes = result.output?.billingCodes ?? [];

        const hasBema = billingCodes.some(c => c.startsWith('BEMA_'));
        const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));

        expect(hasBema).toBe(false);
        expect(hasGoz).toBe(true);
    });
});
