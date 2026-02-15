/**
 * SHARED CONTRACTS — ComposedOutput
 *
 * This is the SINGLE SOURCE OF TRUTH for output types.
 * All modules (backend AND frontend) MUST import from here.
 */

import type { ValidationWarning } from './warnings';

export interface ComposedSection {
    id: string;
    label: string;
    content: string;
    lines: string[];
    format: string;
}

export interface ComposedOutput {
    /** Output sections */
    sections: ComposedSection[];

    /** Full text for copy */
    fullText: string;

    /** P14.2 MF2: SSOT copyText derived from blocks. Prefer this over fullText. */
    copyText?: string;

    /** Billing codes */
    billingCodes: string[];

    /** Validation warnings - MUST BE OBJECTS */
    warnings: ValidationWarning[];


    // ═══════════════════════════════════════════════════════════════
    // BILLING DIAGNOSTICS (optional, for debugging empty billing)
    // ═══════════════════════════════════════════════════════════════

    /** Codes blocked by eligibility gates (e.g., missing confirmation) */
    billingBlocked?: string[];

    /** Short reason why billing is empty/partial (PII-safe, no dictation) */
    billingReason?: string;

    /** Detailed billing info when available */
    billingDetails?: BillingDetail[];
}

/** Detailed billing code with human-readable label */
export interface BillingDetail {
    code: string;
    label?: string;
    points?: number;
    amount?: number;
    multiplier?: number;
}
