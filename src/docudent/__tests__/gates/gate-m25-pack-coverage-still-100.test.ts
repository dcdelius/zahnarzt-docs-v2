/**
 * Gate Test: M25 Pack Coverage Still 100%
 *
 * Ensures all packs maintain 100% coverage with empty allowlists.
 */

import { describe, test, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { runPackCoverage } from '../../v10/qa/packCoverage';

describe('gate-m25-pack-coverage-still-100', () => {
    const UI_ONLY_PACKS = ["extraction_stub"]; const packs = listPacks().filter(p => !UI_ONLY_PACKS.includes(p.id));

    test('all registered packs exist', () => {
        expect(packs.length).toBeGreaterThan(0);
    });

    for (const pack of packs) {
        test(`${pack.id} has 100% coverage`, async () => {
            const report = await runPackCoverage(pack);

            console.log(`\n📊 ${pack.id} Coverage:`);
            console.log(`   Total: ${report.totalBillingChips}`);
            console.log(`   Covered: ${report.billedChipIdsCovered.length}`);
            console.log(`   Allowlist: ${report.allowlistedMissing.length}`);

            expect(report.billedChipIdsCovered.length).toBe(report.totalBillingChips);
        }, 30000);

        test(`${pack.id} has empty allowlist`, async () => {
            const report = await runPackCoverage(pack);
            expect(report.allowlistedMissing.length).toBe(0);
        }, 30000);

        test(`${pack.id} has no violations`, async () => {
            const report = await runPackCoverage(pack);
            expect(report.violations).toEqual([]);
        }, 30000);
    }
});
