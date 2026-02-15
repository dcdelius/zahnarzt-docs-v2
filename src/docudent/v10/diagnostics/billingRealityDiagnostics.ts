/**
 * Billing Reality Diagnostics — GIGAPROMPT 9
 *
 * Provides diagnostic warnings when billing expectations don't match reality.
 * Used in DEV mode to catch issues before they become silent regressions.
 *
 * Checks:
 * - MKV selected but no GOZ addon when justification signals exist
 * - LA chip present but no LA billing
 * - Cp chip present but no Cp billing
 * - Channelization violations (GKV+GOZ, PKV+BEMA)
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BillingDiagnosticWarning {
    code: string;
    message: string;
    severity: 'warn' | 'error';
    details?: Record<string, unknown>;
}

export interface BillingDiagnosticsInput {
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    billingCodes: string[];
    chips: string[];
    facts: Record<string, unknown>;
}

export interface BillingDiagnosticsResult {
    warnings: BillingDiagnosticWarning[];
    ok: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if MKV justification signals are present in facts.
 * Signals include: Komposit material, adhesive technique, amount, Mehrschicht keyword
 */
function detectMkvJustificationSignals(facts: Record<string, unknown>): boolean {
    // Material-based signals
    const material = String(facts.materialMentioned ?? facts.material ?? '').toLowerCase();
    const hasKomposit = material === 'komposit' || material === 'composite';

    // Technique-based signals
    const hasAdhesive = facts.adhesiveTechnique === true || facts.adhesive === 'ja';
    const hasMehrschicht = facts.mehrschichtMentioned === true || facts.layering === 'ja';

    // Amount-based signals
    const mkvAmount = Number(facts.mkvAmount ?? 0);
    const hasAmount = mkvAmount > 0;

    // Keyword-based signals
    const mehrkostenMentioned = facts.mehrkostenMentioned === true;

    return hasKomposit || hasAdhesive || hasMehrschicht || hasAmount || mehrkostenMentioned;
}

/**
 * Detect if "nur Kasse" was explicitly mentioned.
 */
function detectNurKasse(facts: Record<string, unknown>): boolean {
    return facts.nurKasse === true;
}

// ═══════════════════════════════════════════════════════════════
// MAIN DIAGNOSTIC FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check billing reality and return diagnostic warnings.
 *
 * @param input - Billing diagnostics input
 * @returns Diagnostics result with warnings
 */
export function checkBillingRealityDiagnostics(
    input: BillingDiagnosticsInput
): BillingDiagnosticsResult {
    const { insuranceType, billingCodes, chips, facts } = input;
    const warnings: BillingDiagnosticWarning[] = [];

    const hasGoz = billingCodes.some(c => c.startsWith('GOZ_'));
    const hasBema = billingCodes.some(c => c.startsWith('BEMA_') || /^13[a-d]?$/.test(c));

    // ─── Channelization Checks ────────────────────────────────────

    // GKV should never have GOZ
    if (insuranceType === 'GKV' && hasGoz) {
        warnings.push({
            code: 'CHANNEL_VIOLATION_GKV_GOZ',
            message: 'GKV billing contains GOZ codes. GKV should only have BEMA.',
            severity: 'error',
            details: { gozCodes: billingCodes.filter(c => c.startsWith('GOZ_')) },
        });
    }

    // PKV should never have BEMA
    if (insuranceType === 'PKV' && hasBema) {
        warnings.push({
            code: 'CHANNEL_VIOLATION_PKV_BEMA',
            message: 'PKV billing contains BEMA codes. PKV should only have GOZ.',
            severity: 'error',
            details: { bemaCodes: billingCodes.filter(c => c.startsWith('BEMA_') || /^13[a-d]?$/.test(c)) },
        });
    }

    // ─── MKV-specific Checks ──────────────────────────────────────

    if (insuranceType === 'MKV') {
        const nurKasse = detectNurKasse(facts);
        const signalsPresent = detectMkvJustificationSignals(facts);

        // MKV + signals + no GOZ = potential missing addon
        if (signalsPresent && !nurKasse && !hasGoz) {
            warnings.push({
                code: 'MKV_MISSING_GOZ_ADDON',
                message: 'MKV with justification signals but no GOZ addon billing.',
                severity: 'warn',
                details: {
                    signalsDetected: {
                        komposit: String(facts.materialMentioned ?? facts.material ?? '').toLowerCase() === 'komposit',
                        adhesive: facts.adhesiveTechnique === true,
                        mehrschicht: facts.mehrschichtMentioned === true,
                        amount: Number(facts.mkvAmount ?? 0),
                    },
                },
            });
        }

        // MKV + nur Kasse + GOZ = violation
        if (nurKasse && hasGoz) {
            warnings.push({
                code: 'MKV_NURKASSE_HAS_GOZ',
                message: 'MKV with "nur Kasse" should not have GOZ codes.',
                severity: 'error',
                details: { gozCodes: billingCodes.filter(c => c.startsWith('GOZ_')) },
            });
        }
    }

    // ─── Chip→Billing Mapping Checks ──────────────────────────────

    // LA chip without LA billing (informational)
    // Detection: LA chips contain 'la_' or 'anesthesia' in chipId
    // LA billing uses: BEMA_40/41 or GOZ LA codes - detect via chip reference, not hardcoded numbers
    const hasLaChip = chips.some(c => c.includes('la_') || c.includes('anesthesia'));
    // Check LA billing by looking for codes that the LA chips produce via billingRef
    // Instead of hardcoding numbers, check if ANY billing code from an LA chip is present
    // LA billingRef in KB: GKV=BEMA_40/41, PKV=GOZ_0090/0100
    const hasLaBilling = billingCodes.some(c =>
        c.startsWith('BEMA_4') || // BEMA_40, BEMA_41, BEMA_41a etc.
        c.match(/^GOZ_00[89]/) || // GOZ_0090, GOZ_0080 etc.
        c.match(/^GOZ_01/) // GOZ_0100, GOZ_0110 etc.
    );
    if (hasLaChip && !hasLaBilling) {
        warnings.push({
            code: 'LA_CHIP_NO_BILLING',
            message: 'LA chip present but no LA billing code found.',
            severity: 'warn',
            details: { laChips: chips.filter(c => c.includes('la_') || c.includes('anesthesia')) },
        });
    }

    // Cp chip without Cp billing (informational)
    // Detection: Cp chips contain 'cp' or 'capping' in chipId
    // Cp billing uses: BEMA_25/26 or GOZ_2330/2340 - detect via prefix patterns
    const hasCpChip = chips.some(c => c.includes('cp') || c.includes('capping'));
    const hasCpBilling = billingCodes.some(c =>
        c.startsWith('BEMA_25') || c.startsWith('BEMA_26') || // BEMA Cp/P
        c.startsWith('GOZ_233') || c.startsWith('GOZ_234') // GOZ Cp/P range
    );
    if (hasCpChip && !hasCpBilling) {
        warnings.push({
            code: 'CP_CHIP_NO_BILLING',
            message: 'Cp/capping chip present but no Cp billing code found.',
            severity: 'warn',
            details: { cpChips: chips.filter(c => c.includes('cp') || c.includes('capping')) },
        });
    }

    return {
        warnings,
        ok: warnings.filter(w => w.severity === 'error').length === 0,
    };
}

// ═══════════════════════════════════════════════════════════════
// DEV HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format diagnostics result for console output.
 */
export function formatDiagnosticsForConsole(result: BillingDiagnosticsResult): string {
    if (result.warnings.length === 0) {
        return '✓ Billing Reality: All checks passed';
    }

    const lines = ['⚠ Billing Reality Diagnostics:'];
    for (const w of result.warnings) {
        const icon = w.severity === 'error' ? '❌' : '⚠️';
        lines.push(`  ${icon} [${w.code}] ${w.message}`);
    }
    return lines.join('\n');
}

/**
 * Export for Debug Drawer (DEV only).
 */
export function getBillingDiagnosticsForDebug(
    input: BillingDiagnosticsInput
): { warnings: BillingDiagnosticWarning[]; summary: string } {
    const result = checkBillingRealityDiagnostics(input);
    return {
        warnings: result.warnings,
        summary: formatDiagnosticsForConsole(result),
    };
}
