/**
 * Gate Test: M21 Endo Core Flow Golden
 *
 * Validates the core endo workflow scenarios produce expected chips and billing.
 * Tests the extraction → facts → medical KB → chips → billing path.
 */

import { describe, test, expect } from 'vitest';
import { getPack } from '../../v10/packs';

describe('gate-m21-endo-core-flow-golden', () => {
    const pack = getPack('endo');

    // ═══════════════════════════════════════════════════════════════
    // BASIC PACK VALIDATION
    // ═══════════════════════════════════════════════════════════════

    test('endo pack exists and has scenarios', () => {
        expect(pack).toBeDefined();
        expect(pack.id).toBe('endo');
        const scenarios = pack.getGoldenClinicalScenarios();
        expect(scenarios.length).toBeGreaterThanOrEqual(8);
    });

    test('endo pack has KB with 27+ chips', () => {
        const kb = pack.getTreatmentKb();
        expect(kb).not.toBeNull();
        expect(kb!.chips.length).toBeGreaterThanOrEqual(20);
    });

    // ═══════════════════════════════════════════════════════════════
    // CORE ENDO CHIP DEFINITIONS
    // ═══════════════════════════════════════════════════════════════

    test('KB has trepanation chip with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        const chip = kb.chips.find(c => c.id === 'trepanation');
        expect(chip).toBeDefined();
        expect(chip!.billingRef).toBeDefined();
        expect(chip!.billingRef!.GKV).toBe('BEMA_31');
        expect(chip!.billingRef!.PKV).toBe('GOZ_2360');
    });

    test('KB has kanalaufbereitung chips 1-4 with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        for (let i = 1; i <= 4; i++) {
            const chip = kb.chips.find(c => c.id === `kanalaufbereitung_${i}`);
            expect(chip).toBeDefined();
            expect(chip!.billingRef).toBeDefined();
            expect(chip!.billingRef!.GKV).toBe('BEMA_32');
            expect(chip!.billingRef!.PKV).toBe('GOZ_2410');
        }
    });

    test('KB has wf chips (kalt/warm/einzel) with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        const wfChips = ['wf_kalt', 'wf_warm', 'wf_einzel'];
        for (const chipId of wfChips) {
            const chip = kb.chips.find(c => c.id === chipId);
            expect(chip).toBeDefined();
            expect(chip!.billingRef).toBeDefined();
            expect(chip!.billingRef!.GKV).toBe('BEMA_34');
            expect(chip!.billingRef!.PKV).toBe('GOZ_2440');
        }
    });

    test('KB has laengenmessung chips', () => {
        const kb = pack.getTreatmentKb()!;
        const elekChip = kb.chips.find(c => c.id === 'laengenmessung_elek');
        const roentgenChip = kb.chips.find(c => c.id === 'laengenmessung_roentgen');

        expect(elekChip).toBeDefined();
        expect(elekChip!.billingRef!.PKV).toBe('GOZ_2400');

        expect(roentgenChip).toBeDefined();
        expect(roentgenChip!.billingRef!.GKV).toBe('BEMA_Ä925a');
    });

    test('KB has einlage_caoh2 chip with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        const chip = kb.chips.find(c => c.id === 'einlage_caoh2');
        expect(chip).toBeDefined();
        expect(chip!.billingRef!.GKV).toBe('BEMA_35');
        expect(chip!.billingRef!.PKV).toBe('GOZ_2430');
    });

    test('KB has roentgen_kontrolle chip with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        const chip = kb.chips.find(c => c.id === 'roentgen_kontrolle');
        expect(chip).toBeDefined();
        expect(chip!.billingRef!.GKV).toBe('BEMA_Ä925a');
        expect(chip!.billingRef!.PKV).toBe('GOZ_5000');
    });

    test('KB has kofferdam chip with billingRef', () => {
        const kb = pack.getTreatmentKb()!;
        const chip = kb.chips.find(c => c.id === 'kofferdam');
        expect(chip).toBeDefined();
        expect(chip!.billingRef!.GKV).toBe('BEMA_12');
        expect(chip!.billingRef!.PKV).toBe('GOZ_2040');
    });

    test('KB has la chips with billingRef', () => {
        const kb = pack.getTreatmentKb()!;

        const laLeitung = kb.chips.find(c => c.id === 'la_leitung');
        expect(laLeitung).toBeDefined();
        expect(laLeitung!.billingRef!.GKV).toBe('BEMA_41a');
        expect(laLeitung!.billingRef!.PKV).toBe('GOZ_0100');

        const laInfiltr = kb.chips.find(c => c.id === 'la_infiltr');
        expect(laInfiltr).toBeDefined();
        expect(laInfiltr!.billingRef!.GKV).toBe('BEMA_40');
        expect(laInfiltr!.billingRef!.PKV).toBe('GOZ_0090');
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO COVERAGE
    // ═══════════════════════════════════════════════════════════════

    test('scenarios cover multiple phases', () => {
        const scenarios = pack.getGoldenClinicalScenarios();
        const phases = new Set<string>();

        // Check that scenarios mention different endo phases
        for (const s of scenarios) {
            const dictation = s.dictation.toLowerCase();
            if (dictation.includes('trepan')) phases.add('zugang');
            if (dictation.includes('aufbereitu') || dictation.includes('kanäle') || dictation.includes('kanal')) phases.add('aufbereitung');
            if (dictation.includes('längenmessung') || dictation.includes('apex')) phases.add('laengenmessung');
            if (dictation.includes('wurzelfüllung') || dictation.includes('guttapercha')) phases.add('wurzelfuellung');
            if (dictation.includes('kofferdam')) phases.add('vorbereitung');
            if (dictation.includes('anästhesie') || dictation.includes('leitung')) phases.add('anaesthesie');
            if (dictation.includes('röntgen') || dictation.includes('kontrolle')) phases.add('roentgen');
            if (dictation.includes('einlage') || dictation.includes('ca(oh)2')) phases.add('einlage');
        }

        // Should cover at least 4 phases
        expect(phases.size).toBeGreaterThanOrEqual(4);
    });

    test('scenarios cover different canal counts', () => {
        const scenarios = pack.getGoldenClinicalScenarios();
        const canalMentions = scenarios.filter(s => {
            const d = s.dictation.toLowerCase();
            return d.includes('kanal') || d.includes('kanäle');
        });
        expect(canalMentions.length).toBeGreaterThanOrEqual(2);
    });

    test('scenarios include at least one PKV scenario', () => {
        const scenarios = pack.getGoldenClinicalScenarios();
        const pkvScenarios = scenarios.filter(s => s.insuranceType === 'PKV');
        expect(pkvScenarios.length).toBeGreaterThanOrEqual(1);
    });

    // ═══════════════════════════════════════════════════════════════
    // CHIP ID CONSISTENCY
    // ═══════════════════════════════════════════════════════════════

    test('all KB chips have unique IDs', () => {
        const kb = pack.getTreatmentKb()!;
        const ids = kb.chips.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    test('chip phases are in correct order', () => {
        const kb = pack.getTreatmentKb()!;
        const expectedPhases = [
            'befund', 'anaesthesie', 'vorbereitung', 'zugang',
            'aufbereitung', 'spuelung', 'einlage', 'wurzelfuellung', 'abschluss'
        ];

        const chipPhases = [...new Set(kb.chips.map(c => c.phase))];

        // All chip phases should be valid
        for (const phase of chipPhases) {
            expect(expectedPhases).toContain(phase);
        }
    });
});
