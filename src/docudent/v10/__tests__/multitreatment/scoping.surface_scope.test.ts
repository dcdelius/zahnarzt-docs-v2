/**
 * Scoping Surface Scope Test
 * 
 * Verifies that surfaces are scoped to the tooth in the segment.
 */

import { describe, it, expect } from 'vitest';
import {
    scopeExtractionToInstances,
    verifySurfaceIsolation,
} from '../../multitreatment/scoping';

describe('Multi-Treatment Scoping: Surface Scope', () => {
    it('should scope surfaces to specific tooth segment', () => {
        const result = scopeExtractionToInstances(
            'Füllung 36 mod; 14 okklusal',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);

        // First tooth: mod surfaces
        expect(result.instances[0].surfaces).toContain('m');
        expect(result.instances[0].surfaces).toContain('o');
        expect(result.instances[0].surfaces).toContain('d');

        // Second tooth: only okklusal
        expect(result.instances[1].surfaces).toContain('o');
        expect(result.instances[1].surfaces).not.toContain('m');
        expect(result.instances[1].surfaces).not.toContain('d');
    });

    it('should verify surface isolation (no shared references)', () => {
        const result = scopeExtractionToInstances(
            '36 okklusal; 14 distal',
            'fuellung'
        );

        expect(verifySurfaceIsolation(result)).toBe(true);
    });

    it('should handle different surfaces per tooth in same dictation', () => {
        const result = scopeExtractionToInstances(
            'Füllung Zahn 36 mesial-okklusal, danach Zahn 14 distal',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);

        // 36 should have m and o
        const first = result.instances.find(i => i.teeth.includes('36'));
        expect(first?.surfaces).toContain('m');
        expect(first?.surfaces).toContain('o');

        // 14 should only have d
        const second = result.instances.find(i => i.teeth.includes('14'));
        expect(second?.surfaces).toContain('d');
        expect(second?.surfaces).not.toContain('m');
    });

    it('should not leak surfaces across segment boundaries', () => {
        const result = scopeExtractionToInstances(
            '36 okklusal bukkal; 14 distal lingual',
            'fuellung'
        );

        expect(result.instances.length).toBe(2);

        // First: o, b (not d, l)
        expect(result.instances[0].surfaces).toContain('o');
        expect(result.instances[0].surfaces).toContain('b');
        expect(result.instances[0].surfaces).not.toContain('l');

        // Second: d, l (not o, b)
        expect(result.instances[1].surfaces).toContain('d');
        expect(result.instances[1].surfaces).toContain('l');
        expect(result.instances[1].surfaces).not.toContain('b');
    });
});
