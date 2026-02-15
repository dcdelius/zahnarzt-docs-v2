/**
 * Gate Test: M21 Endo Determinism 50x Core Flow
 *
 * Validates deterministic output for endo core flow scenarios.
 * Same input must produce identical output across 50 runs.
 */

import { describe, test, expect } from 'vitest';
import { getPack } from '../../v10/packs';
import { buildEndoFacts, detectEndoStep, detectCanalCount, detectEndoProcedureDetails } from '../../v7/medical/extractionToFacts/maps/endo.v1';

describe('gate-m21-determinism-50x-endo-core', () => {
    const pack = getPack('endo');
    const RUNS = 50;

    // ═══════════════════════════════════════════════════════════════
    // EXTRACTION DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('detectEndoStep is deterministic 50x', () => {
        const testText = 'Zahn 36 Trepanation, Aufbereitung 3 Kanäle, Wurzelfüllung warm';
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            results.push(detectEndoStep(testText));
        }

        expect(new Set(results).size).toBe(1);
        expect(results[0]).toBe('obturation'); // Should detect the final step
    });

    test('detectCanalCount is deterministic 50x', () => {
        const testText = 'Zahn 36, 3 Kanäle aufbereitet, maschinell';
        const results: (number | undefined)[] = [];

        for (let i = 0; i < RUNS; i++) {
            results.push(detectCanalCount(testText));
        }

        expect(new Set(results).size).toBe(1);
        expect(results[0]).toBe(3);
    });

    test('detectEndoProcedureDetails is deterministic 50x', () => {
        const testText = 'Kofferdam, NaOCl Spülung, EDTA, Ca(OH)2 Einlage';
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const details = detectEndoProcedureDetails(testText);
            results.push(JSON.stringify(details));
        }

        expect(new Set(results).size).toBe(1);

        const parsed = JSON.parse(results[0]);
        expect(parsed.kofferdam).toBe(true);
        expect(parsed.irrigationWithNaOCl).toBe(true);
        expect(parsed.irrigationWithEDTA).toBe(true);
        expect(parsed.medicationCalciumHydroxide).toBe(true);
    });

    test('buildEndoFacts is deterministic 50x', () => {
        const extracted = {
            rawDictation: 'Zahn 36 Trepanation, 3 Kanäle aufbereitet, NaOCl Spülung, Wurzelfüllung kalt',
            diagnosis: 'Pulpitis irreversibilis',
        };
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const facts = buildEndoFacts(extracted);
            results.push(JSON.stringify(facts, Object.keys(facts).sort()));
        }

        expect(new Set(results).size).toBe(1);
    });

    // ═══════════════════════════════════════════════════════════════
    // PACK SCENARIO DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('pack scenarios are returned in deterministic order 50x', () => {
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const scenarios = pack.getGoldenClinicalScenarios();
            results.push(scenarios.map(s => s.id).join(','));
        }

        expect(new Set(results).size).toBe(1);
    });

    test('pack combinability goldens are deterministic 50x', () => {
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const goldens = pack.getCombinabilityGoldens();
            results.push(goldens.map(g => g.id).join(','));
        }

        expect(new Set(results).size).toBe(1);
    });

    // ═══════════════════════════════════════════════════════════════
    // KB DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('KB chip order is deterministic 50x', () => {
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const kb = pack.getTreatmentKb()!;
            results.push(kb.chips.map(c => c.id).join(','));
        }

        expect(new Set(results).size).toBe(1);
    });

    test('KB chip billingRef values are stable 50x', () => {
        const results: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const kb = pack.getTreatmentKb()!;
            const billingData = kb.chips
                .filter(c => c.billingRef)
                .map(c => `${c.id}:${c.billingRef?.GKV || 'null'}|${c.billingRef?.PKV || 'null'}`)
                .join(';');
            results.push(billingData);
        }

        expect(new Set(results).size).toBe(1);
    });
});
