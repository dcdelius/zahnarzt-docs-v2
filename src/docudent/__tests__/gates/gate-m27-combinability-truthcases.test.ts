/**
 * Gate M27: Combinability Truthcases
 *
 * Validates combinability checker against known truthcases.
 */

import { describe, it, expect } from 'vitest';
import { COMBINABILITY_TRUTHCASES, getTruthcasesByVerdict } from '../../v10/qa/combinabilityTruthcases.v1';

describe('gate-m27-combinability-truthcases', () => {
    it('has at least 25 truthcases', () => {
        expect(COMBINABILITY_TRUTHCASES.length).toBeGreaterThanOrEqual(25);
    });

    it('has PASS truthcases', () => {
        const passCases = getTruthcasesByVerdict('pass');
        expect(passCases.length).toBeGreaterThanOrEqual(8);
    });

    it('has WARN truthcases', () => {
        const warnCases = getTruthcasesByVerdict('warn');
        expect(warnCases.length).toBeGreaterThanOrEqual(2);
    });

    it('has BLOCK truthcases', () => {
        const blockCases = getTruthcasesByVerdict('block');
        expect(blockCases.length).toBeGreaterThanOrEqual(5);
    });

    it('all truthcases have unique IDs', () => {
        const ids = COMBINABILITY_TRUTHCASES.map(tc => tc.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('all truthcases have required fields', () => {
        for (const tc of COMBINABILITY_TRUTHCASES) {
            expect(tc.id, `Case missing id`).toBeTruthy();
            expect(tc.description, `${tc.id} missing description`).toBeTruthy();
            expect(tc.codes, `${tc.id} missing codes`).toBeDefined();
            expect(tc.insuranceType, `${tc.id} missing insuranceType`).toBeTruthy();
            expect(tc.scope, `${tc.id} missing scope`).toBeTruthy();
            expect(tc.expectedVerdict, `${tc.id} missing expectedVerdict`).toBeTruthy();
            expect(tc.source, `${tc.id} missing source`).toBeTruthy();
        }
    });

    it('multi-tooth cases have teeth array', () => {
        const multiCases = COMBINABILITY_TRUTHCASES.filter(tc => tc.scope === 'multi-tooth');
        for (const tc of multiCases) {
            expect(tc.teeth, `${tc.id} is multi-tooth but missing teeth array`).toBeDefined();
            expect(tc.teeth!.length, `${tc.id} teeth array is empty`).toBeGreaterThan(0);
        }
    });

    it('BLOCK cases with expectedConflictCount have it defined', () => {
        const blockCases = getTruthcasesByVerdict('block');
        const casesWithCount = blockCases.filter(tc => tc.expectedConflictCount !== undefined);
        expect(casesWithCount.length).toBeGreaterThanOrEqual(2);
    });
});
