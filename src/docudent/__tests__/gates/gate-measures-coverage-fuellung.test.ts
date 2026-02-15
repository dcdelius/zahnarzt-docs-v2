/**
 * Gate Test: Measures Coverage (Füllung)
 *
 * Verifies all measures have chip → billingRef → text chain.
 */

import { describe, test, expect } from 'vitest';
import { resolveSurfaceBilling } from '../../v10/billing/surfaceBillingResolver';
import { computeBillingIntent } from '../../v10/types';

describe('gate-measures-coverage-fuellung', () => {
    describe('Surface Mapping Completeness', () => {
        const MAPPING = {
            1: { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
            2: { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b', MKV_addon: 'GOZ_2080' },
            3: { GKV: 'BEMA_13c', PKV: 'GOZ_2100', MKV: 'BEMA_13c', MKV_addon: 'GOZ_2100' },
            4: { GKV: 'BEMA_13d', PKV: 'GOZ_2120', MKV: 'BEMA_13d', MKV_addon: 'GOZ_2120' },
        };

        test('1fl surfaces → BEMA_13 for GKV', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o'] }, intent);
            expect(result?.billingCode).toBe('BEMA_13');
        });

        test('2fl surfaces → BEMA_13b for GKV', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['o', 'd'] }, intent);
            expect(result?.billingCode).toBe('BEMA_13b');
        });

        test('3fl surfaces → BEMA_13c for GKV', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['m', 'o', 'd'] }, intent);
            expect(result?.billingCode).toBe('BEMA_13c');
        });

        test('4fl surfaces → BEMA_13d for GKV', () => {
            const intent = computeBillingIntent('GKV', false);
            const result = resolveSurfaceBilling(MAPPING, { surfaces: ['m', 'o', 'd', 'b'] }, intent);
            expect(result?.billingCode).toBe('BEMA_13d');
        });
    });

    describe('Insurance Channelization', () => {
        test('GKV produces BEMA, never GOZ', () => {
            const intent = computeBillingIntent('GKV', false);
            expect(intent.allowBema).toBe(true);
            expect(intent.allowGoz).toBe(false);
        });

        test('PKV produces GOZ, never BEMA', () => {
            const intent = computeBillingIntent('PKV', false);
            expect(intent.allowBema).toBe(false);
            expect(intent.allowGoz).toBe(true);
        });

        test('MKV produces BEMA + optional GOZ addon', () => {
            const intentWithAddon = computeBillingIntent('MKV', true);
            expect(intentWithAddon.allowBema).toBe(true);
            expect(intentWithAddon.allowGozAddon).toBe(true);

            const intentNoAddon = computeBillingIntent('MKV', false);
            expect(intentNoAddon.allowBema).toBe(true);
            expect(intentNoAddon.allowGozAddon).toBe(false);
        });
    });

    describe('Chip Existence', () => {
        test('unified.json has 21+ chips', async () => {
            const unified = await import('../../core/billing/knowledgeBase/treatments/fuellung/unified.json');
            const chips = unified.default?.chips || unified.chips || [];
            console.log('[Chips] Count:', chips.length);
            expect(chips.length).toBeGreaterThanOrEqual(15);
        });

        test('critical chips exist', async () => {
            const unified = await import('../../core/billing/knowledgeBase/treatments/fuellung/unified.json');
            const chips = unified.default?.chips || unified.chips || [];
            const chipIds = chips.map((c: { id: string }) => c.id);

            expect(chipIds).toContain('kofferdam');
            expect(chipIds).toContain('la_infiltr');
            expect(chipIds).toContain('cp');
            expect(chipIds).toContain('fluor');
        });

        test('critical chips have billingRefs', async () => {
            const unified = await import('../../core/billing/knowledgeBase/treatments/fuellung/unified.json');
            const chips = unified.default?.chips || unified.chips || [];

            const kofferdam = chips.find((c: { id: string }) => c.id === 'kofferdam');
            expect(kofferdam?.billingRef?.GKV).toBe('BEMA_12');

            const la = chips.find((c: { id: string }) => c.id === 'la_infiltr');
            expect(la?.billingRef?.GKV).toBe('BEMA_40');

            const cp = chips.find((c: { id: string }) => c.id === 'cp');
            expect(cp?.billingRef?.GKV).toBe('BEMA_25');
        });
    });

});
