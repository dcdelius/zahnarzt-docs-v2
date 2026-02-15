/**
 * Billing Combinability Checker — P12.C
 *
 * Validates billing code combinations using SSOT rules from kombinationen.json.
 * Runs BEFORE compose release to catch forbidden/questionable combinations.
 *
 * INVARIANTS:
 * - Static ESM import of kombinationen.json (no runtime fs/require)
 * - Deterministic: same input → same output
 * - No PII in output
 */

import type {
    CombinabilityVerdict,
    CombinabilityConflict,
    CombinabilityResult
} from '../../../contracts/compose';

// Static ESM import of combinability rules (SSOT)
import kombinationen from '../knowledgeBase/regeln/kombinationen.json';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES FROM SSOT
// ═══════════════════════════════════════════════════════════════════════════════

interface KombinationRegel {
    id: string;
    typ: 'bedingung' | 'haeufigkeit' | 'ausschluss' | 'dokumentation';
    titel: string;
    beschreibung: string;
    betrifft: string[];
    regel: {
        operator: string;
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: 'regress' | 'warnung' | 'info';
    quelle?: {
        dokument?: string;
        url?: string;
        paragraph?: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map severity to verdict.
 */
function severityToVerdict(severity: string): CombinabilityVerdict {
    switch (severity) {
        case 'regress': return 'BLOCK';
        case 'warnung': return 'WARN';
        default: return 'PASS';
    }
}

/**
 * Check if a code matches a rule's betrifft list.
 */
function codeMatchesBetrifft(code: string, betrifft: string[]): boolean {
    return betrifft.some(pattern => {
        // Exact match
        if (code === pattern) return true;
        // Pattern match (e.g., GOZ_2060-2120 range - simplified for now)
        if (code.startsWith(pattern.replace(/_.+/, '_'))) return true;
        return false;
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check billing code combinability using SSOT rules.
 *
 * @param billingCodes - Array of canonical billing codes (e.g., ['BEMA_13a', 'GOZ_2197'])
 * @param treatmentId - Treatment type for context
 * @param insuranceType - GKV or PKV
 * @returns CombinabilityResult with verdict, conflicts, and required justifications
 */
export function checkCombinability(
    billingCodes: string[],
    treatmentId: string,
    insuranceType: 'GKV' | 'PKV'
): CombinabilityResult {
    const conflicts: CombinabilityConflict[] = [];
    const requiredJustifications: string[] = [];
    let worstSeverity: 'regress' | 'warnung' | 'info' = 'info';

    const rules = kombinationen as KombinationRegel[];

    for (const regel of rules) {
        // Check 'ausschluss' (exclusion) rules: codes that cannot be combined
        if (regel.typ === 'ausschluss') {
            const matchingCodes = billingCodes.filter(code =>
                codeMatchesBetrifft(code, regel.betrifft)
            );

            // If multiple codes from the same exclusion rule are present, conflict
            if (matchingCodes.length > 1) {
                // Generic handling: any pair of matching codes triggers the rule
                // Special case for GOZ_2197: check specific pair logic
                if (regel.id === 'regel_goz2197_nicht_neben_2060') {
                    const has2197 = matchingCodes.some(c => c.includes('2197'));
                    const has206x = matchingCodes.some(c =>
                        c.includes('2060') || c.includes('2080') ||
                        c.includes('2100') || c.includes('2120')
                    );

                    if (has2197 && has206x) {
                        conflicts.push({
                            codeA: matchingCodes.find(c => c.includes('2197')) || '',
                            codeB: matchingCodes.find(c => !c.includes('2197')) || '',
                            ruleId: regel.id,
                            reason: regel.beschreibung,
                            severity: regel.schweregrad
                        });

                        if (regel.schweregrad === 'regress') worstSeverity = 'regress';
                        else if (regel.schweregrad === 'warnung' && worstSeverity !== 'regress') {
                            worstSeverity = 'warnung';
                        }
                    }
                } else {
                    // Generic exclusion: any 2+ matching codes = conflict
                    conflicts.push({
                        codeA: matchingCodes[0],
                        codeB: matchingCodes[1],
                        ruleId: regel.id,
                        reason: regel.beschreibung,
                        severity: regel.schweregrad
                    });

                    if (regel.schweregrad === 'regress') worstSeverity = 'regress';
                    else if (regel.schweregrad === 'warnung' && worstSeverity !== 'regress') {
                        worstSeverity = 'warnung';
                    }
                }
            }
        }

        // Check 'haeufigkeit' (frequency) rules: duplicate detection
        if (regel.typ === 'haeufigkeit') {
            for (const code of billingCodes) {
                if (codeMatchesBetrifft(code, regel.betrifft)) {
                    const count = billingCodes.filter(c => c === code).length;
                    const maxAllowed = regel.regel.wert || 1;

                    if (count > maxAllowed && regel.regel.bezug !== 'pro_kanal') {
                        conflicts.push({
                            codeA: code,
                            codeB: code,
                            ruleId: regel.id,
                            reason: `${regel.titel}: ${count}x vorhanden, max ${maxAllowed} erlaubt`,
                            severity: regel.schweregrad
                        });

                        if (regel.schweregrad === 'regress') worstSeverity = 'regress';
                        else if (regel.schweregrad === 'warnung' && worstSeverity !== 'regress') {
                            worstSeverity = 'warnung';
                        }
                    }
                }
            }
        }

        // Check 'bedingung' (condition) rules that require documentation
        if (regel.typ === 'bedingung' && regel.schweregrad === 'regress') {
            for (const code of billingCodes) {
                if (codeMatchesBetrifft(code, regel.betrifft)) {
                    requiredJustifications.push(`${code}: ${regel.beschreibung}`);
                }
            }
        }
    }

    // Determine overall verdict
    let verdict: CombinabilityVerdict;
    if (worstSeverity === 'regress') {
        verdict = 'BLOCK';
    } else if (worstSeverity === 'warnung' || conflicts.length > 0) {
        verdict = 'WARN';
    } else {
        verdict = 'PASS';
    }

    return {
        verdict,
        conflicts,
        requiredJustifications
    };
}

/**
 * Get all rule IDs from kombinationen.json (for testing coverage).
 */
export function getAllRuleIds(): string[] {
    return (kombinationen as KombinationRegel[]).map(r => r.id);
}

/**
 * Get rules that affect specific codes (for debugging).
 */
export function getRulesForCodes(codes: string[]): KombinationRegel[] {
    return (kombinationen as KombinationRegel[]).filter(regel =>
        codes.some(code => codeMatchesBetrifft(code, regel.betrifft))
    );
}
