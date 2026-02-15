/**
 * Gate Test: M24 Fuellung Allowlist Eliminated
 *
 * Validates that fuellung pack achieves 0 allowlist.
 */

import { describe, test, expect } from 'vitest';
import { getPack } from '../../v10/packs';
import { runPackCoverage } from '../../v10/qa/packCoverage';

describe('gate-m24-fuellung-allowlist-eliminated', () => {
    const pack = getPack('fuellung');

    test('fuellung allowlist is 0', async () => {
        const report = await runPackCoverage(pack);

        console.log(`\n🎯 M24 Fuellung Allowlist Elimination:`);
        console.log(`   Total chips: ${report.totalBillingChips}`);
        console.log(`   Covered: ${report.billedChipIdsCovered.length}`);
        console.log(`   Allowlisted: ${report.allowlistedMissing.length}`);
        console.log(`   Covered chips: ${report.billedChipIdsCovered.join(', ')}`);

        expect(report.allowlistedMissing.length).toBe(0);
    }, 30000);

    test('all 7 billing chips are covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered.length).toBe(7);
    }, 30000);

    test('LA chips are now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('la_leitung');
        expect(report.billedChipIdsCovered).toContain('la_infiltr');
    }, 30000);

    test('kofferdam is now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('kofferdam');
    }, 30000);

    test('P (direct capping) is now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('p');
    }, 30000);

    test('fluor is now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('fluor');
    }, 30000);

    test('no coverage violations', async () => {
        const report = await runPackCoverage(pack);
        expect(report.violations).toEqual([]);
    }, 30000);
});
