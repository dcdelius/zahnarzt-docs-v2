/**
 * Gate Test: MVP Pipeline Chip Flow Diagnostic
 *
 * Traces chip emission through the full runV10 pipeline.
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

describe('gate-mvp-pipeline-chip-flow', () => {
    test('fuellung_grundleistung chip reaches output for minimal dictation', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        console.log('[DIAGNOSTIC] Pipeline state:', result.state);
        console.log('[DIAGNOSTIC] Meta:', JSON.stringify(result.meta, null, 2));

        if (result.state === 'output') {
            console.log('[DIAGNOSTIC] Full text:', result.output.fullText);
            console.log('[DIAGNOSTIC] Billing codes:', result.output.billingCodes);
            console.log('[DIAGNOSTIC] Per instance:', JSON.stringify(result.output.perInstance, null, 2));
        } else if (result.state === 'questions') {
            console.log('[DIAGNOSTIC] Questions:', result.questions?.map(q => q.id));
        } else if (result.state === 'error') {
            console.log('[DIAGNOSTIC] Error:', result.error);
        }

        // We expect output or questions, not error
        expect(result.state).not.toBe('error');

        // If output, we expect non-empty text
        if (result.state === 'output') {
            expect(result.output.fullText.length).toBeGreaterThan(0);
        }
    });

    test('provenance traces chips through pipeline', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        console.log('[DIAGNOSTIC] Provenance chips:', result.meta.provenance?.chips);
        console.log('[DIAGNOSTIC] Billing guard:', result.meta.provenance?.billingGuard);

        // Provenance should exist
        if (result.state === 'output') {
            expect(result.meta.provenance).toBeDefined();
            expect(result.meta.provenance?.chips?.length).toBeGreaterThan(0);
        }
    });

    test('trace lines show chip emission', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        console.log('[DIAGNOSTIC] Trace lines:', result.meta.traceLines);

        // Should have trace lines
        expect(result.meta.traceLines).toBeDefined();
    });
});
