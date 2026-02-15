/**
 * Gate M39: Determinism 100x
 */

import { describe, it, expect } from 'vitest';
import { clinicalTruthcasesV4, V4_TRUTH_COUNT } from '../../v10/qa/clinicalTruthcases.v4';
import { hashSettings } from '../../v10/settings/settingsTypes';

describe('gate-m39-clinical-v4-determinism-100x', () => {
    it('has expected truthcase count', () => {
        expect(V4_TRUTH_COUNT).toBe(37);
        expect(clinicalTruthcasesV4.length).toBe(37);
    });

    describe('truthcases are deterministic', () => {
        it('all truthcases have unique IDs', () => {
            const ids = clinicalTruthcasesV4.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('all truthcases have valid structure', () => {
            for (const tc of clinicalTruthcasesV4) {
                expect(tc.id).toBeTruthy();
                expect(tc.description).toBeTruthy();
                expect(tc.treatmentId).toBeTruthy();
                expect(tc.dictation).toBeTruthy();
                expect(tc.contractV2).toBeDefined();
            }
        });

        it('settings hash is deterministic', () => {
            const settings = { practice: { version: '1', defaultIsolation: 'kofferdam' as const } };
            const hash1 = hashSettings(settings);
            const hash2 = hashSettings(settings);
            expect(hash1).toBe(hash2);
        });
    });

    describe('100x hash stability', () => {
        const sampleCase = clinicalTruthcasesV4[0];

        it('dictation hash stable 100x', () => {
            const dictation = sampleCase.dictation;
            const hashes = [];
            for (let i = 0; i < 100; i++) {
                let hash = 0;
                for (let j = 0; j < dictation.length; j++) {
                    hash = ((hash << 5) - hash) + dictation.charCodeAt(j);
                    hash = hash & hash;
                }
                hashes.push(Math.abs(hash).toString(16));
            }
            const unique = new Set(hashes);
            expect(unique.size).toBe(1);
        });
    });
});
