/**
 * Gate Test: Medical Engine Multi-Instance Scoping
 *
 * Verifies that the engine correctly scopes askback IDs per tooth
 * when instanceScope is provided.
 */

import { describe, it, expect } from 'vitest';
import {
    applyMedicalKb,
    withToothScope,
    stripToothScope,
    getToothFromScopedId,
} from '../../medical';

describe('Gate M6: Medical Engine Multi-Instance Scoping', () => {
    // ═══════════════════════════════════════════════════════════════
    // HELPER TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Scoping helper functions', () => {
        it('withToothScope adds tooth suffix', () => {
            expect(withToothScope('medical_ueberkappung', '16')).toBe('medical_ueberkappung::tooth:16');
            expect(withToothScope('medical_ueberkappung', '47')).toBe('medical_ueberkappung::tooth:47');
        });

        it('withToothScope returns unchanged if no tooth', () => {
            expect(withToothScope('medical_ueberkappung', '')).toBe('medical_ueberkappung');
        });

        it('stripToothScope removes tooth suffix', () => {
            expect(stripToothScope('medical_ueberkappung::tooth:16')).toBe('medical_ueberkappung');
            expect(stripToothScope('medical_ueberkappung')).toBe('medical_ueberkappung');
        });

        it('getToothFromScopedId extracts tooth number', () => {
            expect(getToothFromScopedId('medical_ueberkappung::tooth:16')).toBe('16');
            expect(getToothFromScopedId('medical_ueberkappung::tooth:47')).toBe('47');
            expect(getToothFromScopedId('medical_ueberkappung')).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SINGLE TOOTH SCOPING
    // ═══════════════════════════════════════════════════════════════

    describe('Single tooth scoping', () => {
        it('askbacks are scoped to tooth 16', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '16' },
            });

            const ueberkappungAskback = result.requiredAskbacks.find(id =>
                id.includes('ueberkappung')
            );
            expect(ueberkappungAskback).toContain('::tooth:16');
        });

        it('askbacks are scoped to tooth 47', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '47' },
            });

            const ueberkappungAskback = result.requiredAskbacks.find(id =>
                id.includes('ueberkappung')
            );
            expect(ueberkappungAskback).toContain('::tooth:47');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TOOTH ISOLATION
    // ═══════════════════════════════════════════════════════════════

    describe('Multi-tooth isolation', () => {
        it('different teeth get different scoped IDs', () => {
            const result16 = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '16' },
            });

            const result47 = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '47' },
            });

            // Both should have askbacks but with different scopes
            expect(result16.requiredAskbacks.length).toBeGreaterThan(0);
            expect(result47.requiredAskbacks.length).toBeGreaterThan(0);

            const ids16 = new Set(result16.requiredAskbacks);
            const ids47 = new Set(result47.requiredAskbacks);

            // No overlap - they should be completely separate scopes
            for (const id of ids16) {
                if (id.includes('::tooth:')) {
                    expect(ids47.has(id)).toBe(false);
                }
            }
        });

        it('mixed profunda and normal teeth only ask for profunda tooth', () => {
            // Tooth 16 is profunda
            const result16 = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '16' },
            });

            // Tooth 36 is normal
            const result36 = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'normal',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '36' },
            });

            // Tooth 16 should have ueberkappung askback
            expect(result16.requiredAskbacks.some(id =>
                id.includes('ueberkappung') && id.includes('::tooth:16')
            )).toBe(true);

            // Tooth 36 should NOT have ueberkappung askback
            expect(result36.requiredAskbacks.some(id =>
                id.includes('ueberkappung')
            )).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // NO SCOPE (SINGLE INSTANCE)
    // ═══════════════════════════════════════════════════════════════

    describe('No scope provided', () => {
        it('askbacks are unscoped without instanceScope', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'unknown' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
                // No instanceScope
            });

            const ueberkappungAskback = result.requiredAskbacks.find(id =>
                id.includes('ueberkappung')
            );
            expect(ueberkappungAskback).toBeDefined();
            expect(ueberkappungAskback).not.toContain('::tooth:');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CHIP EMISSION (NOT SCOPED)
    // ═══════════════════════════════════════════════════════════════

    describe('Chip emission remains unscoped', () => {
        it('chips are not tooth-scoped (scope is for askbacks only)', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'yes', material: 'CaOH2' },
                    counseling: { pulpitisRisk: 'yes' },
                },
                treatmentId: 'fuellung',
                instanceScope: { tooth: '16' },
            });

            expect(result.emittedChips).toContain('cp');
            // Chips should NOT have tooth scope suffix
            expect(result.emittedChips.every(c => !c.includes('::tooth:'))).toBe(true);
        });
    });
});
