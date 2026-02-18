import { describe, it, expect } from 'vitest';
import { normalizeSurfaces } from '../../extraction/surfaces/normalizeSurfaces';

describe('V10 Surface Lexicon', () => {
    it('maps distalinzisal to D+O', () => {
        const result = normalizeSurfaces({
            dictation: 'Zahn 11 distalinzisal Kompositfüllung.',
        });

        expect(result.surfaces).toEqual(['o', 'd']);
        expect(result.hasAmbiguity).toBe(false);
    });

    it('maps inzisal to O (front teeth occlusal)', () => {
        const result = normalizeSurfaces({
            dictation: 'Zahn 11 inzisal Kompositfüllung.',
        });

        expect(result.surfaces).toEqual(['o']);
        expect(result.hasAmbiguity).toBe(false);
    });

    it('keeps explicit MODB surfaces even when contact point is mentioned', () => {
        const result = normalizeSurfaces({
            dictation: 'Zahn 45 MODB Kompositfüllung, Kontaktpunkt und Okklusion kontrolliert.',
        });

        expect(result.surfaces).toEqual(['m', 'o', 'd', 'b']);
        expect(result.hasAmbiguity).toBe(false);
    });

    it('maps shorthand IB to O+B for anterior shorthand dictation', () => {
        const result = normalizeSurfaces({
            dictation: '11 IB Komposit adhäsiv, finiert und poliert.',
        });

        expect(result.surfaces).toEqual(['o', 'b']);
        expect(result.hasAmbiguity).toBe(false);
    });

    it('prefers explicit dictation surfaces when extraction conflicts', () => {
        const result = normalizeSurfaces({
            extracted: ['o', 'l'],
            dictation: '11 IB Komposit adhäsiv.',
        });

        expect(result.surfaces).toEqual(['o', 'b']);
        expect(result.source).toBe('dictation');
        expect(result.hasAmbiguity).toBe(false);
    });
});
