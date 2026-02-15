/**
 * Gate Test: M23 Endo Allowlist Elimination
 *
 * Validates that endo pack achieves 0 allowlist.
 */

import { describe, test, expect } from 'vitest';
import { getPack } from '../../v10/packs';
import { runPackCoverage } from '../../v10/qa/packCoverage';

describe('gate-m23-endo-allowlist-eliminated', () => {
    const pack = getPack('endo');

    test('endo allowlist is 0', async () => {
        const report = await runPackCoverage(pack);

        console.log(`\n🎯 M23 Allowlist Elimination:`);
        console.log(`   Total chips: ${report.totalBillingChips}`);
        console.log(`   Covered: ${report.billedChipIdsCovered.length}`);
        console.log(`   Allowlisted: ${report.allowlistedMissing.length}`);

        expect(report.allowlistedMissing.length).toBe(0);
    }, 30000);

    test('all 17 billing chips are covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered.length).toBe(17);
    }, 30000);

    test('LA chips are now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('la_leitung');
        expect(report.billedChipIdsCovered).toContain('la_infiltr');
    }, 30000);

    test('WF technique chips are now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('wf_warm');
        expect(report.billedChipIdsCovered).toContain('wf_einzel');
        expect(report.billedChipIdsCovered).toContain('wf_kalt');
    }, 30000);

    test('diagnostic X-ray is now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('roentgen_einzelzahn');
    }, 30000);

    test('post-endo buildup is now covered', async () => {
        const report = await runPackCoverage(pack);
        expect(report.billedChipIdsCovered).toContain('aufbau_postendo');
    }, 30000);

    test('no coverage violations', async () => {
        const report = await runPackCoverage(pack);
        expect(report.violations).toEqual([]);
    }, 30000);
});
