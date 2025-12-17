/**
 * Engine Logic Unit Tests
 *
 * Tests for core/billing internal logic:
 * - deriveDiagnosis (diagnosis derivation from flags)
 * - getRequiredFieldsFromRules (rule question triggers)
 *
 * ═══════════════════════════════════════════════════════════════
 * LOCATION: core/billing/__tests__ (not v7!)
 * These test Engine internals directly, not via pipeline API.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import type { ExtractedDataV2, MentionedFields, KeywordFlags } from '../../../contracts/extraction';
import { deriveDiagnosis } from '../knowledgeBase/logic/diagnosisDerivation';
import { getRequiredFieldsFromRules } from '../knowledgeBase/logic/ruleQuestionTrigger';

// ═══════════════════════════════════════════════════════════════
// MOCK EXTRACTION HELPER
// ═══════════════════════════════════════════════════════════════

function createMockExtraction(overrides: Partial<ExtractedDataV2> = {}): ExtractedDataV2 {
    const defaultMentioned: MentionedFields = {
        anesthesia: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        kofferdam: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        tiefe: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        vitality: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        percussion: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        capping: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        material: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
    };

    const defaultKeywordFlags: KeywordFlags = {
        saidDeepCavity: false,
        saidSuperficial: false,
        saidFracture: false,
        saidCaries: false,
    };

    return {
        tooth: { value: '36', confidence: 1, evidence: ['36'], needsConfirmation: false },
        surfaces: { value: ['m', 'o', 'd'], confidence: 1, evidence: ['mod'], needsConfirmation: false },
        costs: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
        mentioned: overrides.mentioned ? { ...defaultMentioned, ...overrides.mentioned } : defaultMentioned,
        keywordFlags: overrides.keywordFlags ? { ...defaultKeywordFlags, ...overrides.keywordFlags } : defaultKeywordFlags,
        raw: { dictation: 'test mock dictation', normalized: 'test mock dictation' },
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Engine Logic Unit Tests', () => {
    describe('Diagnosis Derivation', () => {
        it('should derive Caries profunda from saidDeepCavity', () => {
            const flags: KeywordFlags = { saidDeepCavity: true, saidSuperficial: false, saidFracture: false, saidCaries: true };
            const result = deriveDiagnosis(flags);

            expect(result.code).toBe('caries_profunda');
            expect(result.label).toBe('Caries profunda');
            expect(result.cpEligible).toBe(true);
        });

        it('should derive Fraktur from saidFracture', () => {
            const flags: KeywordFlags = { saidDeepCavity: false, saidSuperficial: false, saidFracture: true, saidCaries: false };
            const result = deriveDiagnosis(flags);

            expect(result.code).toBe('fraktur');
            expect(result.label).toBe('Fraktur');
            expect(result.cpEligible).toBe(false);
        });

        it('should derive unknown when no flags set', () => {
            const flags: KeywordFlags = { saidDeepCavity: false, saidSuperficial: false, saidFracture: false, saidCaries: false };
            const result = deriveDiagnosis(flags);

            expect(result.code).toBe('unknown');
        });
    });

    describe('Rule-Triggered Questions', () => {
        it('should return required fields from rules', () => {
            const extracted = createMockExtraction();
            const required = getRequiredFieldsFromRules('fuellung', [], extracted, 'GKV', false);

            const fieldNames = required.map(r => r.field);
            expect(fieldNames).toContain('vitality');
            expect(fieldNames).toContain('percussion');
        });

        it('should include rule metadata', () => {
            const extracted = createMockExtraction();
            const required = getRequiredFieldsFromRules('fuellung', [], extracted, 'GKV', false);

            const vitalityRule = required.find(r => r.field === 'vitality');
            expect(vitalityRule).toBeDefined();
            expect(vitalityRule?.ruleId).toBe('RULE_FUELLUNG_VITAL_DOKU');
            expect(vitalityRule?.riskLevel).toBe('mittel');
        });

        it('should not include fields that are already filled', () => {
            const extracted = createMockExtraction({
                mentioned: {
                    anesthesia: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    kofferdam: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    tiefe: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    vitality: { value: '+', confidence: 1, evidence: ['vital'], needsConfirmation: false },
                    percussion: { value: '-', confidence: 1, evidence: ['perk-'], needsConfirmation: false },
                    capping: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                    material: { value: null, confidence: 0, evidence: [], needsConfirmation: true },
                },
            });
            const required = getRequiredFieldsFromRules('fuellung', [], extracted, 'GKV', false);

            const fieldNames = required.map(r => r.field);
            expect(fieldNames).not.toContain('vitality');
            expect(fieldNames).not.toContain('percussion');
        });
    });
});
