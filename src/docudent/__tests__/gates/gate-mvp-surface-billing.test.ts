/**
 * Gate Test: Surface Billing Resolver
 *
 * Tests that F-codes are correctly resolved from surface_mapping
 * when chips have billingRef:null and hinweis contains "surface_mapping".
 */

import { describe, test, expect } from 'vitest';
import { resolveSurfaceBilling, chipUsesSurfaceMapping, type SurfaceMapping } from '../../v10/billing/surfaceBillingResolver';
import { runV10 } from '../../v10/pipeline/runV10';

describe('gate-mvp-surface-billing', () => {
    // ═══════════════════════════════════════════════════════════════
    // UNIT TESTS
    // ═══════════════════════════════════════════════════════════════

    const SURFACE_MAPPING: SurfaceMapping = {
        '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13' },
        '2': { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b' },
        '3': { GKV: 'BEMA_13c', PKV: 'GOZ_2100', MKV: 'BEMA_13c' },
        '4+': { GKV: 'BEMA_13d', PKV: 'GOZ_2120', MKV: 'BEMA_13d' },
    };

    test('resolves 1-surface GKV to BEMA_13', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 1 }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13');
        expect(result?.mappingKey).toBe('1');
    });

    test('resolves 2-surface PKV to GOZ_2080', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 2 }, 'PKV');
        expect(result?.billingCode).toBe('GOZ_2080');
        expect(result?.mappingKey).toBe('2');
    });

    test('resolves 3-surface GKV to BEMA_13c', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaces: ['o', 'd', 'm'] }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13c');
        expect(result?.surfaceCount).toBe(3);
    });

    test('resolves 4+ surfaces to BEMA_13d', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 5 }, 'GKV');
        expect(result?.billingCode).toBe('BEMA_13d');
        expect(result?.mappingKey).toBe('4+');
    });

    test('MKV uses MKV key (BEMA codes)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, { surfaceCount: 1 }, 'MKV');
        expect(result?.billingCode).toBe('BEMA_13');
    });

    test('returns null when surfaces not specified (no silent default)', () => {
        const result = resolveSurfaceBilling(SURFACE_MAPPING, undefined, 'GKV');
        expect(result?.billingCode).toBeNull();
        expect(result?.reason).toBe('surfaces_missing');
    });

    test('chipUsesSurfaceMapping detects correct chips', () => {
        expect(chipUsesSurfaceMapping({
            billingRef: null,
            hinweis: 'F-Code wird durch surface_mapping bestimmt',
        })).toBe(true);

        expect(chipUsesSurfaceMapping({
            billingRef: null,
            hinweis: 'Just some other note',
        })).toBe(false);

        expect(chipUsesSurfaceMapping({
            billingRef: { GKV: 'BEMA_12' },
            hinweis: 'surface_mapping',
        })).toBe(false);
    });

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION TESTS
    // ═══════════════════════════════════════════════════════════════

    test('pipeline: 1-surface GKV produces BEMA_13', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const instance = result.output.perInstance['fuellung-36-1'];
            expect(instance).toBeDefined();
            expect(instance.billingRefs).toContain('BEMA_13');
        }
    });

    test('pipeline: 1-surface PKV produces GOZ_2060', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit adhäsiv',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const instance = result.output.perInstance['fuellung-36-1'];
            expect(instance).toBeDefined();
            expect(instance.billingRefs).toContain('GOZ_2060');
        }
    });

    test('pipeline: multi-tooth produces separate billing per instance', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 und 37 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            expect(Object.keys(result.output.perInstance).length).toBe(2);
            for (const instance of Object.values(result.output.perInstance)) {
                expect(instance.billingRefs).toContain('BEMA_13');
            }
        }
    });

    test('pipeline: Kofferdam adds BEMA_12 alongside F-code', async () => {
        const result = await runV10({
            dictation: 'Füllung 46 mod Komposit mit Kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('output');
        if (result.state === 'output') {
            const instance = result.output.perInstance['fuellung-46-1'];
            expect(instance).toBeDefined();
            // mod = 3 surfaces = BEMA_13c, plus Kofferdam
            expect(instance.billingRefs).toContain('BEMA_13c');
            expect(instance.billingRefs).toContain('BEMA_12');
        }
    });
});
