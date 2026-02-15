/**
 * Gate Test: Analog E2E Finalize Flow
 * 
 * End-to-end test simulating the full billing flow
 * with analog justification validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAnalogSuggestions, clearAnalogCache } from '../../core/billing/knowledgeBase/logic/analogResolver';
import { validateAnalogJustifications } from '../../core/billing/knowledgeBase/logic/analogCompletionValidator';
import {
    buildAnalogExportPayload,
    assertNoCommentaryLeak,
    checkForCommentaryLeaks
} from '../../core/billing/knowledgeBase/logic/analogExportGuard';
import {
    createAnalogJustification,
    clearAnalogJustificationStoreForTests,
    type AnalogJustificationMap,
    JUSTIFICATION_MIN_LENGTH
} from '../../core/billing/knowledgeBase/logic/analogJustificationService';

describe('GATE: Analog E2E Finalize Flow', () => {
    beforeEach(() => {
        clearAnalogCache();
        clearAnalogJustificationStoreForTests();
    });

    // ═══════════════════════════════════════════════════════════════
    // SIMULATED BILLING FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Simulates the finalize billing action from the controller.
     */
    function simulateFinalizeBilling(
        suggestions: Array<{ id: string; meta?: any }>,
        justifications: AnalogJustificationMap
    ): { ok: boolean; errors: string[]; payload?: any } {
        // Step 1: Validate analog justifications
        const validation = validateAnalogJustifications(suggestions, justifications);

        if (!validation.ok) {
            return {
                ok: false,
                errors: validation.missing
                    .filter(e => e.severity === 'error')
                    .map(e => `${e.analogCode}: ${e.reason}`)
            };
        }

        // Step 2: Build export payload
        const exportPayload = buildAnalogExportPayload(justifications);

        // Step 3: Assert no commentary leaks (throws if found)
        try {
            assertNoCommentaryLeak(exportPayload);
        } catch (e) {
            return {
                ok: false,
                errors: ['Export contains forbidden commentary content']
            };
        }

        // Step 4: Return success with payload
        return {
            ok: true,
            errors: [],
            payload: {
                analogItems: exportPayload,
                timestamp: new Date().toISOString()
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // E2E TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('E2E-1: ICON dictation triggers analog requiring justification', () => {
        it('produces analog suggestion with requiresJustification=true', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' },
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Kariesinfiltration'
            });

            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions[0].meta?.requiresJustification).toBe(true);
            expect(result.suggestions[0].meta?.analogCode).toBeDefined();
        });
    });

    describe('E2E-2: Finalize blocked without justification', () => {
        it('fails finalize when justification missing', () => {
            const suggestions = [{
                id: 'analog-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true,
                    suggestedComparisonCodes: ['GOZ_2010']
                }
            }];
            const justifications: AnalogJustificationMap = {};

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('ANALOG_Kons_04');
        });

        it('fails finalize when justification too short', () => {
            const suggestions = [{
                id: 'analog-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true
                }
            }];
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', 'too short')
            };

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.errors.some(e => e.includes('kurz'))).toBe(true);
        });
    });

    describe('E2E-3: Finalize passes with valid justification', () => {
        it('succeeds with properly filled justification', () => {
            const suggestions = [{
                id: 'analog-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true,
                    suggestedComparisonCodes: ['GOZ_2010']
                }
            }];
            const validText = 'Die Kariesinfiltration mit ICON ist eine minimal-invasive Behandlung ohne Substanzverlust gemäß §6 GOZ.';
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', validText, 'GOZ_2010')
            };

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.payload).toBeDefined();
        });
    });

    describe('E2E-4: Export payload contains only user justification', () => {
        it('payload includes userJustificationText', () => {
            const userText = 'Behandlung erfolgte analog §6 GOZ aufgrund fehlender Position.';
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', userText, 'GOZ_2010')
            };

            const result = simulateFinalizeBilling([{
                id: 'analog-1',
                meta: { analogCode: 'ANALOG_Kons_04', requiresJustification: true }
            }], justifications);

            expect(result.ok).toBe(true);
            expect(result.payload.analogItems[0].userJustificationText).toBe(userText);
            expect(result.payload.analogItems[0].selectedComparisonCode).toBe('GOZ_2010');
        });

        it('payload does NOT include sections or snippets', () => {
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification(
                    'ANALOG_Kons_04',
                    'A'.repeat(50),
                    'GOZ_2010'
                )
            };

            const result = simulateFinalizeBilling([{
                id: 'analog-1',
                meta: { analogCode: 'ANALOG_Kons_04', requiresJustification: true }
            }], justifications);

            expect(result.ok).toBe(true);

            const item = result.payload.analogItems[0];
            expect(item).not.toHaveProperty('sections');
            expect(item).not.toHaveProperty('topSnippets');
            expect(item).not.toHaveProperty('evidenceSnippet');
        });
    });

    describe('E2E-5: Export passes assertNoCommentaryLeak', () => {
        it('clean payload passes leak check', () => {
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', 'X'.repeat(60), 'GOZ_2010')
            };

            const payload = buildAnalogExportPayload(justifications);

            // Should not throw
            expect(() => assertNoCommentaryLeak(payload)).not.toThrow();
        });

        it('poisoned payload fails leak check', () => {
            const badPayload = {
                analogCode: 'TEST',
                userJustificationText: 'Safe',
                sections: ['Leaked commentary']  // FORBIDDEN
            };

            const violations = checkForCommentaryLeaks(badPayload);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('E2E-6: Multiple analog suggestions handled correctly', () => {
        it('all must have valid justification', () => {
            const suggestions = [
                { id: 'a1', meta: { analogCode: 'ANALOG_A', requiresJustification: true } },
                { id: 'a2', meta: { analogCode: 'ANALOG_B', requiresJustification: true } }
            ];
            const justifications = {
                'ANALOG_A': createAnalogJustification('ANALOG_A', 'X'.repeat(50)),
                // ANALOG_B missing!
            };

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.errors.some(e => e.includes('ANALOG_B'))).toBe(true);
        });

        it('passes when all have valid justification', () => {
            const suggestions = [
                { id: 'a1', meta: { analogCode: 'ANALOG_A', requiresJustification: true } },
                { id: 'a2', meta: { analogCode: 'ANALOG_B', requiresJustification: true } }
            ];
            const justifications = {
                'ANALOG_A': createAnalogJustification('ANALOG_A', 'Y'.repeat(50)),
                'ANALOG_B': createAnalogJustification('ANALOG_B', 'Z'.repeat(50))
            };

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(true);
            expect(result.payload.analogItems.length).toBe(2);
        });
    });

    describe('E2E-7: No analog suggestions allows finalize', () => {
        it('passes finalize when no analog suggestions present', () => {
            const suggestions = [
                { id: 'regular-1', code: 'GOZ_2010' }  // No meta.analogCode
            ];
            const justifications: AnalogJustificationMap = {};

            const result = simulateFinalizeBilling(suggestions, justifications);

            expect(result.ok).toBe(true);
        });
    });
});
