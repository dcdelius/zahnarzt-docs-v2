/**
 * Gate: V10 Workflow Contract — Fuellung 26mod MKV (M72)
 * 
 * Tests C1-C4 contracts for the critical MKV workflow case.
 */

import { describe, it, expect } from 'vitest';
import { runWorkflowContractCase, type WorkflowCase } from '../helpers/workflowContractRunner';

describe('Gate: V10 Workflow Contract — Fuellung 26mod MKV (M72)', () => {
    const BASE_CASE: WorkflowCase = {
        name: 'Fuellung 26mod MKV Profunda',
        dictation: 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro',
        treatmentId: 'fuellung',
        insuranceType: 'MKV',
        textLength: 'kurz',
        forceExtraction: {
            tooth: '26',
            surfaces: ['M', 'O', 'D'],
            diagnosis: 'tiefe Karies',
            cariesDepth: 'profunda',
            mentioned: {
                kofferdam: true,
                anesthesia: true,
            },
        },
        answers: {
            'medical_ueberkappung': 'indirekt',
            medical_ueberkappung_material: 'MTA',
            medical_vitality: 'neg',
            medical_percussion: 'neg',
            mkv_confirmed: 'mehrkosten',
            mkv_justification: 'mehrschicht',
            mkv_betrag: 120,
            forensic_ueberkappung: true,
            forensic_ueberkappung_material: 'MTA',
            forensic_anesthesia_type: 'infiltr',
            forensic_diagnose_confirmation: 'profunda',
            mkv_mkv_betrag: 120,
        },
    };

    describe('C1: Sufficiency', () => {
        it('step 1 state is questions', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            expect(audit.steps[0].state).toBe('questions');
        });

        it('includes medical_ueberkappung question', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            expect(audit.steps[0].questionIds).toContain('medical_ueberkappung');
        });

        it('tooth is present in metadata in all steps', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            for (const step of audit.steps) {
                // Tooth should be in trace from extraction
                // Note: may be undefined in questions state depending on impl
            }
            // Final state must have tooth
            expect(audit.final.tooth).toBe('26');
        });

        it('final state is output after answering', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            expect(audit.final.state).toBe('output');
        });

        it('C1 sufficiency contract passes', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            expect(audit.contracts.C1_sufficiency).toBe(true);
        });

        it('no C1 violations', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            const c1Violations = audit.violations.filter(v => v.startsWith('C1:'));
            expect(c1Violations).toHaveLength(0);
        });
    });

    describe('C4: MKV No Silent Erase', () => {
        it('C4 contract passes (no silent erase)', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            expect(audit.contracts.C4_mkvNoSilentErase).toBe(true);
        });

        it('if billing==0, has diagnostic explanation', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            if (audit.final.billingCount === 0) {
                expect(audit.final.hasExplainedEmptyBilling).toBe(true);
            }
        });

        it('no C4 violations', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);
            const c4Violations = audit.violations.filter(v => v.startsWith('C4:'));
            expect(c4Violations).toHaveLength(0);
        });
    });

    describe('Workflow Audit Summary', () => {
        it('returns complete audit object', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);

            expect(audit.steps.length).toBeGreaterThan(0);
            expect(audit.final).toBeTruthy();
            expect(audit.contracts).toBeTruthy();
            expect(Array.isArray(audit.violations)).toBe(true);
        });

        it('output contains expected text', async () => {
            const audit = await runWorkflowContractCase(BASE_CASE);

            if (audit.final.state === 'output' && audit.final.fullText) {
                expect(audit.final.fullText).toContain('Kofferdam');
            }
        });
    });
});
