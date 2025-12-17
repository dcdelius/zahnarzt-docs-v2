/**
 * Deep Stable Stringify — Deterministic JSON serialization
 *
 * Recursively sorts object keys at all nesting levels to produce
 * a deterministic string representation suitable for hashing.
 */

/**
 * Recursively sort object keys for deterministic JSON output.
 * Handles nested objects and arrays.
 */
export function deepStableStringify(value: unknown): string {
    return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(sortDeep);
    }

    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        const sortedKeys = Object.keys(obj).sort();
        const sortedObj: Record<string, unknown> = {};
        for (const key of sortedKeys) {
            sortedObj[key] = sortDeep(obj[key]);
        }
        return sortedObj;
    }

    return value;
}

/**
 * Compute SHA-256 hash of any value using deep stable stringify.
 * Works in browser via SubtleCrypto API.
 */
export async function computeSettingsHash(settings: Record<string, unknown>): Promise<string> {
    const canonical = deepStableStringify(settings);
    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);

    // Use SubtleCrypto (Web Crypto API) - works in browser and Node 18+
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `sha256:${hashHex.slice(0, 32)}`; // Truncate to 32 chars for readability
}

/**
 * Synchronous hash for environments without SubtleCrypto (fallback).
 * Uses a simple djb2-based hash - NOT cryptographic, but deterministic.
 */
export function computeSettingsHashSync(settings: Record<string, unknown>): string {
    const canonical = deepStableStringify(settings);
    let hash = 5381;
    for (let i = 0; i < canonical.length; i++) {
        hash = ((hash << 5) + hash) + canonical.charCodeAt(i);
        hash = hash >>> 0; // Convert to unsigned 32-bit
    }
    return `djb2:${hash.toString(16).padStart(8, '0')}`;
}
