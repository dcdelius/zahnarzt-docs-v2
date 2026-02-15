/**
 * Scoping No-Leak Test
 * 
 * Verifies that multi-treatment scoping doesn't leak facts between teeth.
 */

import { describe, it, expect } from 'vitest';
import {
    scopeExtractionToInstances,
    verifyNegationIsolation,
    verifySurfaceIsolation,
} from '../../multitreatment/scoping';

describe('Multi-Treatment Scoping: No Leak', () => {
    it('should create separate instances for multiple teeth', () => {
        const result = scopeExtractionToInstances(
            'Füllung Zahn 36 okklusal; danach Zahn 14 distal',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);
        expect(result.instances[0].teeth).toContain('36');
        expect(result.instances[1].teeth).toContain('14');
    });

    it('should isolate surfaces between instances', () => {
        const result = scopeExtractionToInstances(
            'Füllung 36 okklusal; 14 distal',
            'fuellung'
        );

        expect(verifySurfaceIsolation(result)).toBe(true);

        // Verify surfaces are different
        expect(result.instances[0].surfaces).toContain('o');
        expect(result.instances[1].surfaces).toContain('d');

        // Verify no cross-contamination
        expect(result.instances[0].surfaces).not.toContain('d');
        expect(result.instances[1].surfaces).not.toContain('o');
    });

    it('should not share array references between instances', () => {
        const result = scopeExtractionToInstances(
            '36 okklusal; 14 distal',
            'fuellung'
        );

        // Modify one instance's surfaces
        result.instances[0].surfaces.push('test');

        // Other instance should not be affected
        expect(result.instances[1].surfaces).not.toContain('test');
    });

    it('should handle same treatment on multiple teeth', () => {
        const result = scopeExtractionToInstances(
            'Füllung 36 okklusal Komposit; danach 14 distal einfach',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);
        expect(result.segmentCount).toBe(2);

        // Each instance should have unique ID
        expect(result.instances[0].instanceId).not.toBe(result.instances[1].instanceId);
    });
});
