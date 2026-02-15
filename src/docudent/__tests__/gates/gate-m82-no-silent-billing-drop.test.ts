/**
 * Gate G3: No Silent Billing Drop
 * 
 * If billing codes array is empty, meta.diagnostic MUST have reason codes.
 * FAILs if billing is empty without diagnostic explaining why.
 */

import { describe, it, expect } from 'vitest';

// This gate validates the runtime contract at the type level
// Actual runtime enforcement is in runV10.ts

interface BillingOutput {
    billingCodes: Array<{ code: string }>;
    meta?: {
        diagnostic?: {
            billing_empty_reason?: string;
            blocked_chips?: Array<{ chipId: string; reason: string }>;
        };
    };
}

function validateNonSilentBilling(output: BillingOutput): { valid: boolean; reason?: string } {
    if (output.billingCodes.length > 0) {
        return { valid: true };
    }

    // Billing is empty - diagnostic must explain
    const diagnostic = output.meta?.diagnostic;
    if (!diagnostic) {
        return { valid: false, reason: 'Empty billing with no diagnostic' };
    }

    if (!diagnostic.billing_empty_reason && !diagnostic.blocked_chips?.length) {
        return { valid: false, reason: 'Empty billing without reason or blocked_chips' };
    }

    return { valid: true };
}

describe('gate-m82-no-silent-billing-drop', () => {
    it('should accept non-empty billing', () => {
        const output: BillingOutput = {
            billingCodes: [{ code: 'BEMA_13' }],
        };
        const result = validateNonSilentBilling(output);
        expect(result.valid).toBe(true);
    });

    it('should reject empty billing without diagnostic', () => {
        const output: BillingOutput = {
            billingCodes: [],
        };
        const result = validateNonSilentBilling(output);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('no diagnostic');
    });

    it('should accept empty billing with reason', () => {
        const output: BillingOutput = {
            billingCodes: [],
            meta: {
                diagnostic: {
                    billing_empty_reason: 'No eligible chips - all blocked by missing facts',
                },
            },
        };
        const result = validateNonSilentBilling(output);
        expect(result.valid).toBe(true);
    });

    it('should accept empty billing with blocked_chips list', () => {
        const output: BillingOutput = {
            billingCodes: [],
            meta: {
                diagnostic: {
                    blocked_chips: [
                        { chipId: 'la_infiltr', reason: 'missing anesthesia_type fact' },
                    ],
                },
            },
        };
        const result = validateNonSilentBilling(output);
        expect(result.valid).toBe(true);
    });

    it('should reject empty billing with empty diagnostic', () => {
        const output: BillingOutput = {
            billingCodes: [],
            meta: {
                diagnostic: {},
            },
        };
        const result = validateNonSilentBilling(output);
        expect(result.valid).toBe(false);
    });
});
