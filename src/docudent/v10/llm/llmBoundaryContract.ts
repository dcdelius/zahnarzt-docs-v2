export const LLM_BOUNDARY_CONTRACT_VERSION = '1.0.0';

const BILLING_TOKEN_PATTERN = /\b(?:BEMA|GOZ|GOAE|GOÄ|BEL)\s*_?\s*\d+[a-z]?\b/i;
const BILLING_KEY_PATTERN = /\b(?:billing|billingCode|billingCodes|billingRef|billingRefs|goz|bema|bel|goae|goä)\b/i;

function hasBillingSignalInString(value: string): boolean {
    return BILLING_TOKEN_PATTERN.test(value) || BILLING_KEY_PATTERN.test(value);
}

export function containsBillingSignal(value: unknown): boolean {
    if (typeof value === 'string') {
        return hasBillingSignalInString(value);
    }
    if (Array.isArray(value)) {
        return value.some(containsBillingSignal);
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
            if (BILLING_KEY_PATTERN.test(key)) return true;
            return containsBillingSignal(nested);
        });
    }
    return false;
}

export function isLlmTextSafeForBillingBoundary(text: string): boolean {
    if (!text || !text.trim()) return false;
    return !containsBillingSignal(text);
}
