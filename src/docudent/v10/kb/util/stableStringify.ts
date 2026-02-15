/**
 * Stable JSON Stringify
 *
 * Produces deterministic JSON output by sorting object keys.
 * Used for hash computation to ensure consistent results.
 */

/**
 * Stringify JSON with sorted keys for deterministic output.
 */
export function stableStringify(obj: unknown): string {
    return JSON.stringify(obj, sortedReplacer, 0);
}

/**
 * JSON replacer that sorts object keys alphabetically.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }

    // Sort object keys
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
}
