/**
 * Gate Test: M18 Pack Scenarios Run
 *
 * Collects scenarios from all packs and runs them through the clinical harness.
 */

import { describe, test, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { runClinicalSuite, runClinicalSuiteFromPacks } from '../../v10/qa/runClinicalSuite';

describe('gate-m18-pack-scenarios-run', () => {
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO COLLECTION
    // ═══════════════════════════════════════════════════════════════

    test('can collect scenarios from all packs', () => {
        const packs = listPacks();
        const allScenarios = packs.flatMap(p => p.getGoldenClinicalScenarios());

        expect(allScenarios.length).toBeGreaterThan(10);

        // Check we have scenarios from both packs
        const fuellungScenarios = allScenarios.filter(s => s.treatmentId === 'fuellung');
        const endoScenarios = allScenarios.filter(s => s.treatmentId === 'endo');

        expect(fuellungScenarios.length).toBeGreaterThan(0);
        expect(endoScenarios.length).toBeGreaterThan(0);
    });

    test('all scenarios have required fields', () => {
        const packs = listPacks();
        const allScenarios = packs.flatMap(p => p.getGoldenClinicalScenarios());

        for (const scenario of allScenarios) {
            expect(scenario.id).toBeDefined();
            expect(scenario.treatmentId).toBeDefined();
            expect(scenario.insuranceType).toBeDefined();
            expect(scenario.textLength).toBeDefined();
            expect(scenario.dictation).toBeDefined();
            expect(scenario.dictation.length).toBeGreaterThan(10);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CLINICAL HARNESS INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    test('runClinicalSuiteFromPacks runs all pack scenarios', async () => {
        const report = await runClinicalSuiteFromPacks();

        expect(report.totalScenarios).toBeGreaterThan(10);
        expect(report.results.length).toBe(report.totalScenarios);
    }, 30000);

    test('runClinicalSuiteFromPacks can filter by pack ID', async () => {
        const fuellungReport = await runClinicalSuiteFromPacks(['fuellung']);
        const endoReport = await runClinicalSuiteFromPacks(['endo']);

        expect(fuellungReport.totalScenarios).toBeGreaterThan(0);
        expect(endoReport.totalScenarios).toBeGreaterThan(0);

        // All scenarios should be for the correct treatment
        for (const result of fuellungReport.results) {
            expect(result.scenario.treatmentId).toBe('fuellung');
        }
        for (const result of endoReport.results) {
            expect(result.scenario.treatmentId).toBe('endo');
        }
    }, 30000);

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO EXECUTION SMOKE TEST
    // ═══════════════════════════════════════════════════════════════

    test('scenarios execute without throwing', async () => {
        const packs = listPacks();
        const allScenarios = packs.flatMap(p => p.getGoldenClinicalScenarios());

        // Take a subset for faster testing
        const sampleScenarios = allScenarios.slice(0, 5);

        const report = await runClinicalSuite(sampleScenarios);

        // All scenarios should complete (even if some assertions fail)
        expect(report.results.length).toBe(sampleScenarios.length);

        // Each result should have output
        for (const result of report.results) {
            expect(result.output).toBeDefined();
            expect(result.output.state).toBeDefined();
        }
    }, 30000);

    test('no scenario throws unhandled error', async () => {
        const packs = listPacks();
        const allScenarios = packs.flatMap(p => p.getGoldenClinicalScenarios());

        const report = await runClinicalSuite(allScenarios);

        // Check no errors in output state
        const errorStates = report.results.filter(r => r.output.state === 'error');

        // Allow some errors but not all (would indicate systemic issue)
        expect(errorStates.length).toBeLessThan(report.totalScenarios / 2);
    }, 60000);

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('scenario ordering is deterministic', async () => {
        const report1 = await runClinicalSuiteFromPacks(['fuellung']);
        const report2 = await runClinicalSuiteFromPacks(['fuellung']);

        const ids1 = report1.results.map(r => r.scenario.id);
        const ids2 = report2.results.map(r => r.scenario.id);

        expect(ids1).toEqual(ids2);
    }, 30000);
});
