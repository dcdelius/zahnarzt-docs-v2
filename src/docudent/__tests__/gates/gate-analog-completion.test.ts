/**
 * Gate Test: Analog Completion Gate + Export Safety
 * 
 * Tests blocking finalization without valid justification
 * and ensuring no Wissing content leaks into exports.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAnalogSuggestions, clearAnalogCache } from '../../core/billing/knowledgeBase/logic/analogResolver';
import {
    validateAnalogJustifications,
    type AnalogValidationResult
} from '../../core/billing/knowledgeBase/logic/analogCompletionValidator';
import {
    buildAnalogExportPayload,
    assertNoCommentaryLeak,
    checkForCommentaryLeaks,
    sanitizeForExport,
    FORBIDDEN_EXPORT_KEYS
} from '../../core/billing/knowledgeBase/logic/analogExportGuard';
import {
    createAnalogJustification,
    clearAnalogJustificationStoreForTests,
    type AnalogJustificationMap
} from '../../core/billing/knowledgeBase/logic/analogJustificationService';

describe('GATE: Analog Completion Gate', () => {
    beforeEach(() => {
        clearAnalogCache();
        clearAnalogJustificationStoreForTests();
    });

    // ═══════════════════════════════════════════════════════════════
    // Task A: Analog Completion Gate
    // ═══════════════════════════════════════════════════════════════

    describe('A1: ICON produces analog suggestion requiring justification', () => {
        it('ICON returns requiresJustification=true', () => {
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
    });

    describe('A2: validateAnalogJustifications blocks when missing', () => {
        it('fails when justification missing', () => {
            const suggestions = [{
                id: 'test-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true,
                    suggestedComparisonCodes: ['GOZ_2010']
                }
            }];
            const justifications: AnalogJustificationMap = {};

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.missing.length).toBeGreaterThan(0);
            expect(result.missing[0].type).toBe('missing_justification');
        });

        it('fails when justification too short', () => {
            const suggestions = [{
                id: 'test-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true
                }
            }];
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', 'too short')
            };

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.missing.some(e => e.type === 'justification_too_short')).toBe(true);
        });

        it('fails when justification too long', () => {
            const suggestions = [{
                id: 'test-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true
                }
            }];
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification('ANALOG_Kons_04', 'X'.repeat(600))
            };

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.ok).toBe(false);
            expect(result.missing.some(e => e.type === 'justification_too_long')).toBe(true);
        });

        it('warns when comparison code missing (not blocking)', () => {
            const suggestions = [{
                id: 'test-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true,
                    suggestedComparisonCodes: ['GOZ_2010', 'GOZ_2020']
                }
            }];
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification(
                    'ANALOG_Kons_04',
                    'Kariesinfiltration durchgeführt gemäß §6 GOZ Analogabrechnung'.repeat(2)
                    // No selectedComparisonCode
                )
            };

            const result = validateAnalogJustifications(suggestions, justifications);

            // Should pass (ok=true) but have a warning
            expect(result.ok).toBe(true);
            expect(result.missing.some(e =>
                e.type === 'missing_comparison_code' && e.severity === 'warning'
            )).toBe(true);
        });
    });

    describe('A3: validateAnalogJustifications passes when valid', () => {
        it('passes with valid justification', () => {
            const suggestions = [{
                id: 'test-1',
                meta: {
                    analogCode: 'ANALOG_Kons_04',
                    requiresJustification: true,
                    suggestedComparisonCodes: ['GOZ_2010']
                }
            }];
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification(
                    'ANALOG_Kons_04',
                    'Die Kariesinfiltration mit ICON ist eine minimal-invasive Behandlung ohne Substanzverlust.',
                    'GOZ_2010'
                )
            };

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.ok).toBe(true);
            expect(result.missing.filter(e => e.severity === 'error').length).toBe(0);
        });

        it('passes when no analog suggestions present', () => {
            const suggestions = [{
                id: 'test-1',
                // No meta.analogCode or requiresJustification
            }];
            const justifications: AnalogJustificationMap = {};

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.ok).toBe(true);
            expect(result.missing.length).toBe(0);
        });
    });

    describe('A4: Error list is deterministically ordered', () => {
        it('errors sorted by analogCode', () => {
            const suggestions = [
                { id: 't2', meta: { analogCode: 'ZEBRA_01', requiresJustification: true } },
                { id: 't1', meta: { analogCode: 'ALPHA_01', requiresJustification: true } },
                { id: 't3', meta: { analogCode: 'MID_01', requiresJustification: true } }
            ];
            const justifications: AnalogJustificationMap = {};

            const result = validateAnalogJustifications(suggestions, justifications);

            expect(result.missing[0].analogCode).toBe('ALPHA_01');
            expect(result.missing[1].analogCode).toBe('MID_01');
            expect(result.missing[2].analogCode).toBe('ZEBRA_01');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Task B: Export Safety Check
    // ═══════════════════════════════════════════════════════════════

    describe('B1: buildAnalogExportPayload includes only safe fields', () => {
        it('exports analogCode, userJustificationText, selectedComparisonCode', () => {
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification(
                    'ANALOG_Kons_04',
                    'Kariesinfiltration mit ICON durchgeführt gemäß §6 GOZ',
                    'GOZ_2010'
                )
            };

            const payload = buildAnalogExportPayload(justifications);

            expect(payload.length).toBe(1);
            expect(payload[0].analogCode).toBe('ANALOG_Kons_04');
            expect(payload[0].userJustificationText).toBeDefined();
            expect(payload[0].selectedComparisonCode).toBe('GOZ_2010');
            expect(payload[0].createdAtISO).toBeDefined();
        });

        it('does NOT include forbidden keys', () => {
            const justifications = {
                'ANALOG_Kons_04': createAnalogJustification(
                    'ANALOG_Kons_04',
                    'Valid justification text for analog billing',
                    'GOZ_2010'
                )
            };

            const payload = buildAnalogExportPayload(justifications);
            const item = payload[0];

            for (const forbidden of FORBIDDEN_EXPORT_KEYS) {
                expect(item).not.toHaveProperty(forbidden);
            }
        });
    });

    describe('B2: assertNoCommentaryLeak catches violations', () => {
        it('throws when sections key found', () => {
            const badPayload = {
                analogCode: 'TEST',
                sections: ['Some copyrighted commentary']
            };

            expect(() => assertNoCommentaryLeak(badPayload)).toThrow('forbidden');
        });

        it('throws when topSnippets key found', () => {
            const badPayload = {
                analogCode: 'TEST',
                topSnippets: ['Snippet 1', 'Snippet 2']
            };

            expect(() => assertNoCommentaryLeak(badPayload)).toThrow('forbidden');
        });

        it('throws when evidenceSnippet in string', () => {
            const badPayload = {
                analogCode: 'TEST',
                description: 'Contains evidenceSnippet reference'
            };

            expect(() => assertNoCommentaryLeak(badPayload)).toThrow('forbidden');
        });

        it('passes for clean payload', () => {
            const cleanPayload = {
                analogCode: 'ANALOG_Kons_04',
                userJustificationText: 'User written justification',
                selectedComparisonCode: 'GOZ_2010'
            };

            expect(() => assertNoCommentaryLeak(cleanPayload)).not.toThrow();
        });
    });

    describe('B3: checkForCommentaryLeaks returns sorted violations', () => {
        it('returns violations sorted by path', () => {
            const badPayload = {
                z_field: { snippet: 'text' },
                a_field: { sections: [] }
            };

            const violations = checkForCommentaryLeaks(badPayload);

            expect(violations.length).toBeGreaterThanOrEqual(2);
            expect(violations[0].path.localeCompare(violations[1].path)).toBeLessThanOrEqual(0);
        });
    });

    describe('B4: sanitizeForExport removes forbidden keys', () => {
        it('removes sections, topSnippets, etc', () => {
            const dirty = {
                analogCode: 'TEST',
                userText: 'Clean',
                sections: ['dirty'],
                topSnippets: ['dirty'],
                evidenceSnippet: 'dirty'
            };

            const clean = sanitizeForExport(dirty);

            expect(clean.analogCode).toBe('TEST');
            expect(clean.userText).toBe('Clean');
            expect(clean).not.toHaveProperty('sections');
            expect(clean).not.toHaveProperty('topSnippets');
            expect(clean).not.toHaveProperty('evidenceSnippet');
        });
    });

    describe('B5: Export payload is deterministically ordered', () => {
        it('items sorted by analogCode', () => {
            const justifications = {
                'ZEBRA': createAnalogJustification('ZEBRA', 'Z'.repeat(50)),
                'ALPHA': createAnalogJustification('ALPHA', 'A'.repeat(50)),
                'MID': createAnalogJustification('MID', 'M'.repeat(50))
            };

            const payload = buildAnalogExportPayload(justifications);

            expect(payload[0].analogCode).toBe('ALPHA');
            expect(payload[1].analogCode).toBe('MID');
            expect(payload[2].analogCode).toBe('ZEBRA');
        });
    });
});
