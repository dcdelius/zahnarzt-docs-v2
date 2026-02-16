import { describe, expect, it } from 'vitest';
import {
    containsBillingSignal,
    isLlmTextSafeForBillingBoundary,
} from '../../llm/llmBoundaryContract';

describe('llmBoundaryContract', () => {
    it('detects billing-code strings', () => {
        expect(containsBillingSignal('BEMA 13b')).toBe(true);
        expect(containsBillingSignal('GOZ_2060')).toBe(true);
    });

    it('detects billing-like keys in objects', () => {
        expect(containsBillingSignal({ billingCodes: ['BEMA_13b'] })).toBe(true);
        expect(containsBillingSignal({ nested: { billingRef: 'GOZ_2060' } })).toBe(true);
    });

    it('accepts clinical text without billing signals', () => {
        const text = 'Zahn 36 mit Komposit versorgt, Okklusion kontrolliert.';
        expect(containsBillingSignal(text)).toBe(false);
        expect(isLlmTextSafeForBillingBoundary(text)).toBe(true);
    });
});
