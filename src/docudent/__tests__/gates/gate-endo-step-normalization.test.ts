/**
 * Gate Test: Endo Step Normalization
 *
 * Ensures that endo step values from question_bank (endo_start, endo_interim, endo_complete)
 * are correctly normalized to canonical medical values (start, interim, complete).
 *
 * This prevents silent breakage of medical triggers when UI and extraction
 * provide different value formats.
 *
 * INVARIANTS:
 * - UI values (endo_*) map to canonical values
 * - Canonical values pass through unchanged
 * - Common extraction variants also normalized
 * - Unknown values return null (not a silent pass-through)
 */

import { describe, it, expect } from 'vitest';
import { normalizeEndoStep, processMedical } from '../../core/medical/medicalEngine';
import { createEmptyExtraction } from '../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: normalizeEndoStep', () => {

    it('should normalize question_bank values: endo_start → start', () => {
        expect(normalizeEndoStep('endo_start')).toBe('start');
    });

    it('should normalize question_bank values: endo_interim → interim', () => {
        expect(normalizeEndoStep('endo_interim')).toBe('interim');
    });

    it('should normalize question_bank values: endo_complete → complete', () => {
        expect(normalizeEndoStep('endo_complete')).toBe('complete');
    });

    it('should pass through canonical values: start', () => {
        expect(normalizeEndoStep('start')).toBe('start');
    });

    it('should pass through canonical values: interim', () => {
        expect(normalizeEndoStep('interim')).toBe('interim');
    });

    it('should pass through canonical values: complete', () => {
        expect(normalizeEndoStep('complete')).toBe('complete');
    });

    it('should normalize extraction variants: trepanation → start', () => {
        expect(normalizeEndoStep('trepanation')).toBe('start');
    });

    it('should normalize extraction variants: wurzelfüllung → complete', () => {
        expect(normalizeEndoStep('wurzelfüllung')).toBe('complete');
    });

    it('should normalize case-insensitively: ENDO_COMPLETE → complete', () => {
        expect(normalizeEndoStep('ENDO_COMPLETE')).toBe('complete');
    });

    it('should return null for unknown values', () => {
        expect(normalizeEndoStep('unknown_step')).toBeNull();
    });

    it('should return null for null input', () => {
        expect(normalizeEndoStep(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
        expect(normalizeEndoStep(undefined)).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION: Normalization affects medical triggers
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Endo Step Normalization affects Medical Triggers', () => {

    function createEndoExtraction(endoStepValue: string | null, additions: Record<string, unknown> = {}) {
        const base = createEmptyExtraction('Zahn 46 Endo.', 'zahn 46 endo');
        return {
            ...base,
            tooth: { value: '46', confidence: 1, evidence: 'test' },
            mentioned: {
                ...base.mentioned,
                endo_step: { value: endoStepValue, confidence: 1, evidence: 'test' },
                kanalzahl: { value: 3, confidence: 1, evidence: 'test' },
                ...additions
            }
        };
    }

    it('should trigger obturation_required_for_complete when UI value is endo_complete', () => {
        // UI provides 'endo_complete', should be normalized to 'complete'
        // which should trigger obturation_required when obturation is null
        const extracted = createEndoExtraction('endo_complete', {
            obturation: { value: null, confidence: 1, evidence: 'test' }
        });

        const result = processMedical('endo', extracted);

        const obturationAskback = result.hardAskbacks.find(
            a => a.id === 'endo.obturation_required_for_complete'
        );
        expect(obturationAskback).toBeDefined();
        expect(obturationAskback?.severity).toBe('hard');
    });

    it('should NOT trigger obturation_required when step is start (normalized from endo_start)', () => {
        const extracted = createEndoExtraction('endo_start', {
            obturation: { value: null, confidence: 1, evidence: 'test' }
        });

        const result = processMedical('endo', extracted);

        const obturationAskback = result.hardAskbacks.find(
            a => a.id === 'endo.obturation_required_for_complete'
        );
        expect(obturationAskback).toBeUndefined();
    });

    it('should trigger medication_recommended when step is start (normalized from endo_start)', () => {
        const extracted = createEndoExtraction('endo_start', {
            medikament: { value: null, confidence: 1, evidence: 'test' }
        });

        const result = processMedical('endo', extracted);

        const medicationAskback = result.softAskbacks.find(
            a => a.id === 'endo.medication_recommended'
        );
        expect(medicationAskback).toBeDefined();
        expect(medicationAskback?.severity).toBe('soft');
    });

    it('should use canonical values consistently for findings', () => {
        // complete without canals finding
        const extracted = createEndoExtraction('endo_complete', {
            kanalzahl: { value: null, confidence: 1, evidence: 'test' }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.complete_without_canals');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('error');
    });

    it('should handle extraction variant trepanation → start for diagnostik finding', () => {
        // trepanation normalizes to start, missing vitality+percussion triggers warning
        const extracted = createEndoExtraction('trepanation', {
            vitality: { value: null, confidence: 1, evidence: 'test' },
            percussion: { value: null, confidence: 1, evidence: 'test' }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.start_ohne_diagnostik');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('warning');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD: Question bank dataValues covered by normalization
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Question Bank Endo Step Values are Covered', () => {

    // P11.1: These are the NEW CANONICAL values from endo_question_bank.json
    const QUESTION_BANK_VALUES_CANONICAL = ['start', 'interim', 'complete'];

    it('all question_bank endo_step dataValues should normalize correctly (canonical)', () => {
        for (const value of QUESTION_BANK_VALUES_CANONICAL) {
            const normalized = normalizeEndoStep(value);
            expect(normalized).not.toBeNull();
            expect(['start', 'interim', 'complete']).toContain(normalized);
        }
    });

    // LEGACY backward compatibility: old stored values still work
    const LEGACY_VALUES = ['endo_start', 'endo_interim', 'endo_complete'];

    it('legacy endo_* values still normalize correctly (backward compat)', () => {
        for (const value of LEGACY_VALUES) {
            const normalized = normalizeEndoStep(value);
            expect(normalized).not.toBeNull();
            expect(['start', 'interim', 'complete']).toContain(normalized);
        }
    });
});
