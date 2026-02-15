/**
 * Combinability KB Schema v1
 *
 * Types for the SSOT combinability knowledge base.
 * Rules define when billing codes cannot be combined.
 */

import type { SourceRef } from '../../../medical_kb/schema.v1';

// ═══════════════════════════════════════════════════════════════════════════════
// RULE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Rule type determines how the rule is evaluated */
export type CombinabilityRuleType =
    | 'ausschluss'      // Codes cannot be combined (hard block)
    | 'bedingung'       // Conditional requirement
    | 'haeufigkeit'     // Frequency limit
    | 'dokumentation';  // Documentation requirement

/** Scope determines at what level the rule applies */
export type CombinabilityScope =
    | 'SESSION'         // Per treatment session
    | 'TOOTH'           // Per tooth
    | 'QUADRANT'        // Per quadrant/Kieferhälfte
    | 'CANAL'           // Per root canal
    | 'UNKNOWN';        // Scope not determinable

/** Severity determines the action taken */
export type CombinabilitySeverity =
    | 'regress'         // Hard block (BLOCK verdict)
    | 'warnung'         // Warning (WARN verdict)
    | 'info';           // Info only (PASS with note)

// ═══════════════════════════════════════════════════════════════════════════════
// RULE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CombinabilityRule {
    /** Unique rule ID */
    id: string;

    /** Rule type */
    typ: CombinabilityRuleType;

    /** Human-readable title */
    titel: string;

    /** Full description */
    beschreibung: string;

    /** Codes this rule affects */
    betrifft: string[];

    /** Rule logic */
    regel: {
        operator: 'darf_nicht' | 'nur_wenn' | 'max_anzahl' | 'muss';
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };

    /** Severity level */
    schweregrad: CombinabilitySeverity;

    /** Source references for traceability */
    sourceRefs: SourceRef[];

    /** Derived scope (computed from regel.bezug) */
    scope: CombinabilityScope;

    /** For ausschluss rules: codes that cannot be combined with betrifft */
    blockWith?: string[];

    /** Auto-resolve policy (instead of BLOCK):
     * - 'drop_anchor': Drop the anchor code (first in betrifft not in blockWith)
     * - 'drop_blockwith': Drop the blockWith codes
     * - undefined: Use default BLOCK behavior
     */
    autoResolve?: 'drop_anchor' | 'drop_blockwith';

    /** Priority for conflict resolution (higher = more important) */
    priority: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KB STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CombinabilityKbMeta {
    version: string;
    generatedAt: string;
    sourceFile: string;
    ruleCount: number;
    hash: string;
}

export interface CombinabilityKb {
    _meta: CombinabilityKbMeta;
    rules: CombinabilityRule[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export type CombinabilityVerdict = 'PASS' | 'WARN' | 'BLOCK';

export interface CombinabilityConflict {
    /** Rule that was violated */
    ruleId: string;

    /** Codes involved in the conflict */
    codesInvolved: string[];

    /** Human-readable reason */
    reason: string;

    /** Source references for the rule */
    sourceRefs: SourceRef[];

    /** Scope of the conflict */
    scope: CombinabilityScope;

    /** Specific tooth if scoped */
    tooth?: string;

    /** Severity of the conflict */
    severity: CombinabilitySeverity;
}

export interface CombinabilityCheckResult {
    /** Overall verdict */
    verdict: CombinabilityVerdict;

    /** List of conflicts found */
    conflicts: CombinabilityConflict[];

    /** Codes that should be blocked from output (error if present) */
    blockedCodes: string[];

    /** Codes that were auto-dropped to resolve conflicts */
    droppedCodes: string[];

    /** Warnings about auto-resolved conflicts */
    warnings: string[];

    /** Trace-safe summary line */
    traceLine: string;

    /** KB version used for the check */
    kbVersion: string;
}
