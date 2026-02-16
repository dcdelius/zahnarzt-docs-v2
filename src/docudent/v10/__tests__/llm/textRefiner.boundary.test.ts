import { describe, expect, it } from 'vitest';
import {
    hasBillingCodeTokens,
    isRefinementSafe,
} from '../../llm/textRefiner';

describe('textRefiner boundary', () => {
    const original = 'Zahn 36 wurde mit Komposit versorgt.';

    it('rejects refinements with billing signals', () => {
        expect(hasBillingCodeTokens('BEMA 13b berechnen.')).toBe(true);
        expect(isRefinementSafe(original, 'Zahn 36 wurde mit Komposit versorgt. GOZ_2060.')).toBe(false);
    });

    it('rejects refinements with changed numeric clinical facts', () => {
        expect(isRefinementSafe(original, 'Zahn 26 wurde mit Komposit versorgt.')).toBe(false);
    });

    it('accepts grammar-only safe refinement', () => {
        expect(isRefinementSafe(original, 'Zahn 36 wurde mit Komposit versorgt.')).toBe(true);
    });
});
