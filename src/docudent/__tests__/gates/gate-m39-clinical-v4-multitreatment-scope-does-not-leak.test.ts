/**
 * Gate M39: Multitreatment Scope Does Not Leak
 */

import { describe, it, expect } from 'vitest';
import { clinicalTruthcasesV4 } from '../../v10/qa/clinicalTruthcases.v4';
import { parseScopedDictation, attributeStatement } from '../../v10/qa/segmentScoping';

describe('gate-m39-clinical-v4-multitreatment-scope-does-not-leak', () => {
    const multiCases = clinicalTruthcasesV4.filter(c => c.id.startsWith('v4_multi'));

    it('has 10 multi-treatment truthcases', () => {
        expect(multiCases.length).toBe(10);
    });

    describe('segmentScoping prevents leakage', () => {
        it('danach marker separates clauses', () => {
            const scoped = parseScopedDictation('Endo LA, danach Füllung ohne LA');
            expect(scoped.clauses.length).toBeGreaterThanOrEqual(2);
        });

        it('zusätzlich marker separates clauses', () => {
            const scoped = parseScopedDictation('WKB 14, zusätzlich Füllung');
            expect(scoped.clauses.length).toBeGreaterThanOrEqual(2);
        });

        it('anschließend marker separates clauses', () => {
            const scoped = parseScopedDictation('Endo, anschließend Füllung');
            expect(scoped.clauses.length).toBeGreaterThanOrEqual(2);
        });

        it('ohne in second clause only affects fuellung', () => {
            const scoped = parseScopedDictation('Endo LA, danach Füllung ohne Betäubung');
            const ohneScope = attributeStatement('ohne betäubung', scoped);
            // Should NOT be 'endo' - negation in fuellung clause
            expect(ohneScope).not.toBe('endo');
        });
    });

    describe('truthcase contracts specify per-instance expectations', () => {
        it('v4_multi_endo_la_fuellung_ohne has byInstance', () => {
            const tc = multiCases.find(c => c.id === 'v4_multi_endo_la_fuellung_ohne');
            expect(tc?.contractV2.byInstance).toBeDefined();
            expect(tc?.contractV2.byInstance?.endo).toBeDefined();
            expect(tc?.contractV2.byInstance?.fuellung).toBeDefined();
        });
    });
});
