/**
 * V10 Combinability Wrapper
 *
 * Wraps the existing combinability checker for V10 pipeline integration.
 * Returns structured result with trace info.
 */

import { checkCombinability } from '../../core/billing/combinability/billingCombinabilityChecker';
import type { CombinabilityResult } from '../../contracts/compose';

export interface V10CombinabilityResult extends CombinabilityResult {
    /** Whether output should be blocked */
    blocked: boolean;
    /** Trace-safe summary */
    traceSummary: string;
}

/**
 * Check billing code combinability for V10 pipeline.
 *
 * @param billingCodes - Array of canonical billing codes
 * @param treatmentId - Treatment type for context
 * @param insuranceType - GKV or PKV
 * @returns Result with verdict, conflicts, and trace info
 */
export function v10CheckCombinability(
    billingCodes: string[],
    treatmentId: string,
    insuranceType: 'GKV' | 'PKV'
): V10CombinabilityResult {
    // Use existing combinability logic
    const result = checkCombinability(billingCodes, treatmentId, insuranceType);

    // Determine if blocked
    const blocked = result.verdict === 'BLOCK';

    // Build trace summary
    const traceSummary = `verdict=${result.verdict};conflicts=${result.conflicts.length};blocked=${blocked}`;

    return {
        ...result,
        blocked,
        traceSummary,
    };
}
