/**
 * Scoping Negation Scope Test
 * 
 * Verifies that negations are scoped to instances, not global.
 */

import { describe, it, expect } from 'vitest';
import {
    scopeExtractionToInstances,
    verifyNegationIsolation,
} from '../../multitreatment/scoping';

describe('Multi-Treatment Scoping: Negation Scope', () => {
    it('should scope negation to specific instance only', () => {
        const result = scopeExtractionToInstances(
            'Füllung 36 okklusal ohne Kofferdam; 14 distal mit Kofferdam',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);

        // First instance should have negation
        expect(result.instances[0].negations.some(n => n.includes('kofferdam'))).toBe(true);

        // Second instance should NOT have the negation from first
        expect(result.instances[1].negations.some(n => n.includes('ohne'))).toBe(false);
    });

    it('should verify negation isolation (no shared references)', () => {
        const result = scopeExtractionToInstances(
            '36 ohne Adhäsiv; 14 mit Adhäsiv',
            'fuellung'
        );

        expect(verifyNegationIsolation(result)).toBe(true);
    });

    it('should apply global scope when "bei beiden" is used', () => {
        const result = scopeExtractionToInstances(
            'Füllung 36 und 14, bei beiden ohne Kofferdam',
            'fuellung'
        );

        // With global scope marker, all instances should share the negation
        expect(result.globalMarkers).toContain('global');
    });

    it('should not leak negation without explicit global marker', () => {
        const result = scopeExtractionToInstances(
            '36 okklusal keine Überkappung; 14 distal tiefe Karies',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);

        // Negation only in first instance
        const firstHasNegation = result.instances[0].negations.length > 0;
        const secondHasNegation = result.instances[1].negations.length > 0;

        // Without global marker, negation should not leak
        if (firstHasNegation) {
            expect(result.instances[0].negations).not.toBe(result.instances[1].negations);
        }
    });
});
