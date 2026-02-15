/**
 * Vocabulary Registry — Domain-Agnostic Code Validation
 *
 * ═══════════════════════════════════════════════════════════════
 * Central registry that maps fieldName → allowedCodes + labels.
 * Used by fieldValidation.ts and renderers for any domain.
 * 
 * HARD RULE: No domain-specific code inside validation logic.
 * Each domain registers its own vocabulary here.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VocabEntry {
    codes: readonly string[];
    labels: Record<string, string>;
}

export interface DomainVocab {
    /** Domain identifier (e.g., 'endo', 'filling') */
    domain: string;
    /** Map from fieldName → VocabEntry */
    fields: Record<string, VocabEntry>;
    /** Optional: ISO sizes for per-canal tables */
    isoSizes?: readonly number[];
    /** Optional: Taper values for per-canal tables */
    taperValues?: readonly string[];
}

export interface VocabRegistry {
    domains: Map<string, DomainVocab>;
    /** Combined field→codes map for validation */
    fieldAllowedCodes: Map<string, readonly string[]>;
    /** Combined field→labels map for rendering */
    fieldLabels: Map<string, Record<string, string>>;
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL REGISTRY
// ═══════════════════════════════════════════════════════════════

const registry: VocabRegistry = {
    domains: new Map(),
    fieldAllowedCodes: new Map(),
    fieldLabels: new Map(),
};

// ═══════════════════════════════════════════════════════════════
// REGISTRATION API
// ═══════════════════════════════════════════════════════════════

/**
 * Register a domain vocabulary into the global registry.
 * Multiple domains can share field names if codes are compatible.
 */
export function registerDomainVocab(vocab: DomainVocab): void {
    registry.domains.set(vocab.domain, vocab);

    // Merge field → codes/labels into combined maps
    for (const [fieldName, entry] of Object.entries(vocab.fields)) {
        registry.fieldAllowedCodes.set(fieldName, entry.codes);
        registry.fieldLabels.set(fieldName, entry.labels);
    }
}

/**
 * Get allowed codes for a field (domain-agnostic lookup).
 */
export function getFieldAllowedCodes(fieldName: string): readonly string[] | undefined {
    return registry.fieldAllowedCodes.get(fieldName);
}

/**
 * Get labels map for a field (domain-agnostic lookup).
 */
export function getFieldLabels(fieldName: string): Record<string, string> | undefined {
    return registry.fieldLabels.get(fieldName);
}

/**
 * Get label for a code from any field.
 */
export function toLabel(fieldName: string, code: string): string {
    const labels = registry.fieldLabels.get(fieldName);
    return labels?.[code] ?? code;
}

/**
 * Check if a code is valid for a field.
 */
export function isValidFieldCode(fieldName: string, code: string): boolean {
    const allowed = registry.fieldAllowedCodes.get(fieldName);
    return allowed?.includes(code) ?? false;
}

/**
 * Get domain vocab by domain name.
 */
export function getDomainVocab(domain: string): DomainVocab | undefined {
    return registry.domains.get(domain);
}

/**
 * Get ISO sizes for a domain (used for per-canal table validation).
 */
export function getDomainISOSizes(domain: string): readonly number[] | undefined {
    return registry.domains.get(domain)?.isoSizes;
}

/**
 * Get taper values for a domain.
 */
export function getDomainTaperValues(domain: string): readonly string[] | undefined {
    return registry.domains.get(domain)?.taperValues;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if value looks like a label (contains spaces/umlauts).
 * Used to detect incorrect German strings passed as codes.
 */
export function looksLikeLabel(value: string): boolean {
    return /[äöüß\s\/]/.test(value);
}

/**
 * Validate a single code against field vocabulary.
 */
export function validateCode(
    fieldName: string,
    code: string
): { valid: boolean; error?: string } {
    const allowed = registry.fieldAllowedCodes.get(fieldName);

    // Field not in registry - allow (domain-specific handling)
    if (!allowed) {
        return { valid: true };
    }

    if (looksLikeLabel(code)) {
        return {
            valid: false,
            error: `Invalid label-string for ${fieldName}: '${code}' (expected code: ${allowed.slice(0, 3).join('|')}...)`,
        };
    }

    if (!allowed.includes(code)) {
        return {
            valid: false,
            error: `Invalid code for ${fieldName}: '${code}' (expected one of ${allowed.join('|')})`,
        };
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT REGISTRY FOR TESTING
// ═══════════════════════════════════════════════════════════════

export function getRegistry(): VocabRegistry {
    return registry;
}

export function clearRegistry(): void {
    registry.domains.clear();
    registry.fieldAllowedCodes.clear();
    registry.fieldLabels.clear();
}
