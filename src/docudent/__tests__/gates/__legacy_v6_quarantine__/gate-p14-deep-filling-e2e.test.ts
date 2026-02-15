/**
 * Gate Test: Deep Filling Flow E2E
 *
 * Verifies the medical layer works correctly for deep filling (Caries profunda) cases:
 * 1. Profunda with no answers → returns questions incl. medical_ueberkappung required
 * 2. Profunda + ueberkappung=true → output includes capping chip (cp) with billing
 * 3. Profunda + ueberkappung=false → output includes cp_not_required chip
 *
 * Uses KB SSOT for expected values (no hardcoded billing codes).
 */

import { describe, it, expect } from 'vitest';
import {
    createFactsFromExtracted,
    applyAnswersToFacts,
    evaluateAskbacks,
    getChipIdsFromFacts,
    MEDICAL_QUESTION_IDS,
    KB_CHIP_IDS,
} from '../../medical';

describe('Gate: Deep Filling Medical Layer E2E', () => {
    // ═══════════════════════════════════════════════════════════════
    // Test 1: Profunda extraction → askback required
    // ═══════════════════════════════════════════════════════════════
    it('should require ueberkappung askback for profunda extraction', () => {
        // Given: extraction with caries profunda
        const extracted = {
            diagnosis: 'Caries profunda',
            zahn: '36',
            flaechen: 'mo',
        };

        // When: create facts and evaluate askbacks
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const askbacks = evaluateAskbacks(facts);

        // Then: ueberkappung should be required
        expect(facts.cariesDepth).toBe('profunda');
        expect(facts.capping.performed).toBe('unknown');
        expect(askbacks.required.length).toBeGreaterThan(0);
        expect(askbacks.required.some(q => q.id === MEDICAL_QUESTION_IDS.UEBERKAPPUNG)).toBe(true);
    });

    it('should require ueberkappung askback for tiefe=tief extraction', () => {
        // Given: extraction with pulp-near depth indicator
        const extracted = {
            diagnosis: 'Karies',
            tiefe: 'tief',
            zahn: '46',
            flaechen: 'mod',
        };

        // When
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const askbacks = evaluateAskbacks(facts);

        // Then
        expect(facts.cariesDepth).toBe('profunda');
        expect(askbacks.required.some(q => q.questionKey === 'ueberkappung')).toBe(true);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Ueberkappung=yes → cp chip emitted
    // ═══════════════════════════════════════════════════════════════
    it('should emit cp chip when ueberkappung=yes', () => {
        // Given: profunda with ueberkappung answered yes
        const extracted = { diagnosis: 'Caries profunda' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const answers = { [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true };

        // When
        const updatedFacts = applyAnswersToFacts(facts, answers);
        const chips = getChipIdsFromFacts(updatedFacts);

        // Then
        expect(updatedFacts.capping.performed).toBe('yes');
        expect(chips).toContain(KB_CHIP_IDS.CP);
        expect(chips).not.toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
    });

    it('should emit cp chip when using KB key "ueberkappung"', () => {
        // Given: using KB canonical key instead of medical_ prefix
        const extracted = { diagnosis: 'Caries profunda' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const answers = { ueberkappung: 'ja' }; // German alias

        // When
        const updatedFacts = applyAnswersToFacts(facts, answers);
        const chips = getChipIdsFromFacts(updatedFacts);

        // Then
        expect(updatedFacts.capping.performed).toBe('yes');
        expect(chips).toContain(KB_CHIP_IDS.CP);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Ueberkappung=no → cp_not_required chip
    // ═══════════════════════════════════════════════════════════════
    it('should emit cp_not_required chip when ueberkappung=no for deep cavity', () => {
        // Given: profunda with ueberkappung declined
        const extracted = { diagnosis: 'Caries profunda' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const answers = { [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: false };

        // When
        const updatedFacts = applyAnswersToFacts(facts, answers);
        const chips = getChipIdsFromFacts(updatedFacts);

        // Then
        expect(updatedFacts.capping.performed).toBe('no');
        expect(chips).toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
        expect(chips).not.toContain(KB_CHIP_IDS.CP);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Normal depth → no capping askback required
    // ═══════════════════════════════════════════════════════════════
    it('should not require ueberkappung for normal depth caries', () => {
        // Given: normal depth caries
        const extracted = {
            diagnosis: 'Caries media',
            tiefe: 'normal',
        };

        // When
        const facts = createFactsFromExtracted(extracted, 'fuellung');
        const askbacks = evaluateAskbacks(facts);

        // Then: no ueberkappung required
        expect(facts.cariesDepth).toBe('normal');
        expect(askbacks.required.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 5: Endo treatment → no fuellung askbacks
    // ═══════════════════════════════════════════════════════════════
    it('should not generate fuellung askbacks for endo treatment', () => {
        // Given: endo treatment with profunda
        const extracted = { diagnosis: 'Caries profunda' };

        // When
        const facts = createFactsFromExtracted(extracted, 'endo');
        const askbacks = evaluateAskbacks(facts);

        // Then: fuellung-specific askbacks should not fire for endo
        expect(askbacks.required.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 6: Answer normalization (aliases)
    // ═══════════════════════════════════════════════════════════════
    it('should normalize various yes/no formats', () => {
        const extracted = { diagnosis: 'Caries profunda' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');

        // Test various yes formats
        const yesFormats = [true, 'yes', 'ja', 'Ja'];
        for (const yes of yesFormats) {
            const updated = applyAnswersToFacts(facts, { ueberkappung: yes });
            expect(updated.capping.performed).toBe('yes');
        }

        // Test various no formats
        const noFormats = [false, 'no', 'nein', 'Nein'];
        for (const no of noFormats) {
            const updated = applyAnswersToFacts(facts, { ueberkappung: no });
            expect(updated.capping.performed).toBe('no');
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 7: Counseling default based on depth
    // ═══════════════════════════════════════════════════════════════
    it('should default pulpitisRisk to yes for profunda', () => {
        const extracted = { diagnosis: 'Caries profunda' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');

        expect(facts.counseling.pulpitisRisk).toBe('yes');
    });

    it('should default pulpitisRisk to unknown for normal depth', () => {
        const extracted = { diagnosis: 'Caries media', tiefe: 'normal' };
        const facts = createFactsFromExtracted(extracted, 'fuellung');

        expect(facts.counseling.pulpitisRisk).toBe('unknown');
    });
});
