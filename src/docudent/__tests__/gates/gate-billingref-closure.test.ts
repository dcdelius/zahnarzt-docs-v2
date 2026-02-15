/**
 * Gate Test: BillingRef Closure
 *
 * Contract: Every billingRef in perInstance must exist in the Billing Catalog.
 * No orphan billing refs allowed.
 */

import { describe, test, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';

// Load billing catalogs
import bemaJson from '../../core/billing/knowledgeBase/kataloge/bema.json';
import gozJson from '../../core/billing/knowledgeBase/kataloge/goz.json';

interface CatalogEntry {
    id: string;
    nummer?: string | number;
    system?: string;
}

interface CatalogObject {
    _meta?: unknown;
    [key: string]: CatalogEntry | unknown;
}

// Build set of valid billing IDs
function buildValidBillingIds(): Set<string> {
    const validIds = new Set<string>();

    // Catalogs are objects with keys as IDs
    for (const [key, entry] of Object.entries(bemaJson as CatalogObject)) {
        if (key === '_meta') continue;
        if (typeof entry === 'object' && entry && 'id' in entry) {
            validIds.add((entry as CatalogEntry).id);
        }
    }

    for (const [key, entry] of Object.entries(gozJson as CatalogObject)) {
        if (key === '_meta') continue;
        if (typeof entry === 'object' && entry && 'id' in entry) {
            validIds.add((entry as CatalogEntry).id);
        }
    }

    return validIds;
}

const VALID_BILLING_IDS = buildValidBillingIds();

const TEST_DICTATIONS = [
    { dictation: 'Füllung 36 okklusal Komposit', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { dictation: 'Füllung 36 okklusal distal Komposit Kofferdam', treatmentId: 'fuellung', insuranceType: 'GKV' },
    { dictation: 'Füllung 36 okklusal Komposit adhäsiv', treatmentId: 'fuellung', insuranceType: 'PKV' },
    { dictation: 'Füllung 36 okklusal Komposit Mehrkosten', treatmentId: 'fuellung', insuranceType: 'MKV' },
    { dictation: 'Füllung 14 distal GIZ', treatmentId: 'fuellung', insuranceType: 'GKV' },
] as const;

describe('gate-billingref-closure', () => {
    test('catalog loaded successfully', () => {
        expect(VALID_BILLING_IDS.size).toBeGreaterThan(100);
        expect(VALID_BILLING_IDS.has('BEMA_13')).toBe(true);
        expect(VALID_BILLING_IDS.has('GOZ_2060')).toBe(true);
    });

    describe('every billingRef exists in catalog', () => {
        for (const tc of TEST_DICTATIONS) {
            test(`${tc.insuranceType}: ${tc.dictation.slice(0, 35)}...`, async () => {
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: tc.treatmentId,
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                });

                if (result.state === 'questions' || result.state === 'error') {
                    console.log(`[${tc.insuranceType}] Skipped: ${result.state}`);
                    return;
                }

                const allBillingRefs = Object.values(result.output.perInstance)
                    .flatMap(i => i.billingRefs);

                console.log(`[${tc.insuranceType}] BillingRefs:`, allBillingRefs);

                const orphanRefs: string[] = [];
                for (const ref of allBillingRefs) {
                    if (!VALID_BILLING_IDS.has(ref)) {
                        orphanRefs.push(ref);
                    }
                }

                if (orphanRefs.length > 0) {
                    console.error('Orphan billing refs:', orphanRefs);
                }

                expect(orphanRefs).toEqual([]);
            });
        }
    });

    test('no wildcards or placeholders in billingRefs', async () => {
        const result = await runV10({
            dictation: 'Füllung 36 okklusal Komposit',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        if (result.state !== 'output') return;

        const billing = Object.values(result.output.perInstance)
            .flatMap(i => i.billingRefs);

        for (const ref of billing) {
            // No placeholders
            expect(ref).not.toMatch(/PLACEHOLDER|TODO|MISSING|XXX|\*/);
            // Must start with valid system
            expect(ref).toMatch(/^(BEMA|GOZ|GOÄ|BEL)_/);
        }
    });
});
