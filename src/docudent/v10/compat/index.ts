/**
 * V10 Compat Module — Barrel Export
 * 
 * ARCHITECTURE: V10 is the facade for all core/billing access.
 * V7 MUST import through this module, never directly from core/billing.
 */

export { v10CheckCombinability } from './combinability';
export type { V10CombinabilityResult } from './combinability';

export {
    isMilchzahn,
    isMilchzahnSupported,
    checkMilchzahnSupport,
} from './milchzahn';
export type { MilchzahnCheckResult } from './milchzahn';

// ═══════════════════════════════════════════════════════════════
// V10 FACADE FOR CORE/BILLING (V7 must use these, not direct imports)
// ═══════════════════════════════════════════════════════════════

/**
 * Re-export checkCombinability for V7 multi-treatment orchestrator.
 * V7 imports from here, not from core/billing directly.
 */
export { checkCombinability } from '../../core/billing/combinability/billingCombinabilityChecker';

/**
 * Re-export getBillingScopeWithFallback for V7 billing aggregation.
 * V7 imports from here, not from core/billing directly.
 */
export { getBillingScopeWithFallback } from '../../core/billing/knowledgeBase/logic/billingScopeResolver';
export type { BillingScopeNormalized } from '../../core/billing/knowledgeBase/logic/billingScopeResolver';
