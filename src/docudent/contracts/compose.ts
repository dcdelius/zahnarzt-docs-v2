/**
 * Compose Contracts — P12: Billing-Referenced Compose
 *
 * Types for structured, traceable compose output where every billing-relevant
 * token is backed by a BillingRef pointing to the billing database.
 *
 * INVARIANTS:
 * - copyText is ONLY derived from blocks.map(b => b.text).join('\n\n')
 * - Every BillingRef.canonicalKey must exist in billing DB
 * - billingRefs is deduplicated from blocks[].refs
 * - NO timestamps or non-deterministic fields in core types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING REFERENCE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Billing systems supported */
export type BillingSystem = 'BEMA' | 'GOZ' | 'BEL' | 'GOAE' | 'LAB';

/**
 * Reference to a billing database entry.
 * Every billing-relevant content in output must have a corresponding BillingRef.
 */
export interface BillingRef {
    /** Billing system (BEMA for GKV, GOZ for PKV, etc.) */
    system: BillingSystem;

    /** Code number (e.g., '13a', '2060', '2197') */
    code: string;

    /** Canonical key for DB lookup: 'SYSTEM_CODE' format (e.g., 'BEMA_13a', 'GOZ_2060') */
    canonicalKey: string;

    /** Rule or trigger that activated this code (for traceability) */
    reason: string;

    /** Optional description from billing DB */
    description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSED DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single block of composed text with billing references.
 * Maps to a section in the output document.
 */
export interface ComposedBlock {
    /** ID of the source ComposedSection (for traceability) */
    sourceSectionId: string;

    /** Text content of this block */
    text: string;

    /** Billing references in this block (may be empty for non-billing sections) */
    refs: BillingRef[];
}

/**
 * Metadata for composed document (NO TIMESTAMP - deterministic core)
 */
export interface ComposedDocumentV1Metadata {
    /** Treatment type (e.g., 'fuellung', 'endo') */
    treatmentId: string;

    /** Insurance type */
    insuranceType: 'GKV' | 'PKV';

    /** Documentation mode for presentation */
    docMode: 'fast' | 'balanced' | 'forensic';

    /** Whether MKV (Mehrkostenvereinbarung) is active */
    hasMKV: boolean;
}

/**
 * V1 Composed Document with full billing traceability.
 *
 * INVARIANT: copyText === blocks.map(b => b.text).join('\n\n')
 */
export interface ComposedDocumentV1 {
    /** User-copyable text (derived from blocks, never ad-hoc) */
    copyText: string;

    /** Structured blocks with billing references */
    blocks: ComposedBlock[];

    /** Deduplicated billing references from all blocks */
    billingRefs: BillingRef[];

    /** Document metadata (NO timestamp) */
    metadata: ComposedDocumentV1Metadata;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINABILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Combinability check verdict */
export type CombinabilityVerdict = 'PASS' | 'WARN' | 'BLOCK';

/**
 * A conflict between two billing codes.
 */
export interface CombinabilityConflict {
    /** First conflicting code (canonicalKey) */
    codeA: string;

    /** Second conflicting code (canonicalKey) */
    codeB: string;

    /** Rule ID from kombinationen.json */
    ruleId: string;

    /** Human-readable reason */
    reason: string;

    /** Severity from rule: 'regress' → BLOCK, 'warnung' → WARN */
    severity: 'regress' | 'warnung' | 'info';
}

/**
 * Result of combinability check.
 */
export interface CombinabilityResult {
    /** Overall verdict */
    verdict: CombinabilityVerdict;

    /** List of conflicts found */
    conflicts: CombinabilityConflict[];

    /** Optional warnings (coverage gaps, auto-resolve notes) */
    warnings?: string[];

    /** Required justifications for billing */
    requiredJustifications: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize billing code to canonical key format: 'SYSTEM_CODE'
 * @param system - Billing system (BEMA, GOZ, etc.)
 * @param code - Code number (13a, 2060, etc.)
 * @returns Canonical key in format 'BEMA_13a', 'GOZ_2060'
 */
export function normalizeCanonicalKey(system: BillingSystem, code: string): string {
    // Strip existing prefix if present
    const cleanCode = code.replace(/^(BEMA_|GOZ_|BEL_|GOAE_|LAB_)/i, '');
    return `${system}_${cleanCode}`;
}

/**
 * Parse canonical key into system and code.
 * @param canonicalKey - Key in 'SYSTEM_CODE' format
 * @returns { system, code } or null if invalid
 */
export function parseCanonicalKey(canonicalKey: string): { system: BillingSystem; code: string } | null {
    const match = canonicalKey.match(/^(BEMA|GOZ|BEL|GOAE|LAB)_(.+)$/);
    if (!match) return null;
    return {
        system: match[1] as BillingSystem,
        code: match[2]
    };
}

/**
 * Derive copyText from blocks (enforces invariant).
 * @param blocks - Array of composed blocks
 * @returns Joined text with double newlines
 */
export function deriveCopyTextFromBlocks(blocks: ComposedBlock[]): string {
    return blocks.map(b => b.text).filter(t => t.trim()).join('\n\n');
}

/**
 * Deduplicate billing refs by canonicalKey.
 * @param refs - Array of billing refs (may have duplicates)
 * @returns Deduplicated array (first occurrence wins)
 */
export function dedupeBillingRefs(refs: BillingRef[]): BillingRef[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
        if (seen.has(ref.canonicalKey)) return false;
        seen.add(ref.canonicalKey);
        return true;
    });
}
