/**
 * M20: Pack Coverage Helper
 *
 * Computes billing chip coverage for treatment packs.
 * Ensures all billing chips are either:
 * - Covered by at least one golden scenario
 * - Explicitly allowlisted with justification
 */

import type { TreatmentPack, CoverageConfig } from '../packs/types';
import type { TreatmentKb, TreatmentKbChip } from '../kb/treatment/types';
import { runClinicalSuite, type ClinicalScenarioResult } from './runClinicalSuite';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CoverageReport {
    /** Pack ID */
    packId: string;
    /** Pack version */
    version: string;

    // === Coverage Stats ===
    /** Total billing chips in KB */
    totalBillingChips: number;
    /** Billing chips covered by scenarios */
    billedChipIdsCovered: string[];
    /** Billing chips missing coverage */
    billedChipIdsMissing: string[];
    /** Missing chips that are allowlisted */
    allowlistedMissing: string[];
    /** Violations: missing but NOT allowlisted */
    violations: string[];

    // === Scenario Stats ===
    /** Number of scenarios run */
    scenarioCount: number;
    /** Scenarios that passed */
    passedCount: number;
    /** Scenarios that failed */
    failedCount: number;

    // === Summary ===
    /** Whether coverage passes (no violations) */
    passed: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COVERAGE COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get all billing chip IDs from a treatment KB.
 * A chip is a "billing chip" if it has a non-null billingRef with at least one code.
 */
function getBillingChipIds(kb: TreatmentKb): string[] {
    const billingChips: string[] = [];

    for (const chip of kb.chips) {
        if (chip.billingRef && (chip.billingRef.GKV || chip.billingRef.PKV)) {
            billingChips.push(chip.id);
        }
    }

    return billingChips.sort();
}

/**
 * Extract emitted chip IDs from scenario results.
 */
function getEmittedChipIds(results: ClinicalScenarioResult[]): Set<string> {
    const emitted = new Set<string>();

    for (const result of results) {
        // Get chips from trace
        const chips = result.chips ?? [];
        for (const chip of chips) {
            emitted.add(chip);
        }
    }

    return emitted;
}

/**
 * Run pack coverage analysis.
 */
export async function runPackCoverage(pack: TreatmentPack): Promise<CoverageReport> {
    const kb = pack.getTreatmentKb();
    if (!kb) {
        return {
            packId: pack.id,
            version: pack.version,
            totalBillingChips: 0,
            billedChipIdsCovered: [],
            billedChipIdsMissing: [],
            allowlistedMissing: [],
            violations: ['KB_NOT_FOUND'],
            scenarioCount: 0,
            passedCount: 0,
            failedCount: 0,
            passed: false,
        };
    }

    // Get all billing chips from KB
    const allBillingChips = getBillingChipIds(kb);

    // Run scenarios
    const scenarios = pack.getGoldenClinicalScenarios();
    const suiteReport = await runClinicalSuite(scenarios);

    // Get emitted chips
    const emittedChips = getEmittedChipIds(suiteReport.results);

    // Compute coverage
    const covered: string[] = [];
    const missing: string[] = [];

    for (const chipId of allBillingChips) {
        if (emittedChips.has(chipId)) {
            covered.push(chipId);
        } else {
            missing.push(chipId);
        }
    }

    // Get allowlist from pack
    const coverageConfig = pack.getCoverageConfig?.() || {};
    const allowlist = new Set(coverageConfig.uncoveredBillingChipIds ?? []);

    // Compute violations and allowlisted
    const allowlistedMissing: string[] = [];
    const violations: string[] = [];

    for (const chipId of missing) {
        if (allowlist.has(chipId)) {
            allowlistedMissing.push(chipId);
        } else {
            violations.push(chipId);
        }
    }

    return {
        packId: pack.id,
        version: pack.version,
        totalBillingChips: allBillingChips.length,
        billedChipIdsCovered: covered.sort(),
        billedChipIdsMissing: missing.sort(),
        allowlistedMissing: allowlistedMissing.sort(),
        violations: violations.sort(),
        scenarioCount: suiteReport.totalScenarios,
        passedCount: suiteReport.passedCount,
        failedCount: suiteReport.failedCount,
        passed: violations.length === 0,
    };
}

/**
 * Run coverage for all packs.
 */
export async function runAllPacksCoverage(): Promise<CoverageReport[]> {
    // Dynamic import to avoid circular deps
    const { listPacks } = await import('../packs');

    const reports: CoverageReport[] = [];

    for (const pack of listPacks()) {
        const report = await runPackCoverage(pack);
        reports.push(report);
    }

    return reports.sort((a, b) => a.packId.localeCompare(b.packId));
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════

/**
 * Format coverage report for human reading.
 */
export function formatPackCoverageReport(report: CoverageReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`  COVERAGE REPORT: ${report.packId} v${report.version}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // Stats
    lines.push(`Billing Chips: ${report.totalBillingChips}`);
    lines.push(`  Covered: ${report.billedChipIdsCovered.length}`);
    lines.push(`  Missing: ${report.billedChipIdsMissing.length}`);
    lines.push(`    Allowlisted: ${report.allowlistedMissing.length}`);
    lines.push(`    Violations: ${report.violations.length}`);
    lines.push('');

    // Scenarios
    lines.push(`Scenarios: ${report.scenarioCount}`);
    lines.push(`  Passed: ${report.passedCount}`);
    lines.push(`  Failed: ${report.failedCount}`);
    lines.push('');

    // Covered chips
    if (report.billedChipIdsCovered.length > 0) {
        lines.push('Covered Chips:');
        for (const chip of report.billedChipIdsCovered) {
            lines.push(`  ✓ ${chip}`);
        }
        lines.push('');
    }

    // Missing chips
    if (report.billedChipIdsMissing.length > 0) {
        lines.push('Missing Coverage:');
        for (const chip of report.allowlistedMissing) {
            lines.push(`  ⚠ ${chip} (allowlisted)`);
        }
        for (const chip of report.violations) {
            lines.push(`  ✗ ${chip} (VIOLATION)`);
        }
        lines.push('');
    }

    // Result
    if (report.passed) {
        lines.push('✅ PASSED: All billing chips covered or allowlisted');
    } else {
        lines.push('❌ FAILED: Uncovered billing chips found');
        lines.push('');
        lines.push('To fix:');
        lines.push('  1. Add scenarios that emit missing chips, OR');
        lines.push('  2. Add to getCoverageConfig().uncoveredBillingChipIds with justification');
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
}
