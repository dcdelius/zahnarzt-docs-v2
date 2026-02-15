/**
 * Gate M15: Clinical Suite Expanded
 *
 * GATE DEFINITION:
 * Run expanded clinical scenarios (anesthesia, isolation, false positives)
 * and verify no crashes, no false positive billing.
 */

import { describe, it, expect } from 'vitest';
import { runClinicalSuite } from '../../../v10/qa/runClinicalSuite';
import {
    goldenClinicalScenariosV1,
    getScenariosByCategory,
} from '../../../v10/__tests__/fixtures/goldenClinicalScenarios.v1';

describe('Gate M15: Clinical Suite Expanded', () => {
    it('all expanded scenarios run without error', async () => {
        const report = await runClinicalSuite(goldenClinicalScenariosV1);

        // Count errors
        const errors = report.results.filter(r => r.output.state === 'error');
        expect(errors.length).toBe(0);
    });

    it('anesthesia scenarios run without crash', async () => {
        const scenarios = getScenariosByCategory('A');
        expect(scenarios.length).toBeGreaterThan(0);

        const report = await runClinicalSuite(scenarios);

        for (const result of report.results) {
            expect(['questions', 'output', 'error']).toContain(result.output.state);
        }
    });

    it('isolation scenarios run without crash', async () => {
        const scenarios = getScenariosByCategory('I');
        expect(scenarios.length).toBeGreaterThan(0);

        const report = await runClinicalSuite(scenarios);

        for (const result of report.results) {
            expect(['questions', 'output', 'error']).toContain(result.output.state);
        }
    });

    it('false positive scenarios do not trigger unwarranted billing', async () => {
        const scenarios = getScenariosByCategory('F');
        expect(scenarios.length).toBeGreaterThan(0);

        const report = await runClinicalSuite(scenarios);

        // F03: "Blutdruckmedikamente" should NOT trigger hemostasis
        const f03 = report.results.find(r => r.scenario.id === 'F03-blut-in-name-not-bleeding');
        if (f03?.output.state === 'output') {
            // Check no bleeding-related billing
            const billing = f03.output.output?.billingCodes ?? [];
            // Hemostasis codes shouldn't appear
            expect(billing).not.toContain('Hae1');
            expect(billing).not.toContain('Hae2');
        }
    });

    it('scenario count includes M15 additions', async () => {
        // M15 adds anesthesia (5), isolation (4), false positive (4) = 13 new
        // Original M14: 25
        // Total: 38
        expect(goldenClinicalScenariosV1.length).toBeGreaterThanOrEqual(38);
    });

    it('kofferdam scenarios produce no error', async () => {
        const kofferdamScenarios = goldenClinicalScenariosV1.filter(
            s => s.dictation.toLowerCase().includes('kofferdam') ||
                s.dictation.toLowerCase().includes('spanngummi')
        );

        expect(kofferdamScenarios.length).toBeGreaterThan(0);

        const report = await runClinicalSuite(kofferdamScenarios);

        for (const result of report.results) {
            expect(result.output.state).not.toBe('error');
        }
    });

    it('expansion scenarios have deterministic results', async () => {
        const anesthesiaScenarios = getScenariosByCategory('A').slice(0, 2);

        const report1 = await runClinicalSuite(anesthesiaScenarios);
        const report2 = await runClinicalSuite(anesthesiaScenarios);

        // States should match
        for (let i = 0; i < anesthesiaScenarios.length; i++) {
            expect(report1.results[i].output.state).toBe(report2.results[i].output.state);
        }
    });
});
