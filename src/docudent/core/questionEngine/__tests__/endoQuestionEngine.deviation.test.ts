/**
 * Endo Question Engine Deviation Golden Tests — 12 Scenarios
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests for deviation mode question generation:
 * - Standard T2 unchanged
 * - Pain persists
 * - Partial negotiability (tooth 26)
 * - WL/ISO already provided
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseDeviationSignals } from '../../playbooks/endo/endoSignalParser';
import { evaluateDeviationQuestions, DEVIATION_QUESTION_IDS } from '../../playbooks/endo/endoPlaybookDeviation';

const QID = DEVIATION_QUESTION_IDS;

describe('Endo Question Engine Deviation Golden Tests', () => {
    // ═══════════════════════════════════════════════════════════════
    // 1. STANDARD T2 BASELINE (UNCHANGED)
    // ═══════════════════════════════════════════════════════════════

    describe('1. Standard T2 Baseline (No Deviation)', () => {
        const STANDARD_T2 = `Zahn 36. Zweiter Termin. Kofferdam.
Alle Kanäle gut passierbar. MB 19mm ISO 25, ML 18mm ISO 30, D 20mm ISO 30.
Maschinell aufbereitet. NaOCl, EDTA.
CaOH2 Einlage. Provisorischer Verschluss.`;

        it('produces NO deviation questions for complete standard T2', () => {
            const signals = parseDeviationSignals(STANDARD_T2);
            const questions = evaluateDeviationQuestions(signals);

            // No deviation mode = no deviation questions
            expect(signals.deviationMode).toBe(false);
            expect(questions.filter(q => q.severity === 'required')).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2. PAIN PERSISTS SCENARIO
    // ═══════════════════════════════════════════════════════════════

    describe('2. Pain Persists Scenario', () => {
        const PAIN_PERSISTS = `Zahn 16. Heute abfüllen geplant.
Patient noch schmerzhaft. Druckdolent auf Perkussion.
Erneut CaOH2 Einlage. Provisorischer Verschluss.`;

        it('produces WHY_NO_OBTURATION question when pain persists', () => {
            const signals = parseDeviationSignals(PAIN_PERSISTS);
            const questions = evaluateDeviationQuestions(signals);

            expect(signals.deviationMode).toBe(true);
            expect(questions.some(q => q.id === QID.WHY_NO_OBTURATION)).toBe(true);
        });

        it('includes evidence in WHY_NO_OBTURATION question', () => {
            const signals = parseDeviationSignals(PAIN_PERSISTS);
            const questions = evaluateDeviationQuestions(signals);

            const q = questions.find(q => q.id === QID.WHY_NO_OBTURATION);
            expect(q?.evidence.length).toBeGreaterThan(0);
            expect(q?.reason).toContain('Obturation');
        });

        it('recommends NEXT_VISIT_PLAN', () => {
            const signals = parseDeviationSignals(PAIN_PERSISTS);
            const questions = evaluateDeviationQuestions(signals);

            expect(questions.some(q => q.id === QID.NEXT_VISIT_PLAN)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 3. PARTIAL NEGOTIABILITY (TOOTH 26)
    // ═══════════════════════════════════════════════════════════════

    describe('3. Partial Negotiability Scenario (Tooth 26)', () => {
        const TOOTH_26 = `Zahn 26. Zwischensitzung. Kofferdam.
Alte Einlage entfernt. P 21mm ISO 30.
MB nicht bis Apex erreichbar, kalzifiziert ca. 15mm.
Gespült mit NaOCl und EDTA.
CaOH2 Einlage. Provisorischer Verschluss.`;

        it('triggers deviation mode', () => {
            const signals = parseDeviationSignals(TOOTH_26);
            expect(signals.deviationMode).toBe(true);
        });

        it('produces CANAL_STATUS question', () => {
            const signals = parseDeviationSignals(TOOTH_26);
            const questions = evaluateDeviationQuestions(signals);

            expect(questions.some(q => q.id === QID.CANAL_STATUS)).toBe(true);
        });

        it('CANAL_STATUS includes detected canals', () => {
            const signals = parseDeviationSignals(TOOTH_26);
            const questions = evaluateDeviationQuestions(signals);

            const q = questions.find(q => q.id === QID.CANAL_STATUS);
            expect(q?.canals).toContain('P');
            expect(q?.canals).toContain('MB');
        });

        it('recommends NEXT_VISIT_PLAN with deviation evidence', () => {
            const signals = parseDeviationSignals(TOOTH_26);
            const questions = evaluateDeviationQuestions(signals);

            const q = questions.find(q => q.id === QID.NEXT_VISIT_PLAN);
            expect(q).toBeDefined();
            expect(q?.evidence.some(e => e.includes('PARTIAL_NEGOTIABILITY'))).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 4. WL AND ISO ALREADY PROVIDED
    // ═══════════════════════════════════════════════════════════════

    describe('4. WL and ISO Already Provided', () => {
        const COMPLETE_CANALS = `Zahn 36. Kofferdam.
MB 19mm ISO 25, ML 18mm ISO 25, D 20mm ISO 30.
Alle Kanäle gut passierbar. Maschinell aufbereitet.
NaOCl, EDTA. CaOH2 Einlage.`;

        it('does NOT ask WL_PER_CANAL when all WL provided', () => {
            const signals = parseDeviationSignals(COMPLETE_CANALS);
            const questions = evaluateDeviationQuestions(signals);

            expect(questions.some(q => q.id === QID.WL_PER_CANAL)).toBe(false);
        });

        it('does NOT ask ISO_PER_CANAL when all ISO provided', () => {
            const signals = parseDeviationSignals(COMPLETE_CANALS);
            const questions = evaluateDeviationQuestions(signals);

            expect(questions.some(q => q.id === QID.ISO_PER_CANAL)).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 5. WL PROVIDED BUT NO ISO
    // ═══════════════════════════════════════════════════════════════

    describe('5. WL Provided But ISO Missing', () => {
        const WL_NO_ISO = `Zahn 46. Kofferdam.
MB 19mm, ML 18mm, D 20mm. Maschinell aufbereitet.
NaOCl, EDTA.`;

        it('asks ISO_PER_CANAL when WL provided but ISO missing after instrumentation', () => {
            const signals = parseDeviationSignals(WL_NO_ISO);
            const questions = evaluateDeviationQuestions(signals);

            // Should ask ISO since instrumentation was performed and ISO missing
            expect(questions.some(q => q.id === QID.ISO_PER_CANAL)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 6. RE-MEDICATION DETECTED
    // ═══════════════════════════════════════════════════════════════

    describe('6. Re-Medication Detected', () => {
        const RE_MEDICATION = `Zahn 36. Zwischensitzung.
Beschwerden weiterhin. Erneut CaOH2 Einlage.
Provisorischer Verschluss.`;

        it('produces MEDICATION_USED question when re-medication detected', () => {
            const signals = parseDeviationSignals(RE_MEDICATION);
            const questions = evaluateDeviationQuestions(signals);

            expect(signals.deviationFlags.some(f => f.type === 'RE_MEDICATION')).toBe(true);
            expect(questions.some(q => q.id === QID.MEDICATION_USED)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 7. EXUDATE PRESENT
    // ═══════════════════════════════════════════════════════════════

    describe('7. Exudate Present', () => {
        const EXUDATE = `Zahn 26. Eröffnung.
Exsudat aus Kanal. Erneut gespült.
Offene Trepanation, kein Verschluss.`;

        it('triggers deviation mode when exudate present', () => {
            const signals = parseDeviationSignals(EXUDATE);
            expect(signals.deviationFlags.some(f => f.type === 'EXUDATE_PRESENT')).toBe(true);
            expect(signals.deviationMode).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 8. REVISION/RETREATMENT
    // ═══════════════════════════════════════════════════════════════

    describe('8. Revision/Retreatment', () => {
        const REVISION = `Endo-Revision Zahn 36. Alte WF entfernt.
MB, ML, D erneut dargestellt.
Gespült. CaOH2 Einlage.`;

        it('triggers deviation mode for retreatment', () => {
            const signals = parseDeviationSignals(REVISION);
            expect(signals.deviationFlags.some(f => f.type === 'RETREATMENT')).toBe(true);
            expect(signals.deviationMode).toBe(true);
        });

        it('recommends NEXT_VISIT_PLAN for retreatment', () => {
            const signals = parseDeviationSignals(REVISION);
            const questions = evaluateDeviationQuestions(signals);

            expect(questions.some(q => q.id === QID.NEXT_VISIT_PLAN)).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 9. INSTRUMENT SEPARATION
    // ═══════════════════════════════════════════════════════════════

    describe('9. Instrument Separation', () => {
        const SEPARATION = `Zahn 26. Aufbereitung.
Feile frakturiert im MB-Kanal bei 12mm.
P und DB bis apex. CaOH2 Einlage.`;

        it('triggers deviation mode for instrument separation', () => {
            const signals = parseDeviationSignals(SEPARATION);
            expect(signals.deviationFlags.some(f => f.type === 'INSTRUMENT_SEPARATION')).toBe(true);
            expect(signals.deviationMode).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 10. QUESTION ORDERING
    // ═══════════════════════════════════════════════════════════════

    describe('10. Question Ordering', () => {
        const COMPLEX = `Zahn 26. Heute abfüllen geplant.
P bis WL 21mm. MB nicht passierbar, kalzifiziert.
Patient noch schmerzhaft. Erneut CaOH2 Einlage.
Provisorischer Verschluss.`;

        it('questions are ordered by priority', () => {
            const signals = parseDeviationSignals(COMPLEX);
            const questions = evaluateDeviationQuestions(signals);

            // Get order values
            const orders = questions.map(q => q.order);

            // Verify sorted ascending
            const sorted = [...orders].sort((a, b) => a - b);
            expect(orders).toEqual(sorted);
        });

        it('CANAL_STATUS comes before WL_PER_CANAL', () => {
            const signals = parseDeviationSignals(COMPLEX);
            const questions = evaluateDeviationQuestions(signals);

            const canalIdx = questions.findIndex(q => q.id === QID.CANAL_STATUS);
            const wlIdx = questions.findIndex(q => q.id === QID.WL_PER_CANAL);

            if (canalIdx >= 0 && wlIdx >= 0) {
                expect(canalIdx).toBeLessThan(wlIdx);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 11. NO OVERKILL QUESTIONS
    // ═══════════════════════════════════════════════════════════════

    describe('11. No Overkill Questions', () => {
        const DEVIATION = `Zahn 36. MB nicht bis apex.
P bis WL 21mm ISO 30. Erneut CaOH2 Einlage.`;

        it('does NOT ask brand, rpm, concentration, time', () => {
            const signals = parseDeviationSignals(DEVIATION);
            const questions = evaluateDeviationQuestions(signals);

            const ids = questions.map(q => q.id);
            expect(ids).not.toContain('ENDO_FILE_BRAND');
            expect(ids).not.toContain('ENDO_RPM');
            expect(ids).not.toContain('ENDO_TORQUE');
            expect(ids).not.toContain('ENDO_NAOCL_CONCENTRATION');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 12. DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    describe('12. Determinism', () => {
        const SAMPLE = `Zahn 26. MB nicht bis apex, kalzifiziert.
P 21mm ISO 30. Erneut CaOH2 Einlage.`;

        it('produces identical output for identical input', () => {
            const signals = parseDeviationSignals(SAMPLE);
            const q1 = evaluateDeviationQuestions(signals);
            const q2 = evaluateDeviationQuestions(signals);

            expect(q1.map(q => q.id)).toEqual(q2.map(q => q.id));
            expect(q1.map(q => q.order)).toEqual(q2.map(q => q.order));
        });
    });
});
