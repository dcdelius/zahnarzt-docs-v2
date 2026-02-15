/**
 * Billing Explain Report — GIGAPROMPT 2
 *
 * Generates a detailed explanation of how billing codes were resolved.
 * This is READ-ONLY — it does not generate codes, only explains the resolution.
 *
 * Used in:
 * - DEV: Debug Drawer meta.billingExplain
 * - Testing: Verify channelization logic
 */

import type { InsuranceType } from '../types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChipBillingResolution {
    chipId: string;
    chipCategory: string;
    availableBranches: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    };
    selectedBranch: 'GKV' | 'PKV' | 'MKV' | 'surface_mapping' | 'none';
    selectionReason: string;
    resolvedCode: string | null;
    suppressedReason?: string;
}

export interface BillingExplainReport {
    /** Timestamp of report generation */
    timestamp: string;

    /** Effective insurance type */
    insuranceType: InsuranceType;

    /** MKV-specific flags */
    mkvFlags: {
        mehrkostenConfirmed: boolean;
        nurKasse: boolean;
        mkvAmount?: number;
        mehrkostenMentioned: boolean;
    };

    /** Billing-relevant facts snapshot */
    factsSnapshot: {
        surfaces: string[];
        surfaceCount: number;
        materialMentioned?: string;
        adhesiveTechnique?: boolean;
    };

    /** Chips that were processed */
    emittedChips: Array<{
        chipId: string;
        category: string;
        sourceRuleId?: string;
    }>;

    /** Per-chip billing resolution */
    billingResolutions: ChipBillingResolution[];

    /** Final deduplicated billing codes */
    finalBillingCodes: string[];

    /** Summary statistics */
    stats: {
        totalChips: number;
        chipsWithBilling: number;
        chipsWithoutBilling: number;
        suppressedCount: number;
    };
}

// ═══════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════

export interface BillingExplainInput {
    insuranceType: InsuranceType;
    mehrkostenConfirmed: boolean;
    nurKasse: boolean;
    mkvAmount?: number;
    mehrkostenMentioned: boolean;
    surfaces: string[];
    materialMentioned?: string;
    adhesiveTechnique?: boolean;
    chips: Array<{
        id: string;
        category: string;
        billingRef: { GKV?: string; PKV?: string; MKV?: string } | null;
        sourceRuleId?: string;
    }>;
    resolvedCodes: Array<{
        chipId: string;
        code: string;
        branch: 'GKV' | 'PKV' | 'MKV' | 'surface_mapping';
    }>;
    finalBillingCodes: string[];
}

/**
 * Build a billing explain report from renderer output.
 *
 * This is READ-ONLY: it takes already-resolved codes and explains them.
 * It does NOT generate any codes itself.
 */
export function buildBillingExplainReport(input: BillingExplainInput): BillingExplainReport {
    const {
        insuranceType,
        mehrkostenConfirmed,
        nurKasse,
        mkvAmount,
        mehrkostenMentioned,
        surfaces,
        materialMentioned,
        adhesiveTechnique,
        chips,
        resolvedCodes,
        finalBillingCodes,
    } = input;

    // Build resolution lookup
    const codeByChip = new Map<string, { code: string; branch: string }>();
    for (const rc of resolvedCodes) {
        codeByChip.set(rc.chipId, { code: rc.code, branch: rc.branch });
    }

    // Build resolutions
    const billingResolutions: ChipBillingResolution[] = chips.map(chip => {
        const resolved = codeByChip.get(chip.id);
        const availableBranches = chip.billingRef ?? {};

        let selectedBranch: ChipBillingResolution['selectedBranch'] = 'none';
        let selectionReason = '';
        let suppressedReason: string | undefined;

        if (resolved) {
            selectedBranch = resolved.branch as ChipBillingResolution['selectedBranch'];

            // Explain why this branch was selected
            if (insuranceType === 'GKV') {
                selectionReason = 'GKV always uses GKV branch (BEMA)';
            } else if (insuranceType === 'PKV') {
                selectionReason = 'PKV always uses PKV branch (GOZ)';
            } else if (insuranceType === 'MKV') {
                if (resolved.branch === 'MKV') {
                    selectionReason = `MKV branch selected (mehrkostenConfirmed=${mehrkostenConfirmed})`;
                } else if (resolved.branch === 'GKV') {
                    selectionReason = 'MKV uses GKV branch for base services';
                } else if (resolved.branch === 'surface_mapping') {
                    selectionReason = `Surface mapping (${surfaces.length} surfaces)`;
                }
            }
        } else {
            // Chip produced no billing code - explain why
            if (chip.billingRef === null) {
                suppressedReason = 'billingRef is null (text-only or surface_mapping chip)';
            } else if (insuranceType === 'MKV' && !mehrkostenConfirmed && chip.billingRef.MKV && !chip.billingRef.GKV) {
                suppressedReason = 'MKV addon suppressed: mehrkostenConfirmed=false';
            } else if (nurKasse && chip.billingRef.MKV) {
                suppressedReason = 'nurKasse=true suppresses all GOZ codes';
            } else {
                suppressedReason = 'No applicable branch for insurance type';
            }
        }

        return {
            chipId: chip.id,
            chipCategory: chip.category,
            availableBranches,
            selectedBranch,
            selectionReason,
            resolvedCode: resolved?.code ?? null,
            suppressedReason,
        };
    });

    // Calculate stats
    const chipsWithBilling = billingResolutions.filter(r => r.resolvedCode !== null).length;
    const suppressedCount = billingResolutions.filter(r => r.suppressedReason !== undefined).length;

    return {
        timestamp: new Date().toISOString(),
        insuranceType,
        mkvFlags: {
            mehrkostenConfirmed,
            nurKasse,
            mkvAmount,
            mehrkostenMentioned,
        },
        factsSnapshot: {
            surfaces,
            surfaceCount: surfaces.length,
            materialMentioned,
            adhesiveTechnique,
        },
        emittedChips: chips.map(c => ({
            chipId: c.id,
            category: c.category,
            sourceRuleId: c.sourceRuleId,
        })),
        billingResolutions,
        finalBillingCodes,
        stats: {
            totalChips: chips.length,
            chipsWithBilling,
            chipsWithoutBilling: chips.length - chipsWithBilling,
            suppressedCount,
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════

/**
 * Format explain report for console/debug output.
 */
export function formatBillingExplainReport(report: BillingExplainReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════');
    lines.push('BILLING EXPLAIN REPORT');
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`Insurance: ${report.insuranceType}`);
    lines.push(`MKV Flags: confirmed=${report.mkvFlags.mehrkostenConfirmed}, nurKasse=${report.mkvFlags.nurKasse}`);
    lines.push(`Surfaces: ${report.factsSnapshot.surfaces.join('')} (${report.factsSnapshot.surfaceCount})`);
    lines.push('');
    lines.push('─── CHIP RESOLUTIONS ───────────────────────────────────');

    for (const res of report.billingResolutions) {
        const status = res.resolvedCode ? '✓' : '✗';
        const code = res.resolvedCode ?? '(none)';
        const reason = res.suppressedReason ?? res.selectionReason;
        lines.push(`${status} ${res.chipId.padEnd(25)} → ${code.padEnd(12)} [${reason}]`);
    }

    lines.push('');
    lines.push('─── FINAL CODES ────────────────────────────────────────');
    lines.push(report.finalBillingCodes.join(', ') || '(none)');
    lines.push('');
    lines.push(`Stats: ${report.stats.chipsWithBilling}/${report.stats.totalChips} chips with billing, ${report.stats.suppressedCount} suppressed`);
    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
}
