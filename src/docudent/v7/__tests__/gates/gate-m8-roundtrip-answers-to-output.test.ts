/**
 * Gate M8: Roundtrip Answers to Output
 *
 * Tests full flow: dictation → extraction → facts → engine → questions → answers → chips
 */

import { describe, it, expect } from 'vitest';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';
import { createFactsFromExtracted, applyAnswersToFacts } from '../../medical/facts';
import { applyMedicalKb } from '../../medical';
import {
    compileAskbacksToQuestions,
    engineTraceToAskbackMeta,
} from '../../medical/askbacks';

describe('Gate M8: Roundtrip Answers to Output', () => {
    // ═══════════════════════════════════════════════════════════════
    // Case 1: Profunda → askback → answer yes → cp chip
    // ═══════════════════════════════════════════════════════════════

    describe('Case 1: Profunda + capping yes', () => {
        it('produces cp chip and facts show capping.performed = yes', () => {
            // Step 1: Extract
            const dictation = 'Zahn 16 MOD-Füllung bei Caries profunda.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            // Step 2: Create facts
            let facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );
            expect(facts.cariesDepth).toBe('profunda');

            // Step 3: Run engine (should produce askback)
            const engineResult1 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(engineResult1.requiredAskbacks).toContain('medical_ueberkappung');

            // Step 4: Apply answer
            const answers = { medical_ueberkappung: 'yes' };
            facts = applyAnswersToFacts(facts, answers);
            expect(facts.capping.performed).toBe('yes');

            // Step 5: Re-run engine (should produce chip)
            const engineResult2 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(engineResult2.emittedChips).toContain('cp');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 2: Profunda → askback → answer no → cp_not_required chip
    // ═══════════════════════════════════════════════════════════════

    describe('Case 2: Profunda + capping no', () => {
        it('produces cp_not_required chip', () => {
            const dictation = 'Zahn 36 OD-Füllung bei Caries profunda.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            let facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );

            const answers = { medical_ueberkappung: 'no' };
            facts = applyAnswersToFacts(facts, answers);
            expect(facts.capping.performed).toBe('no');

            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(engineResult.emittedChips).toContain('cp_not_required');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 3: Heavy bleeding → askback hemostasis → answer yes
    // ═══════════════════════════════════════════════════════════════

    describe('Case 3: Heavy bleeding + hemostasis yes', () => {
        it('produces facts with bleeding detected', () => {
            const dictation = 'Zahn 26 Füllung. Starke Blutung bei Exkavation.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            let facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );
            expect(facts.bleeding?.detected).toBe('yes');
            expect(facts.bleeding?.heavy).toBe(true);

            // Engine should produce hemostasis askback
            const engineResult1 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(engineResult1.requiredAskbacks).toContain('medical_hemostasis');

            // Apply answer
            const answers = { medical_hemostasis: 'yes' };
            facts = applyAnswersToFacts(facts, answers);
            expect(facts.bleeding?.hemostasisPerformed).toBe('yes');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 4: Sensitivity → askback sensitivity_followup → answer yes
    // ═══════════════════════════════════════════════════════════════

    describe('Case 4: Sensitivity + followup yes', () => {
        it('produces facts with sensitivity reported', () => {
            const dictation = 'Zahn 16 Füllung. Patient sehr empfindlich auf Kälte.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            let facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );
            expect(facts.sensitivity?.reported).toBe('yes');

            // Engine should produce sensitivity followup askback
            const engineResult1 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(engineResult1.requiredAskbacks).toContain('medical_sensitivity_followup');

            // Apply answer
            const answers = { medical_sensitivity_followup: 'yes' };
            facts = applyAnswersToFacts(facts, answers);
            expect(facts.sensitivity?.desensitizerApplied).toBe('yes');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 5: Normal caries → no askbacks
    // ═══════════════════════════════════════════════════════════════

    describe('Case 5: Normal caries baseline', () => {
        it('produces no medical askbacks', () => {
            const dictation = 'Zahn 16 okklusal Füllung bei Karies media.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            const facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );
            expect(facts.cariesDepth).toBe('normal');

            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });

            // No medical askbacks
            const medicalAskbacks = engineResult.requiredAskbacks.filter(
                a => a.startsWith('medical_')
            );
            expect(medicalAskbacks).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Case 6: Combo profunda + bleeding
    // ═══════════════════════════════════════════════════════════════

    describe('Case 6: Profunda + bleeding combo', () => {
        it('produces two askbacks', () => {
            const dictation = 'Zahn 16 tiefe Füllung mit starker Blutung bei Exkavation.';
            const extracted = stubExtractFromDictation(dictation, 'fuellung');

            const facts = createFactsFromExtracted(
                extracted as Record<string, unknown>,
                'fuellung'
            );
            expect(facts.cariesDepth).toBe('profunda');
            expect(facts.bleeding?.detected).toBe('yes');

            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });

            expect(engineResult.requiredAskbacks).toContain('medical_ueberkappung');
            expect(engineResult.requiredAskbacks).toContain('medical_hemostasis');
        });
    });
});
