/**
 * Treatment KB Provider Types
 *
 * Type definitions for the Treatment KB provider layer.
 */

// ═══════════════════════════════════════════════════════════════
// KB CHIP (mirrors unified.json structure)
// ═══════════════════════════════════════════════════════════════

export interface TreatmentKbChip {
    id: string;
    label: string;
    phase?: string;
    category?: string;
    textSnippets?: {
        kurz?: string;
        mittel?: string;
        lang?: string;
    };
    billingRef?: {
        GKV?: string;
        PKV?: string;
    } | null;
    variablen?: Record<string, {
        required?: boolean;
        default?: unknown;
        options?: unknown[];
    }>;
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT KB (unified.json)
// ═══════════════════════════════════════════════════════════════

export interface TreatmentKb {
    _meta: {
        id: string;
        version: string;
    };
    chips: TreatmentKbChip[];
}

// ═══════════════════════════════════════════════════════════════
// KB METADATA
// ═══════════════════════════════════════════════════════════════

/**
 * Metadata about a loaded Treatment KB.
 */
export interface TreatmentKbMeta {
    /** Treatment ID */
    treatmentId: string;
    /** KB version (from unified.json _meta) */
    version: string;
    /** Stable hash of KB content */
    hash: string;
    /** Source of this KB */
    source: 'json' | 'firestore' | 'firestore_fallback' | 'forced';
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Treatment KB Provider interface.
 *
 * Abstracts access to treatment-specific KBs (unified.json per treatment).
 * Default implementation loads from JSON; can be swapped for Firestore.
 */
export interface TreatmentKbProvider {
    /**
     * Get the treatment KB for a specific treatment.
     * @returns KB or null if not found
     */
    getTreatmentKb(treatmentId: string, releaseId?: string): TreatmentKb | null;

    /**
     * Get metadata about the loaded KB.
     * @returns Meta or null if treatment not loaded
     */
    getMeta(treatmentId: string, releaseId?: string): TreatmentKbMeta | null;

    /**
     * Get all loaded treatment metas.
     */
    getAllMetas(): TreatmentKbMeta[];
}
