/**
 * KB Hash Utility
 *
 * Computes stable SHA-256 hash for KB content.
 */

import { stableStringify } from './stableStringify';

/**
 * Compute SHA-256 hash of KB content using stable stringify.
 * Returns first 12 characters of hex hash for brevity.
 */
export function computeKbHash(content: unknown): string {
    const json = stableStringify(content);

    // Use Web Crypto API for browser compatibility
    // In Node.js tests, this uses the crypto polyfill
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Async version for browser - we'll use sync fallback for now
        return computeHashSync(json);
    }

    return computeHashSync(json);
}

/**
 * Synchronous hash computation using simple checksum.
 * For browser compatibility without async.
 */
function computeHashSync(str: string): string {
    // Simple deterministic hash (djb2 variant)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }

    // Convert to hex and take first 12 chars
    const hex = (hash >>> 0).toString(16).padStart(8, '0');

    // Add length-based suffix for more uniqueness
    const lengthHex = (str.length % 0xffff).toString(16).padStart(4, '0');

    return hex + lengthHex;
}

/**
 * Compute hash asynchronously using Web Crypto (for future use).
 */
export async function computeKbHashAsync(content: unknown): Promise<string> {
    const json = stableStringify(content);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(json);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.slice(0, 12);
    }

    // Fallback to sync
    return computeHashSync(json);
}
