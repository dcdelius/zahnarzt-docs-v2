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

    /** Billing codes */
    billingCodes: string[];

    /** Validation warnings - MUST BE OBJECTS */
    warnings: ValidationWarning[];
}
