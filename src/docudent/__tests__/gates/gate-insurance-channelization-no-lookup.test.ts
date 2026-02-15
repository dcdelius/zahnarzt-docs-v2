/**
 * Gate Test: Insurance Channelization - No Forbidden Lookups
 * 
 * Proves:
 * - GKV: GOZ lookups never invoked
 * - PKV: BEMA lookups never invoked
 * - MKV: addon only when allowGozAddon=true
 */

import { describe, test, expect } from 'vitest';
import { resolveSurfaceBilling, type SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';
import { computeBillingIntent, type BillingIntent } from '../../v10/types';

const MAPPING: SurfaceMapping = {
    '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
    '2': { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b', MKV_addon: 'GOZ_2080' },
};

describe('gate-insurance-channelization-no-lookup', () => {
    describe('GKV: No GOZ lookups', () => {
        test('GKV BillingIntent has allowGoz=false', () => {
            const intent = computeBillingIntent('GKV', false);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGoz).toBe(false);
            expect(intent.allowGozAddon).toBe(false);
        });

        test('GKV produces only BEMA, never GOZ', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, intent);

            expect(result?.billingCode).toBe('BEMA_13');
            expect(result?.addonCode).toBeNull();
            expect(result?.billingCode?.startsWith('GOZ_')).toBe(false);
        });
    });

    describe('PKV: No BEMA lookups', () => {
        test('PKV BillingIntent has allowBema=false', () => {
            const intent = computeBillingIntent('PKV', false);
            expect(intent.allowBema).toBe(false);
            expect(intent.allowGoz).toBe(true);
            expect(intent.allowGozAddon).toBe(false);
        });

        test('PKV produces only GOZ, never BEMA', () => {
            const intent = computeBillingIntent('PKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, intent);

            expect(result?.billingCode).toBe('GOZ_2060');
            expect(result?.addonCode).toBeNull();
            expect(result?.billingCode?.startsWith('BEMA_')).toBe(false);
        });
    });

    describe('MKV: Channelized addon', () => {
        test('MKV with mehrkostenActive=true has allowGozAddon=true', () => {
            const intent = computeBillingIntent('MKV', true);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGoz).toBe(false);
            expect(intent.allowGozAddon).toBe(true);
        });

        test('MKV with mehrkostenActive=false has allowGozAddon=false', () => {
            const intent = computeBillingIntent('MKV', false);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGoz).toBe(false);
            expect(intent.allowGozAddon).toBe(false);
        });

        test('MKV with addon produces BEMA + GOZ', () => {
            const intent = computeBillingIntent('MKV', true);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, intent);

            expect(result?.billingCode).toBe('BEMA_13');
            expect(result?.addonCode).toBe('GOZ_2060');
        });

        test('MKV without addon produces only BEMA', () => {
            const intent = computeBillingIntent('MKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, intent);

            expect(result?.billingCode).toBe('BEMA_13');
            expect(result?.addonCode).toBeNull();
        });
    });

    describe('No Silent Defaults', () => {
        test('Empty surfaces returns null with reason', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: [] }, intent);

            expect(result?.billingCode).toBeNull();
            expect(result?.reason).toBe('surfaces_zero');
        });

        test('Missing surfaces returns null with reason', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, undefined, intent);

            expect(result?.billingCode).toBeNull();
            expect(result?.reason).toBe('surfaces_missing');
        });
    });

    describe('Backward Compatibility', () => {
        test('String insuranceType still works (GKV)', () => {
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, 'GKV');
            expect(result?.billingCode).toBe('BEMA_13');
        });

        test('String insuranceType still works (PKV)', () => {
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, 'PKV');
            expect(result?.billingCode).toBe('GOZ_2060');
        });

        test('String insuranceType MKV gets addon (backward compat default)', () => {
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, 'MKV');
            expect(result?.billingCode).toBe('BEMA_13');
            expect(result?.addonCode).toBe('GOZ_2060');
        });
    });
});
