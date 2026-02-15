/**
 * Gate Test: MVP Baseline Chip Emission
 *
 * Validates that fuellung_grundleistung baseline chip ALWAYS emits
 * when treatmentId='fuellung'.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-mvp-baseline-chip', () => {
    test('fuellung_grundleistung emits for minimal fuellung facts', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
            },
        });
        console.log('[DIAGNOSTIC] Fired rules:', result.trace.firedRules);
        console.log('[DIAGNOSTIC] Emitted chips:', result.emittedChips);
        expect(result.emittedChips).toContain('fuellung_grundleistung');
    });

    test('fuellung_grundleistung emits with standard dictation facts', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                cariesDepth: 'normal',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            },
        });
        console.log('[DIAGNOSTIC] Fired rules:', result.trace.firedRules);
        console.log('[DIAGNOSTIC] Emitted chips:', result.emittedChips);
        expect(result.emittedChips).toContain('fuellung_grundleistung');
    });

    test('baseline concept should fire with highest priority', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                capping: { performed: 'yes' },
            },
        });
        expect(result.trace.firedConcepts).toContain('concept:fuellung-baseline:baseline');
    });
});
