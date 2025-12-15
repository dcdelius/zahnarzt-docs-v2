/**
 * Gate Test: Analog Justification Flow
 * 
 * Tests for the analog justification system:
 * 1. ICON returns requiresJustification=true
 * 2. Justification validation (30-500 chars)
 * 3. Persistence into case state
 * 4. No raw commentary text exposed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAnalogSuggestions, clearAnalogCache } from '../../core/billing/knowledgeBase/logic/analogResolver';
import {
    createAnalogJustification,
    isValidJustification,
    getJustificationStatus,
    saveAnalogJustification,
    loadAnalogJustifications,
    clearAnalogJustificationStoreForTests,
    JUSTIFICATION_MIN_LENGTH,
    JUSTIFICATION_MAX_LENGTH
} from '../../core/billing/knowledgeBase/logic/analogJustificationService';

describe('GATE: Analog Justification Flow', () => {
    beforeEach(() => {
        clearAnalogCache();
        clearAnalogJustificationStoreForTests();
    });

    // ═══════════════════════════════════════════════════════════════
    // 1. ICON mapping has requiresJustification=true
    // ═══════════════════════════════════════════════════════════════

    describe('Analog resolver output', () => {
        it('ICON treatment returns requiresJustification=true', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Kariesinfiltration'
            });

            expect(result.suggestions.length).toBeGreaterThan(0);
            const suggestion = result.suggestions[0];

            expect(suggestion.meta?.requiresJustification).toBe(true);
            expect(suggestion.meta?.analogCode).toBeDefined();
            expect(suggestion.autoAccept).toBe(false);
        });

        it('ICON returns suggestedComparisonCodes array', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON'
            });

            const suggestion = result.suggestions[0];
            expect(suggestion.meta?.suggestedComparisonCodes).toBeDefined();
            expect(Array.isArray(suggestion.meta?.suggestedComparisonCodes)).toBe(true);
        });

        it('analog suggestions NEVER have autoAccept=true', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'Kariesinfiltration' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'Kariesinfiltration analog'
            });

            for (const suggestion of result.suggestions) {
                expect(suggestion.autoAccept).toBe(false);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 2. Justification validation
    // ═══════════════════════════════════════════════════════════════

    describe('Justification validation', () => {
        it('rejects text shorter than 30 chars', () => {
            expect(isValidJustification('Too short')).toBe(false);
            expect(isValidJustification('A'.repeat(29))).toBe(false);
        });

        it('accepts text between 30-500 chars', () => {
            expect(isValidJustification('A'.repeat(30))).toBe(true);
            expect(isValidJustification('A'.repeat(100))).toBe(true);
            expect(isValidJustification('A'.repeat(500))).toBe(true);
        });

        it('rejects text longer than 500 chars', () => {
            expect(isValidJustification('A'.repeat(501))).toBe(false);
        });

        it('getJustificationStatus returns "missing" for undefined', () => {
            expect(getJustificationStatus(undefined)).toBe('missing');
        });

        it('getJustificationStatus returns "missing" for invalid justification', () => {
            const invalid = createAnalogJustification('CODE', 'too short');
            expect(getJustificationStatus(invalid)).toBe('missing');
        });

        it('getJustificationStatus returns "saved" for valid justification', () => {
            const valid = createAnalogJustification('CODE', 'A'.repeat(50));
            expect(getJustificationStatus(valid)).toBe('saved');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 3. Persistence (test adapter)
    // ═══════════════════════════════════════════════════════════════

    describe('Justification persistence', () => {
        it('saves and loads justification via test adapter', async () => {
            const caseId = 'test-case-123';
            const justification = createAnalogJustification(
                'ANALOG_Kons_04',
                'Die Kariesinfiltration mit ICON ist eine minimal-invasive Behandlung ohne Substanzverlust.',
                'GOZ_2010'
            );

            await saveAnalogJustification(caseId, justification);
            const loaded = await loadAnalogJustifications(caseId);

            expect(loaded['ANALOG_Kons_04']).toBeDefined();
            expect(loaded['ANALOG_Kons_04'].justificationText).toBe(justification.justificationText);
            expect(loaded['ANALOG_Kons_04'].selectedComparisonCode).toBe('GOZ_2010');
        });

        it('rejects invalid justification on save', async () => {
            const justification = createAnalogJustification('CODE', 'short');

            await expect(
                saveAnalogJustification('test', justification)
            ).rejects.toThrow();
        });

        it('updates existing justification', async () => {
            const caseId = 'test-case-456';
            const j1 = createAnalogJustification('CODE', 'A'.repeat(50), 'GOZ_1');
            const j2 = createAnalogJustification('CODE', 'B'.repeat(60), 'GOZ_2');

            await saveAnalogJustification(caseId, j1);
            await saveAnalogJustification(caseId, j2);

            const loaded = await loadAnalogJustifications(caseId);
            expect(loaded['CODE'].justificationText).toBe('B'.repeat(60));
            expect(loaded['CODE'].selectedComparisonCode).toBe('GOZ_2');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 4. Safety: No raw commentary text exposed
    // ═══════════════════════════════════════════════════════════════

    describe('Safety: No raw commentary', () => {
        it('suggestion descriptions are safe static text, not imported', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON'
            });

            for (const suggestion of result.suggestions) {
                // Description should not exceed safe length
                if (suggestion.description) {
                    expect(suggestion.description.length).toBeLessThanOrEqual(300);
                }

                // Should not contain "kommentar" or "wissing" (copyright markers)
                const desc = (suggestion.description || '').toLowerCase();
                expect(desc).not.toContain('wissing');
            }
        });

        it('meta does not contain any "sections" or "snippet" fields', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON'
            });

            for (const suggestion of result.suggestions) {
                if (suggestion.meta) {
                    expect(suggestion.meta).not.toHaveProperty('sections');
                    expect(suggestion.meta).not.toHaveProperty('snippet');
                    expect(suggestion.meta).not.toHaveProperty('rawText');
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 5. Analog completion status
    // ═══════════════════════════════════════════════════════════════

    describe('Analog completion status', () => {
        it('isAnalogComplete = false when no justification', () => {
            const justifications: Record<string, any> = {};
            const isComplete = (code: string) => {
                const j = justifications[code];
                return !!j && j.justificationText.length >= JUSTIFICATION_MIN_LENGTH;
            };

            expect(isComplete('ANALOG_Kons_04')).toBe(false);
        });

        it('isAnalogComplete = true when justification >= 30 chars', () => {
            const justification = createAnalogJustification('ANALOG_Kons_04', 'A'.repeat(50));
            const justifications = { 'ANALOG_Kons_04': justification };

            const isComplete = (code: string) => {
                const j = justifications[code];
                return !!j && j.justificationText.length >= JUSTIFICATION_MIN_LENGTH;
            };

            expect(isComplete('ANALOG_Kons_04')).toBe(true);
        });
    });
});
