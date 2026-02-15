/**
 * Multi-Treatment Scoping: 10 Real Dentist Dictation Truthcases
 * 
 * Tests that scoping correctly isolates facts between instances.
 */

import { describe, it, expect } from 'vitest';
import {
    scopeExtractionToInstances,
    verifyNegationIsolation,
    verifySurfaceIsolation,
} from '../../multitreatment/scoping';

describe('Scoping Truthcases: Real Dentist Dictations', () => {

    // Case 1: Basic multi-tooth
    it('TC1: "Füllung 36 okklusal, danach 14 distal"', () => {
        const result = scopeExtractionToInstances('Füllung 36 okklusal, danach 14 distal');

        expect(result.instances.length).toBe(2);
        expect(result.instances[0].teeth).toContain('36');
        expect(result.instances[1].teeth).toContain('14');
        expect(verifySurfaceIsolation(result)).toBe(true);
    });

    // Case 2: Same treatment, both teeth explicit
    it('TC2: "36 und 14 beide okklusal Komposit"', () => {
        const result = scopeExtractionToInstances('36 und 14 beide okklusal Komposit');

        // Should create 2 instances even without marker
        expect(result.instances.length).toBeGreaterThanOrEqual(2);
    });

    // Case 3: Different surfaces per tooth
    it('TC3: "36 mod, 14 okklusal"', () => {
        const result = scopeExtractionToInstances('36 mod; 14 okklusal');

        expect(result.instances.length).toBe(2);

        const i36 = result.instances.find(i => i.teeth.includes('36'));
        const i14 = result.instances.find(i => i.teeth.includes('14'));

        expect(i36?.surfaces).toContain('m');
        expect(i36?.surfaces).toContain('o');
        expect(i36?.surfaces).toContain('d');
        expect(i14?.surfaces).toContain('o');
        expect(i14?.surfaces).not.toContain('m');
    });

    // Case 4: Negation scoped to one tooth only
    it('TC4: "36 ohne Kofferdam; 14 mit Kofferdam"', () => {
        const result = scopeExtractionToInstances('36 ohne Kofferdam; 14 mit Kofferdam');

        expect(verifyNegationIsolation(result)).toBe(true);

        const i36 = result.instances.find(i => i.teeth.includes('36'));
        expect(i36?.negations.some(n => n.includes('ohne'))).toBe(true);

        const i14 = result.instances.find(i => i.teeth.includes('14'));
        expect(i14?.negations.some(n => n.includes('ohne'))).toBe(false);
    });

    // Case 5: Segment marker "zusätzlich"
    it('TC5: "36 okklusal, zusätzlich 37 distal"', () => {
        const result = scopeExtractionToInstances('36 okklusal, zusätzlich 37 distal');

        expect(result.instances.length).toBe(2);
        expect(result.segmentCount).toBeGreaterThanOrEqual(2);
    });

    // Case 6: Segment marker "weiterer Zahn"
    it('TC6: "36 okklusal Caries profunda, weiterer Zahn 46 mesial"', () => {
        const result = scopeExtractionToInstances('36 okklusal Caries profunda, weiterer Zahn 46 mesial');

        expect(result.instances.length).toBe(2);

        const i36 = result.instances.find(i => i.teeth.includes('36'));
        const i46 = result.instances.find(i => i.teeth.includes('46'));

        expect(i36).toBeDefined();
        expect(i46).toBeDefined();
    });

    // Case 7: Global scope marker "bei beiden"
    it('TC7: "36 und 14, bei beiden adhäsiv"', () => {
        const result = scopeExtractionToInstances('36 und 14, bei beiden adhäsiv');

        expect(result.globalMarkers).toContain('global');
    });

    // Case 8: Material scoped per tooth
    it('TC8: "36 Komposit; 14 GIZ"', () => {
        const result = scopeExtractionToInstances('36 Komposit; 14 GIZ');

        expect(result.instances.length).toBe(2);
        // Each instance has its own source text
        expect(result.instances[0].sourceText).not.toBe(result.instances[1].sourceText);
    });

    // Case 9: Tricky adhesive negation
    it('TC9: "36 okklusal adhäsiv; 14 distal ohne Adhäsiv"', () => {
        const result = scopeExtractionToInstances('36 okklusal adhäsiv; 14 distal ohne Adhäsiv');

        const i14 = result.instances.find(i => i.teeth.includes('14'));
        expect(i14?.negations.some(n => n.includes('adhäsiv'))).toBe(true);

        const i36 = result.instances.find(i => i.teeth.includes('36'));
        expect(i36?.negations.some(n => n.includes('adhäsiv'))).toBe(false);
    });

    // Case 10: Complex multi-segment
    it('TC10: "36 mod Komposit adhäsiv. Danach 14 okklusal. Auch 46 distal ohne Kofferdam"', () => {
        const result = scopeExtractionToInstances(
            '36 mod Komposit adhäsiv. Danach 14 okklusal. Auch 46 distal ohne Kofferdam'
        );

        expect(result.instances.length).toBe(3);
        expect(result.segmentCount).toBe(3);

        // Verify no cross-contamination
        expect(verifySurfaceIsolation(result)).toBe(true);
        expect(verifyNegationIsolation(result)).toBe(true);

        // Only 46 should have the negation
        const i46 = result.instances.find(i => i.teeth.includes('46'));
        expect(i46?.negations.length).toBeGreaterThan(0);

        const i36 = result.instances.find(i => i.teeth.includes('36'));
        expect(i36?.negations.length).toBe(0);
    });

    // Case 11: Segment without tooth should not create unknown instance
    it('TC11: "Zahn 15 okklusal; Mehrkosten 150€."', () => {
        const result = scopeExtractionToInstances('Zahn 15 okklusal; Mehrkosten 150€.');

        expect(result.instances.length).toBe(1);
        expect(result.instances[0].teeth).toContain('15');
        expect(result.instances.some(i => i.teeth.includes('unknown'))).toBe(false);
        expect(result.globalSegments.length).toBe(1);
    });
});
