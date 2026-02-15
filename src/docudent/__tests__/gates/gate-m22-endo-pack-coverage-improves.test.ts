/**
 * Gate Test: M22 Endo Pack Coverage Improves
 *
 * Validates that M22 chip emission rules improve coverage significantly.
 */

import { describe, test, expect } from 'vitest';
import { getPack } from '../../v10/packs';
import { runPackCoverage } from '../../v10/qa/packCoverage';

describe('gate-m22-endo-pack-coverage-improves', () => {
    const pack = getPack('endo');

    test('endo coverage is no longer 0', async () => {
        const report = await runPackCoverage(pack);

        // M22 achievement: coverage > 0
        expect(report.billedChipIdsCovered.length).toBeGreaterThan(0);

        console.log(`\n✅ M22 Coverage Achievement:`);
        console.log(`   Covered chips: ${report.billedChipIdsCovered.length}`);
        console.log(`   Chips covered: ${report.billedChipIdsCovered.join(', ')}`);
    }, 30000);

    test('endo allowlist shrinks significantly (≤ 6)', async () => {
        const report = await runPackCoverage(pack);

        // M22 target: allowlist ≤ 6 (down from 17)
        expect(report.allowlistedMissing.length).toBeLessThanOrEqual(6);

        console.log(`\n📊 Allowlist Status:`);
        console.log(`   Allowlisted: ${report.allowlistedMissing.length}`);
        console.log(`   Remaining: ${report.allowlistedMissing.join(', ')}`);
    }, 30000);

    test('no coverage violations', async () => {
        const report = await runPackCoverage(pack);
        expect(report.violations).toEqual([]);
    }, 30000);

    test('at least 10 billing chips are now covered', async () => {
        const report = await runPackCoverage(pack);

        // M22: dramatic improvement from 0 → 10+
        expect(report.billedChipIdsCovered.length).toBeGreaterThanOrEqual(10);
    }, 30000);
});
