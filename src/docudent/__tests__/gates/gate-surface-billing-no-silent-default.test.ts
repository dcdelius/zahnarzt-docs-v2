/**
 * Gate Test: Surface Billing No Silent Default
 *
 * Verifies that the surface billing resolver NEVER silently defaults to 1 surface.
 * When surfaces are missing/ambiguous and surface_mapping is required, billingCode must be null.
 *
 * Contract: "No Silent Defaults" - surfaces=[]/undefined → billingCode:null + reason
 */

import { describe, test, expect } from 'vitest';
import { resolveSurfaceBilling, type SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';

const SURFACE_MAPPING: SurfaceMapping = {
    '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13' },
    '2': { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b' },
    '3': { GKV: 'BEMA_13c', PKV: 'GOZ_2100', MKV: 'BEMA_13c' },
    '4+': { GKV: 'BEMA_13d', PKV: 'GOZ_2120', MKV: 'BEMA_13d' },
};

describe('gate-surface-billing-no-silent-default', () => {
    // ═══════════════════════════════════════════════════════════════
    // NO SILENT DEFAULTS
    // ═══════════════════════════════════════════════════════════════

    test('[NO-DEFAULT-1] surfaces undefined → billingCode:null, reason:surfaces_missing', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, undefined, 'GKV');
        expect(result?.billingCode).toBeNull();
        expect(result?.reason).toBe('surfaces_missing');
    });

    test('[NO-DEFAULT-2] surfaces=[] → billingCode:null, reason:surfaces_zero', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: [] }, 'GKV');
        expect(result?.billingCode).toBeNull();
        expect(result?.reason).toBe('surfaces_zero');
    });

    test('[NO-DEFAULT-3] surfaceCount=0 → billingCode:null, reason:surfaces_zero', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 0 }, 'GKV');
        expect(result?.billingCode).toBeNull();
        expect(result?.reason).toBe('surfaces_zero');
    });

    // ═══════════════════════════════════════════════════════════════
    // VALID SURFACE RESOLUTIONS
    // ═══════════════════════════════════════════════════════════════

    test('[VALID-1] surfaces:["o"] → 1fl → BEMA_13 (GKV)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o'] }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13');
        expect(result?.surfaceCount).toBe(1);
        expect(result?.reason).toBeUndefined();
    });

    test('[VALID-2] surfaces:["o","d"] → 2fl → BEMA_13b (GKV)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13b');
        expect(result?.surfaceCount).toBe(2);
    });

    test('[VALID-3] surfaces:["m","o","d"] → 3fl → BEMA_13c (GKV)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd'] }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13c');
        expect(result?.surfaceCount).toBe(3);
    });

    test('[VALID-4] surfaces:["m","o","d","b"] → 4+fl → BEMA_13d (GKV)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13d');
        expect(result?.mappingKey).toBe('4+');
    });

    test('[VALID-5] surfaceCount:5 → 4+fl → BEMA_13d (GKV)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 5 }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13d');
        expect(result?.mappingKey).toBe('4+');
    });

    // ═══════════════════════════════════════════════════════════════
    // MKV SUPPORT
    // ═══════════════════════════════════════════════════════════════

    test('[MKV-1] MKV uses MKV key directly → BEMA codes', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'MKV');
        expect(result?.billingCode).toBe('BEMA_13b');
    });

    test('[MKV-2] MKV without explicit MKV key → falls back to GKV base', () => {
        const mappingWithoutMKV: SurfaceMapping = {
            '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060' },
        };
        const result = resolveSurfaceBilling(mappingWithoutMKV, { surfaces: ['o'] }, 'MKV');
        // MKV Two-Channel: falls back to GKV for base billing
        expect(result?.billingCode).toBe('BEMA_13');
        expect(result?.addonCode).toBeNull(); // No MKV_addon key
    });

    // ═══════════════════════════════════════════════════════════════
    // PKV
    // ═══════════════════════════════════════════════════════════════

    test('[PKV-1] PKV 2fl → GOZ_2080', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd'] }, 'PKV');
        expect(result?.billingCode).toBe('GOZ_2080');
    });
});
