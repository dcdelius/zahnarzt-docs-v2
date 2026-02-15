/**
 * GATE: Analog Resolver v1 Tests
 * 
 * Tests:
 * 1. ICON dictation → at least 1 analog suggestion (ANALOG_Kons_04)
 * 2. Regular filling dictation → NO analog suggestion
 * 3. No suggestion contains forbidden imported text
 * 4. Deterministic: same input → same suggestion id
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAnalogSuggestions, clearAnalogCache } from '../../core/billing/knowledgeBase/logic/analogResolver';
import type { BillingContext } from '../../core/billing/knowledgeBase/logic/billingRegistry';

describe('GATE: Analog Resolver v1', () => {
    beforeEach(() => {
        clearAnalogCache();
    });

    describe('ICON Dictation Resolution', () => {
        const iconContext: BillingContext = {
            extracted: {
                treatment: 'ICON',
                diagnosis: 'Kariesinfiltration',
                teeth: ['11', '12', '21'],
            } as any,
            insuranceType: 'PKV',
            bonusStatus: 'ohne',
            rawDictation: 'ICON bei 3 Frontzähnen, Kariesinfiltration mikroinvasiv',
        };

        it('returns at least 1 analog suggestion for ICON', () => {
            const result = resolveAnalogSuggestions(iconContext);

            expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
        });

        it('top suggestion contains ANALOG_Kons in id', () => {
            const result = resolveAnalogSuggestions(iconContext);

            expect(result.suggestions.length).toBeGreaterThan(0);
            const topId = result.suggestions[0].id;
            expect(topId).toMatch(/analog_ANALOG_Kons/);
        });

        it('suggestion has correct type and structure', () => {
            const result = resolveAnalogSuggestions(iconContext);

            const suggestion = result.suggestions[0];
            // Direct matches return 'goz', fuzzy matches return 'optimierung'
            expect(['goz', 'optimierung']).toContain(suggestion.type);
            expect(suggestion.autoAccept).toBe(false);
            expect(suggestion.code).toBeUndefined();
            expect(suggestion.priority).toMatch(/hoch|mittel/);
        });

        it('debug info includes query and matches', () => {
            const result = resolveAnalogSuggestions(iconContext);

            expect(result.debug).toBeDefined();
            expect(result.debug!.query).toContain('icon');
            expect(result.debug!.matches.length).toBeGreaterThan(0);
        });
    });

    describe('Regular Filling - No Analog', () => {
        const fillingContext: BillingContext = {
            extracted: {
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Karies media',
                material: 'Komposit',
                versorgungsart: 'fuellung',
            } as any,
            insuranceType: 'GKV',
            bonusStatus: 'ohne',
            rawDictation: 'Kompositfüllung Zahn 36 MOD',
        };

        it('returns NO analog suggestion for regular filling', () => {
            const result = resolveAnalogSuggestions(fillingContext);

            // Regular fillings should NOT trigger analog suggestions
            // The score should be below threshold
            expect(result.suggestions.length).toBe(0);
        });
    });

    describe('No Forbidden Imported Text', () => {
        const forbiddenPatterns = [
            'höchstens',
            'nicht abrechnungsfähig',
            '§ 6 Abs',
            'Wissing',
            'gemäß',
            'Kommentar',
            'Gebührenordnung',
        ];

        it('suggestions do not contain forbidden imported text', () => {
            const contexts: BillingContext[] = [
                {
                    extracted: { treatment: 'ICON' } as any,
                    insuranceType: 'PKV',
                    bonusStatus: 'ohne',
                    rawDictation: 'ICON Frontzähne',
                },
                {
                    extracted: { treatment: 'Trepanation' } as any,
                    insuranceType: 'PKV',
                    bonusStatus: 'ohne',
                    rawDictation: 'Knochentrepanation Unterkiefer',
                },
                {
                    extracted: { treatment: 'Analgosedierung' } as any,
                    insuranceType: 'PKV',
                    bonusStatus: 'ohne',
                    rawDictation: 'Analgosedierung für chirurgischen Eingriff',
                },
            ];

            for (const ctx of contexts) {
                const result = resolveAnalogSuggestions(ctx);

                for (const suggestion of result.suggestions) {
                    for (const pattern of forbiddenPatterns) {
                        expect(suggestion.label).not.toContain(pattern);
                        expect(suggestion.description || '').not.toContain(pattern);
                    }
                }
            }
        });

        it('description uses only safe static text', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Kariesinfiltration',
            });

            if (result.suggestions.length > 0) {
                const desc = result.suggestions[0].description || '';
                expect(desc).toContain('§6 GOZ');
                expect(desc).toContain('comparable reference service');
            }
        });
    });

    describe('Deterministic Output', () => {
        it('same input produces same suggestion id', () => {
            const context: BillingContext = {
                extracted: { treatment: 'ICON' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON bei 3 Frontzähnen',
            };

            const result1 = resolveAnalogSuggestions(context);
            clearAnalogCache();
            const result2 = resolveAnalogSuggestions(context);

            expect(result1.suggestions.length).toBe(result2.suggestions.length);

            for (let i = 0; i < result1.suggestions.length; i++) {
                expect(result1.suggestions[i].id).toBe(result2.suggestions[i].id);
            }
        });

        it('debug matches are in same order', () => {
            const context: BillingContext = {
                extracted: { treatment: 'Mock-up' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'Mock-up für Zahnersatzsimulation',
            };

            const result1 = resolveAnalogSuggestions(context);
            clearAnalogCache();
            const result2 = resolveAnalogSuggestions(context);

            expect(result1.debug?.matches.length).toBe(result2.debug?.matches.length);

            for (let i = 0; i < (result1.debug?.matches.length || 0); i++) {
                expect(result1.debug!.matches[i].analogCode).toBe(result2.debug!.matches[i].analogCode);
                expect(result1.debug!.matches[i].score).toBe(result2.debug!.matches[i].score);
            }
        });
    });

    describe('Score Threshold', () => {
        it('matches below 0.55 are filtered out', () => {
            const result = resolveAnalogSuggestions({
                extracted: {} as any,
                insuranceType: 'GKV',
                bonusStatus: 'ohne',
                rawDictation: 'xyz123 unbekannt',
            });

            // All returned matches should have score >= 0.55
            if (result.debug?.matches) {
                for (const match of result.debug.matches) {
                    expect(match.score).toBeGreaterThanOrEqual(0.55);
                }
            }
        });
    });

    describe('Cross-Reference Handling', () => {
        it('includes GOZ codes in description when available', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Kariesinfiltration',
            });

            if (result.suggestions.length > 0) {
                const match = result.debug?.matches[0];
                if (match && match.suggestedGozCodes.length > 0) {
                    const desc = result.suggestions[0].description || '';
                    expect(desc).toContain('Possible reference services');
                    expect(desc).toMatch(/GOZ_\d+/);
                }
            }
        });
    });

    describe('Edge Cases', () => {
        it('handles empty rawDictation', () => {
            const result = resolveAnalogSuggestions({
                extracted: { treatment: 'ICON' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: '',
            });

            // Should still work with just extracted.treatment
            expect(result).toBeDefined();
        });

        it('handles missing extracted data', () => {
            const result = resolveAnalogSuggestions({
                extracted: {} as any,
                insuranceType: 'GKV',
                bonusStatus: 'ohne',
            });

            expect(result.suggestions).toEqual([]);
        });

        it('handles very short query', () => {
            const result = resolveAnalogSuggestions({
                extracted: {} as any,
                insuranceType: 'GKV',
                bonusStatus: 'ohne',
                rawDictation: 'ab',
            });

            expect(result.suggestions).toEqual([]);
        });
    });
});
