/**
 * Combinability Checker from SSOT KB
 *
 * Checks billing codes against the combinability KB to detect conflicts.
 * This is the V10 SSOT checker that will replace the legacy implementation.
 */

import {
    loadCombinabilityKb,
    getCombinabilityMeta,
} from '../../kb/combinability';
import type {
    CombinabilityRule,
    CombinabilityConflict,
    CombinabilityCheckResult,
    CombinabilityVerdict,
    CombinabilityScope,
} from '../../kb/combinability/schema.v1';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CombinabilityContext {
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV';
    /** Map of tooth → codes for scope-aware checks */
    codesByTooth?: Map<string, string[]>;
}

/**
 * Check billing codes for combinability conflicts using SSOT KB.
 *
 * IMPORTANT: Call this AFTER billing-eligibility guard and renderer,
 * on the final deduplicated billing codes.
 */
export function checkCombinabilityFromKb(
    billingCodes: string[],
    context: CombinabilityContext
): CombinabilityCheckResult {
    const kb = loadCombinabilityKb();
    const meta = getCombinabilityMeta();

    const conflicts: CombinabilityConflict[] = [];
    const blockedCodes = new Set<string>();
    const droppedCodes = new Set<string>();
    const warnings: string[] = [];
    let hasCoverage = false;
    const coveredCodes = new Set<string>();

    // Check each rule
    for (const rule of kb.rules) {
        const appliesToAny = rule.betrifft.some(code => billingCodes.includes(code));
        if (appliesToAny) {
            hasCoverage = true;
        }
        for (const code of rule.betrifft) {
            coveredCodes.add(code);
        }
        const ruleConflicts = evaluateRule(rule, billingCodes, context);
        if (ruleConflicts.length > 0) {
            conflicts.push(...ruleConflicts);

            // Handle auto-resolve vs block
            for (const conflict of ruleConflicts) {
                if (conflict.severity === 'regress' && rule.typ === 'ausschluss') {
                    if (rule.autoResolve) {
                        // AUTO-RESOLVE: Drop codes instead of blocking
                        if (rule.autoResolve === 'drop_anchor') {
                            // Drop the anchor code (the one NOT in blockWith)
                            const anchorCodes = conflict.codesInvolved.filter(
                                code => !rule.blockWith?.includes(code)
                            );
                            for (const code of anchorCodes) {
                                droppedCodes.add(code);
                            }
                            warnings.push(
                                `Auto-resolved: ${anchorCodes.join(', ')} dropped (${rule.titel})`
                            );
                        } else if (rule.autoResolve === 'drop_blockwith') {
                            // Drop the blockWith codes
                            const blockedPresent = conflict.codesInvolved.filter(
                                code => rule.blockWith?.includes(code)
                            );
                            for (const code of blockedPresent) {
                                droppedCodes.add(code);
                            }
                            warnings.push(
                                `Auto-resolved: ${blockedPresent.join(', ')} dropped (${rule.titel})`
                            );
                        }
                    } else {
                        // DEFAULT: Block codes (causes error)
                        for (const code of conflict.codesInvolved) {
                            if (rule.blockWith?.includes(code)) {
                                blockedCodes.add(code);
                            }
                        }
                    }
                }
            }
        }
    }

    // Determine verdict
    // If all regress conflicts were auto-resolved, don't BLOCK
    const unresolvedRegress = conflicts.filter(c =>
        c.severity === 'regress' &&
        !c.codesInvolved.every(code => droppedCodes.has(code))
    );
    let verdict = determineVerdict(unresolvedRegress.filter(c =>
        // Only count conflicts that still have blocked codes
        c.codesInvolved.some(code => blockedCodes.has(code))
    ), droppedCodes.size);

    const coverageUnknown = !hasCoverage && billingCodes.length > 1;
    if (coverageUnknown) {
        warnings.push('Combinability coverage unknown for this code set.');
        if (verdict === 'PASS') verdict = 'WARN';
    }

    if (billingCodes.length > 1) {
        const missingCoverage = billingCodes.filter(code => !coveredCodes.has(code));
        if (missingCoverage.length > 0) {
            warnings.push(`Combinability coverage missing for codes: ${missingCoverage.join(', ')}`);
            if (verdict === 'PASS') verdict = 'WARN';
        }
    }

    // Build trace line
    const traceLine = buildTraceLine(verdict, conflicts, blockedCodes, droppedCodes);

    return {
        verdict,
        conflicts,
        blockedCodes: Array.from(blockedCodes).sort(),
        droppedCodes: Array.from(droppedCodes).sort(),
        warnings,
        traceLine,
        kbVersion: meta.version,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateRule(
    rule: CombinabilityRule,
    billingCodes: string[],
    context: CombinabilityContext
): CombinabilityConflict[] {
    // Check if any of the rule's codes are present
    const presentCodes = rule.betrifft.filter(code => billingCodes.includes(code));
    if (presentCodes.length === 0) {
        return []; // Rule doesn't apply
    }

    switch (rule.typ) {
        case 'ausschluss':
            return evaluateAusschluss(rule, billingCodes, presentCodes, context);

        case 'haeufigkeit':
            return evaluateHaeufigkeit(rule, billingCodes, presentCodes, context);

        // bedingung and dokumentation require context we don't have here
        // They are evaluated elsewhere (medical engine, output composer)
        case 'bedingung':
        case 'dokumentation':
            return [];

        default:
            return [];
    }
}

/**
 * Evaluate exclusion rules (typ=ausschluss).
 * If GOZ_2197 is present AND any of GOZ_2060-2120 is present → BLOCK
 */
function evaluateAusschluss(
    rule: CombinabilityRule,
    billingCodes: string[],
    presentCodes: string[],
    context: CombinabilityContext
): CombinabilityConflict[] {
    if (!rule.blockWith || rule.blockWith.length === 0) {
        return [];
    }

    if (rule.scope !== 'SESSION' && rule.scope !== 'UNKNOWN' && context.codesByTooth) {
        const scopedConflicts: CombinabilityConflict[] = [];
        const grouped = groupCodesByScope(context.codesByTooth, rule.scope);
        for (const [scopeId, codes] of grouped) {
            const scopedPresent = rule.betrifft.filter(code => codes.includes(code));
            const conflict = evaluateAusschlussOnCodes(rule, codes, scopedPresent, scopeId);
            if (conflict) scopedConflicts.push(conflict);
        }
        return scopedConflicts;
    }

    const conflict = evaluateAusschlussOnCodes(rule, billingCodes, presentCodes);
    return conflict ? [conflict] : [];
}

function evaluateAusschlussOnCodes(
    rule: CombinabilityRule,
    codes: string[],
    presentCodes: string[],
    scopeId?: string
): CombinabilityConflict | null {
    // Find which blockWith codes are present
    const blockedPresent = rule.blockWith?.filter(code => codes.includes(code)) ?? [];

    // For exclusion: need at least one "trigger" code and one "blocked" code
    const triggerCodes = presentCodes.filter(code => !(rule.blockWith ?? []).includes(code));

    if (triggerCodes.length === 0 || blockedPresent.length === 0) {
        return null;
    }

    // Conflict found
    return {
        ruleId: rule.id,
        codesInvolved: [...triggerCodes, ...blockedPresent].sort(),
        reason: rule.beschreibung,
        sourceRefs: rule.sourceRefs,
        scope: rule.scope,
        tooth: scopeId,
        severity: rule.schweregrad,
    };
}

/**
 * Evaluate frequency rules (typ=haeufigkeit).
 * Check if code count exceeds max_anzahl for the given scope.
 */
function evaluateHaeufigkeit(
    rule: CombinabilityRule,
    billingCodes: string[],
    presentCodes: string[],
    context: CombinabilityContext
): CombinabilityConflict[] {
    if (rule.regel.operator !== 'max_anzahl' || rule.regel.wert === undefined) {
        return [];
    }

    // Count occurrences of the affected codes
    // Note: In a real bundle, codes may appear multiple times
    const count = presentCodes.length;
    const maxAllowed = rule.regel.wert;

    if (rule.scope !== 'SESSION' && rule.scope !== 'UNKNOWN' && context.codesByTooth) {
        const conflicts: CombinabilityConflict[] = [];
        const grouped = groupCodesByScope(context.codesByTooth, rule.scope);
        for (const [scopeId, codes] of grouped) {
            const scopedPresent = rule.betrifft.filter(code => codes.includes(code));
            const scopedCount = scopedPresent.length;
            if (scopedCount > maxAllowed) {
                conflicts.push({
                    ruleId: rule.id,
                    codesInvolved: scopedPresent,
                    reason: `${rule.titel}: ${scopedCount}x vorhanden, max ${maxAllowed} erlaubt`,
                    sourceRefs: rule.sourceRefs,
                    scope: rule.scope,
                    tooth: scopeId,
                    severity: rule.schweregrad,
                });
            }
        }
        return conflicts;
    }

    if (count <= maxAllowed) {
        return [];
    }

    return [
        {
            ruleId: rule.id,
            codesInvolved: presentCodes,
            reason: `${rule.titel}: ${count}x vorhanden, max ${maxAllowed} erlaubt`,
            sourceRefs: rule.sourceRefs,
            scope: rule.scope,
            severity: rule.schweregrad,
        },
    ];
}

function groupCodesByScope(
    codesByTooth: Map<string, string[]>,
    scope: CombinabilityScope
): Map<string, string[]> {
    if (scope === 'TOOTH') {
        return new Map(codesByTooth);
    }
    if (scope === 'QUADRANT') {
        const byQuadrant = new Map<string, string[]>();
        for (const [tooth, codes] of codesByTooth) {
            const quadrant = getQuadrant(tooth);
            if (!quadrant) continue;
            const key = `Q${quadrant}`;
            const list = byQuadrant.get(key) ?? [];
            list.push(...codes);
            byQuadrant.set(key, list);
        }
        return byQuadrant;
    }
    return new Map();
}

function getQuadrant(tooth: string): string | null {
    const num = parseInt(tooth, 10);
    if (Number.isNaN(num)) return null;
    const leading = Math.floor(num / 10);
    if (leading >= 1 && leading <= 4) return String(leading);
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

function determineVerdict(
    conflicts: CombinabilityConflict[],
    droppedCount: number = 0
): CombinabilityVerdict {
    if (conflicts.some(c => c.severity === 'regress')) {
        return 'BLOCK';
    }
    if (conflicts.some(c => c.severity === 'warnung') || droppedCount > 0) {
        return 'WARN';
    }
    return 'PASS';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

function buildTraceLine(
    verdict: CombinabilityVerdict,
    conflicts: CombinabilityConflict[],
    blockedCodes: Set<string>,
    droppedCodes: Set<string>
): string {
    const parts = [`verdict=${verdict}`, `conflicts=${conflicts.length}`];

    if (blockedCodes.size > 0) {
        parts.push(`blocked=${blockedCodes.size}`);
        parts.push(`blockedCodes=${Array.from(blockedCodes).join(',')}`);
    }

    if (droppedCodes.size > 0) {
        parts.push(`dropped=${droppedCodes.size}`);
        parts.push(`droppedCodes=${Array.from(droppedCodes).join(',')}`);
    }

    if (conflicts.length > 0) {
        const ruleIds = [...new Set(conflicts.map(c => c.ruleId))];
        parts.push(`rules=${ruleIds.join(',')}`);
    }

    return parts.join(';');
}
