/**
 * Gate Test: Medical Required Questions (P1 Updated)
 * 
 * Asserts that the MEDICAL layer properly triggers required askbacks:
 * - endo_step must be asked if not in dictation
 * - canal_count must be asked if not in dictation
 * - vitality/percussion for fuellung
 * 
 * P1: Uses questionId (fully qualified) instead of questionKey.
 * 
 * These are HARD gates: failures block merge.
 */

import { describe, it, expect } from 'vitest';
import { processMedical } from '../../core/medical/medicalEngine';
import { createEmptyExtraction } from '../../contracts/extraction';

describe('GATE: Medical Required Questions for Endo', () => {

    it('should require endo_step question when not extractable from dictation', () => {
        // Simulate extraction where endo_step was NOT found
        const extracted = createEmptyExtraction(
            'Zahn 46 Wurzelbehandlung.',
            'zahn 46 wurzelbehandlung'
        );

        const result = processMedical('endo', extracted);

        // P1: Use questionId (fully qualified)
        expect(result.hardAskbacks.some(a => a.questionId === 'endo.endo_step')).toBe(true);

        // Should also have canal_count as hard askback
        expect(result.hardAskbacks.some(a => a.questionId === 'endo.kanalzahl')).toBe(true);

        // Minimal dataset should NOT be met
        expect(result.minimalDatasetMet).toBe(false);
    });

    it('should include askback reason when minimal dataset not met', () => {
        const extracted = createEmptyExtraction(
            'Zahn 16 Behandlung.',
            'zahn 16 behandlung'
        );

        const result = processMedical('endo', extracted);

        // Should have reason explaining what's missing
        expect(result.askbackReason).toBeDefined();
        expect(result.askbackReason).toContain('Fehlende');
    });

    it('should NOT trigger fuellung questions for endo treatment', () => {
        const extracted = createEmptyExtraction(
            'Zahn 36 Wurzelbehandlung.',
            'zahn 36 wurzelbehandlung'
        );

        const result = processMedical('endo', extracted);

        // P1: Use questionId (fully qualified)
        const allQuestionIds = [
            ...result.hardAskbacks.map(a => a.questionId),
            ...result.softAskbacks.map(a => a.questionId)
        ];

        // tiefe/isolation are fuellung-only
        expect(allQuestionIds).not.toContain('fuellung.tiefe');
        expect(allQuestionIds).not.toContain('fuellung.isolation');
    });

    it('should have all askback IDs namespaced with treatment prefix', () => {
        const extracted = createEmptyExtraction('Zahn 46.', 'zahn 46');

        const result = processMedical('endo', extracted);

        for (const askback of [...result.hardAskbacks, ...result.softAskbacks]) {
            // askback.id should start with 'endo.'
            expect(askback.id.startsWith('endo.')).toBe(true);
            // questionId should also be namespaced
            expect(askback.questionId.startsWith('endo.')).toBe(true);
        }
    });
});

describe('GATE: Medical Required Questions for Fuellung', () => {

    it('should require vitality question when not extractable', () => {
        const extracted = createEmptyExtraction(
            'Zahn 36 mod Karies. Komposit.',
            'zahn 36 mod karies komposit'
        );

        const result = processMedical('fuellung', extracted);

        // P1: Use questionId (fully qualified)
        expect(result.hardAskbacks.some(a => a.questionId === 'fuellung.vitality')).toBe(true);
    });

    it('should NOT trigger endo questions for fuellung treatment', () => {
        const extracted = createEmptyExtraction(
            'Zahn 36 Füllung.',
            'zahn 36 füllung'
        );

        const result = processMedical('fuellung', extracted);

        // P1: Use questionId (fully qualified)
        const allQuestionIds = [
            ...result.hardAskbacks.map(a => a.questionId),
            ...result.softAskbacks.map(a => a.questionId)
        ];

        // endo_step/kanalzahl are endo-only
        expect(allQuestionIds).not.toContain('endo.endo_step');
        expect(allQuestionIds).not.toContain('endo.kanalzahl');
    });

    it('should have all fuellung askbacks properly namespaced', () => {
        const extracted = createEmptyExtraction('Zahn 36.', 'zahn 36');

        const result = processMedical('fuellung', extracted);

        for (const askback of [...result.hardAskbacks, ...result.softAskbacks]) {
            expect(askback.id.startsWith('fuellung.')).toBe(true);
            expect(askback.questionId.startsWith('fuellung.')).toBe(true);
        }
    });

    // P5: Endo kofferdam soft askback
    it('should trigger endo.kofferdam_recommended as SOFT when kofferdam=null', () => {
        const extracted = createEmptyExtraction(
            'Zahn 46 Trepanation 3 Kanäle.',
            'zahn 46 trepanation 3 kanäle'
        );

        const result = processMedical('endo', extracted);

        // Should be a SOFT askback, not HARD
        const kofferdamAskback = result.softAskbacks.find(
            a => a.id === 'endo.kofferdam_recommended'
        );
        expect(kofferdamAskback).toBeDefined();
        expect(kofferdamAskback?.questionId).toBe('endo.isolation');
        expect(kofferdamAskback?.severity).toBe('soft');

        // Should NOT be in hard askbacks
        const hardKofferdam = result.hardAskbacks.find(
            a => a.id === 'endo.kofferdam_recommended'
        );
        expect(hardKofferdam).toBeUndefined();
    });

    it('should have all endo askbacks properly namespaced', () => {
        const extracted = createEmptyExtraction('Zahn 46.', 'zahn 46');

        const result = processMedical('endo', extracted);

        for (const askback of [...result.hardAskbacks, ...result.softAskbacks]) {
            expect(askback.id.startsWith('endo.')).toBe(true);
            expect(askback.questionId.startsWith('endo.')).toBe(true);
        }
    });
});
