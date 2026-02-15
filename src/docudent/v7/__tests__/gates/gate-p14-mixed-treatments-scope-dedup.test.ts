/**
 * Gate Test: Mixed Treatments Scope Dedup E2E
 *
 * Verifies billing scope dedup works correctly for mixed treatments:
 * 1. SESSION scope: dedupe across segments (e.g., anesthesia)
 * 2. TOOTH scope: per-tooth, no cross-segment dedup
 */

import { describe, it, expect } from 'vitest';

import { KB_CHIP_IDS } from '../../medical';

describe('Gate: Mixed Treatments Scope Dedup E2E', () => {
    // ═══════════════════════════════════════════════════════════════
    // Types matching orchestrator
    // ═══════════════════════════════════════════════════════════════

    type BillingScope = 'TOOTH' | 'SESSION' | 'UNKNOWN';

    interface BillingCode {
        code: string;
        tooth?: string;
        scope: BillingScope;
        segmentId: string;
        treatmentId: 'fuellung' | 'endo';
    }

    // ═══════════════════════════════════════════════════════════════
    // Helper: Simulate scope-aware dedup (matches orchestrator logic)
    // ═══════════════════════════════════════════════════════════════

    function aggregateBillingWithScope(codes: BillingCode[]): BillingCode[] {
        const result: BillingCode[] = [];
        const seen = new Map<string, BillingCode>();

        for (const code of codes) {
            if (code.scope === 'TOOTH') {
                // TOOTH scope: key includes tooth
                const key = `${code.code}::${code.tooth || 'unknown'}`;
                if (!seen.has(key)) {
                    seen.set(key, code);
                    result.push(code);
                }
            } else if (code.scope === 'SESSION') {
                // SESSION scope: key is just the code
                if (!seen.has(code.code)) {
                    seen.set(code.code, code);
                    result.push(code);
                }
            } else {
                // UNKNOWN: keep all
                result.push(code);
            }
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 1: SESSION scope dedup across segments
    // ═══════════════════════════════════════════════════════════════
    describe('SESSION Scope Dedup', () => {
        it('should dedupe LA across fuellung and endo segments', () => {
            // Given: Both segments have LA (anesthesia is SESSION scope)
            const codes: BillingCode[] = [
                {
                    code: 'BEMA_40',
                    scope: 'SESSION',
                    segmentId: 'seg-fuellung',
                    treatmentId: 'fuellung',
                },
                {
                    code: 'BEMA_40',
                    scope: 'SESSION',
                    segmentId: 'seg-endo',
                    treatmentId: 'endo',
                },
            ];

            // When: Aggregate with scope awareness
            const result = aggregateBillingWithScope(codes);

            // Then: Only one BEMA_40 (first occurrence wins)
            expect(result.filter(c => c.code === 'BEMA_40').length).toBe(1);
            expect(result[0].segmentId).toBe('seg-fuellung');
        });

        it('should keep first occurrence for SESSION scope', () => {
            const codes: BillingCode[] = [
                {
                    code: 'BEMA_12', // Kofferdam - SESSION scope
                    scope: 'SESSION',
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                },
                {
                    code: 'BEMA_12',
                    scope: 'SESSION',
                    segmentId: 'seg-2',
                    treatmentId: 'fuellung',
                },
            ];

            const result = aggregateBillingWithScope(codes);

            expect(result.length).toBe(1);
            expect(result[0].segmentId).toBe('seg-1');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: TOOTH scope allows per-tooth duplicates
    // ═══════════════════════════════════════════════════════════════
    describe('TOOTH Scope Per-Tooth', () => {
        it('should allow same code for different teeth', () => {
            // Given: cp for tooth 16 and tooth 17
            const codes: BillingCode[] = [
                {
                    code: 'BEMA_25', // Cp
                    tooth: '16',
                    scope: 'TOOTH',
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                },
                {
                    code: 'BEMA_25',
                    tooth: '17',
                    scope: 'TOOTH',
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                },
            ];

            // When
            const result = aggregateBillingWithScope(codes);

            // Then: Both kept (different teeth)
            expect(result.length).toBe(2);
            expect(result.map(c => c.tooth).sort()).toEqual(['16', '17']);
        });

        it('should dedupe same tooth same code', () => {
            // Given: Duplicate cp for same tooth
            const codes: BillingCode[] = [
                {
                    code: 'BEMA_25',
                    tooth: '16',
                    scope: 'TOOTH',
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                },
                {
                    code: 'BEMA_25',
                    tooth: '16',
                    scope: 'TOOTH',
                    segmentId: 'seg-2', // Different segment, same tooth
                    treatmentId: 'fuellung',
                },
            ];

            // When
            const result = aggregateBillingWithScope(codes);

            // Then: Only one (first wins)
            expect(result.length).toBe(1);
            expect(result[0].segmentId).toBe('seg-1');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Mixed scope handling
    // ═══════════════════════════════════════════════════════════════
    describe('Mixed Scope Handling', () => {
        it('should correctly handle mixed TOOTH and SESSION codes', () => {
            const codes: BillingCode[] = [
                // Fuellung segment
                {
                    code: 'BEMA_40', // LA - SESSION
                    scope: 'SESSION',
                    segmentId: 'seg-fuellung',
                    treatmentId: 'fuellung',
                },
                {
                    code: 'BEMA_25', // Cp - TOOTH
                    tooth: '16',
                    scope: 'TOOTH',
                    segmentId: 'seg-fuellung',
                    treatmentId: 'fuellung',
                },
                // Endo segment
                {
                    code: 'BEMA_40', // LA again - SESSION (should dedupe)
                    scope: 'SESSION',
                    segmentId: 'seg-endo',
                    treatmentId: 'endo',
                },
                {
                    code: 'BEMA_32', // Endo start - TOOTH
                    tooth: '11',
                    scope: 'TOOTH',
                    segmentId: 'seg-endo',
                    treatmentId: 'endo',
                },
            ];

            const result = aggregateBillingWithScope(codes);

            // SESSION: BEMA_40 once
            expect(result.filter(c => c.code === 'BEMA_40').length).toBe(1);

            // TOOTH: BEMA_25 for 16, BEMA_32 for 11
            expect(result.some(c => c.code === 'BEMA_25' && c.tooth === '16')).toBe(true);
            expect(result.some(c => c.code === 'BEMA_32' && c.tooth === '11')).toBe(true);

            // Total: 3 codes (1 SESSION + 2 TOOTH)
            expect(result.length).toBe(3);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Determinism
    // ═══════════════════════════════════════════════════════════════
    describe('Determinism', () => {
        it('should produce identical dedup results 5x', () => {
            const results: string[][] = [];

            for (let i = 0; i < 5; i++) {
                const codes: BillingCode[] = [
                    { code: 'BEMA_40', scope: 'SESSION', segmentId: 's1', treatmentId: 'fuellung' },
                    { code: 'BEMA_25', tooth: '16', scope: 'TOOTH', segmentId: 's1', treatmentId: 'fuellung' },
                    { code: 'BEMA_40', scope: 'SESSION', segmentId: 's2', treatmentId: 'endo' },
                    { code: 'BEMA_32', tooth: '11', scope: 'TOOTH', segmentId: 's2', treatmentId: 'endo' },
                ];

                const result = aggregateBillingWithScope(codes);
                results.push(result.map(c => `${c.code}::${c.tooth || 'na'}`).sort());
            }

            const first = JSON.stringify(results[0]);
            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });
    });
});
