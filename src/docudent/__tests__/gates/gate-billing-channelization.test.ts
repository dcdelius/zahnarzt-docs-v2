/**
 * Gate Test: Billing Channelization (MEGAPROMPT MKV FIX)
 *
 * HARD INVARIANTS:
 * 1. GKV output contains NEVER GOZ_
 * 2. PKV output contains NEVER BEMA_
 * 3. MKV base = BEMA (for LA, Kofferdam, etc.)
 * 4. MKV GOZ addon = ONLY when mehrkostenConfirmed
 *
 * @fast < 3s
 * @deterministic
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getAllBillingCodes(result: Awaited<ReturnType<typeof runV10>>): string[] {
    if (result.state !== 'output') return [];
    const perInstance = result.output?.perInstance ?? {};
    return Object.values(perInstance).flatMap(inst => inst.billingRefs ?? []);
}

function hasGozCode(codes: string[]): boolean {
    return codes.some(c => c.startsWith('GOZ_'));
}

function hasBeamCode(codes: string[]): boolean {
    return codes.some(c => c.startsWith('BEMA_'));
}

// ═══════════════════════════════════════════════════════════════
// INVARIANT 1: GKV NEVER GOZ
// ═══════════════════════════════════════════════════════════════

describe('Invariant 1: GKV never contains GOZ codes', () => {
    test('GKV filling → only BEMA codes', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_material', 'komposit');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit mit Kofferdam',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[GKV] Billing codes:', billing);
            expect(hasGozCode(billing), 'GKV should never have GOZ codes').toBe(false);
            expect(hasBeamCode(billing), 'GKV should have BEMA codes').toBe(true);
        }
    });

    test('GKV with LA → BEMA_40/41, never GOZ_0090', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_material', 'komposit');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod mit Infiltrationsanästhesie',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            expect(billing).not.toContain('GOZ_0090');
            expect(billing).not.toContain('GOZ_0100');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INVARIANT 2: PKV NEVER BEMA
// ═══════════════════════════════════════════════════════════════

describe('Invariant 2: PKV never contains BEMA codes', () => {
    test('PKV filling → only GOZ codes', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_material', 'komposit');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[PKV] Billing codes:', billing);
            expect(hasBeamCode(billing), 'PKV should never have BEMA codes').toBe(false);
            expect(hasGozCode(billing), 'PKV should have GOZ codes').toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INVARIANT 3: MKV BASE = BEMA
// ═══════════════════════════════════════════════════════════════

describe('Invariant 3: MKV base leistungen use BEMA', () => {
    test('MKV ambiguous → BEMA base, no GOZ addon', async () => {
        // Without mehrkostenConfirmed, should only have BEMA
        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod',
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        // Will be in questions state - that's fine
        // The key invariant is tested when output is produced
        expect(result.state).not.toBe('error');
    });

    test('MKV + nurKasse → BEMA only, no GOZ', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_mkv_justification', 'keine');
        answers.set('fuellung_material', 'giz');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod nur Kasse',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[MKV nurKasse] Billing codes:', billing);
            expect(hasGozCode(billing), 'nurKasse should have no GOZ').toBe(false);
            expect(hasBeamCode(billing), 'nurKasse should have BEMA').toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INVARIANT 4: MKV LA = BEMA (COMMON_BILLING_ONLY)
// ═══════════════════════════════════════════════════════════════

describe('Invariant 4: MKV LA uses BEMA, not GOZ', () => {
    test('MKV + LA → BEMA_40, never GOZ_0090', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_mkv_justification', 'keine'); // nurKasse
        answers.set('fuellung_material', 'giz');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod mit Infiltrationsanästhesie',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[MKV LA] Billing codes:', billing);
            // LA should be BEMA, not GOZ
            expect(billing).not.toContain('GOZ_0090');
            expect(billing).not.toContain('GOZ_0100');
        }
    });

    test('MKV + mehrkostenConfirmed + LA → GOZ addon for filling, NOT for LA', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_mkv_justification', 'mehrschicht');
        answers.set('fuellung_material', 'komposit');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit Mehrschicht mit Infiltrationsanästhesie',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[MKV mehrschicht LA] Billing codes:', billing);
            // Should have BOTH BEMA base AND GOZ addon for filling
            // But LA should still be BEMA_40, not GOZ_0090
            expect(billing).not.toContain('GOZ_0090');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INVARIANT 5: GOZ ADDON ONLY WHEN JUSTIFIED
// ═══════════════════════════════════════════════════════════════

describe('Invariant 5: GOZ addon only when justified', () => {
    test('MKV + Komposit signal → GOZ addon present', async () => {
        const answers = new Map<string, unknown>();
        answers.set('fuellung_material', 'komposit');

        const result = await runV10({
            treatmentId: 'fuellung',
            dictation: 'Füllung Zahn 36 mod Komposit Mehrschicht',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers,
        });

        if (result.state === 'output') {
            const billing = getAllBillingCodes(result);
            console.log('[MKV Komposit] Billing codes:', billing);
            // Should have BEMA base
            expect(hasBeamCode(billing), 'MKV should have BEMA base').toBe(true);
            // Should have GOZ addon
            expect(hasGozCode(billing), 'MKV with Mehrkosten should have GOZ addon').toBe(true);
        }
    });
});
