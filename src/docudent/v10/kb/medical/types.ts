/**
 * Medical KB Provider Types
 *
 * Type definitions for the Medical KB provider layer.
 */

import type { MedicalKB } from '../../../medical_kb/schema.v1';

// ═══════════════════════════════════════════════════════════════
// KB METADATA
// ═══════════════════════════════════════════════════════════════

/**
 * Metadata about the loaded Medical KB.
 */
export interface MedicalKbMeta {
    /** KB version (from medical_kb.v1.json) */
    version: string;
    /** Stable hash of KB content */
    hash: string;
    /** Source of this KB */
    source: 'json' | 'firestore' | 'forced';
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Medical KB Provider interface.
 *
 * Abstracts access to the Medical KB for rules, askbacks, concepts.
 * Default implementation loads from JSON; can be swapped for Firestore.
 */
export interface MedicalKbProvider {
    /**
     * Get the medical knowledge base.
     */
    getMedicalKb(): MedicalKB;

    /**
     * Get metadata about the loaded KB.
     */
    getMeta(): MedicalKbMeta;
}

// Re-export MedicalKB type for convenience
export type { MedicalKB };
