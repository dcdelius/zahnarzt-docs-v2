/**
 * Mehrkosten Policy — Configurable Practice Pricing
 * 
 * Supports:
 * - Endo: per-canal pricing (e.g., 100€ * number of canals)
 * - Filling: fixed or percentage-based MKV pricing
 * - Optional add-ons: microscope, NiTi, irrigation protocol
 * 
 * This is the SSOT for practice-specific Mehrkosten calculation.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Add-on pricing configuration */
export interface AddOnPricing {
    enabled: boolean;
    amount: number;
    label: string;
}

/** Endo-specific pricing */
export interface EndoPricing {
    perCanalAmount: number;
    addOns: {
        microscope: AddOnPricing;
        niti: AddOnPricing;
        irrigationProtocol: AddOnPricing;
    };
}

/** Filling-specific pricing */
export interface FillingPricing {
    mode: 'fixed' | 'percentage';
    fixedAmount: number;
    percentageOfGOZ: number;
}

/** Complete Mehrkosten policy */
export interface MehrkostenPolicy {
    version: string;
    endo: EndoPricing;
    filling: FillingPricing;
    currency: {
        symbol: string;
        decimals: number;
        locale: string;
    };
    disclosures: {
        endoText: string;
        mkvText: string;
    };
}

/** Context for Mehrkosten calculation */
export interface MehrkostenContext {
    treatmentType: 'endo' | 'filling' | 'other';
    endo?: {
        canals?: number;
    };
    filling?: {
        gozBaseAmount?: number;
    };
    flags?: {
        microscope?: boolean;
        niti?: boolean;
        irrigationProtocol?: boolean;
    };
}

/** Result of Mehrkosten calculation */
export interface MehrkostenResult {
    items: Array<{
        label: string;
        amount: number;
        code?: string;
    }>;
    total: number;
    formattedTotal: string;
    disclosureText: string;
    labelMode: 'mkv' | 'zusatzleistung';
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT POLICY
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the default Mehrkosten policy for a typical German dental practice.
 */
export function getDefaultMehrkostenPolicy(): MehrkostenPolicy {
    return {
        version: '2025-01',
        endo: {
            perCanalAmount: 100.00,
            addOns: {
                microscope: {
                    enabled: true,
                    amount: 50.00,
                    label: 'OP-Mikroskop'
                },
                niti: {
                    enabled: true,
                    amount: 30.00,
                    label: 'NiTi-Aufbereitung'
                },
                irrigationProtocol: {
                    enabled: true,
                    amount: 20.00,
                    label: 'Erweitertes Spülprotokoll'
                }
            }
        },
        filling: {
            mode: 'fixed',
            fixedAmount: 68.00,
            percentageOfGOZ: 100.0
        },
        currency: {
            symbol: '€',
            decimals: 2,
            locale: 'de-DE'
        },
        disclosures: {
            endoText: 'Private Zusatzleistungen gemäß Vereinbarung.',
            mkvText: 'Mehrkostenvereinbarung vor Behandlung vereinbart.'
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculates Mehrkosten based on context and policy.
 * 
 * @param context - Treatment context (type, canals, flags)
 * @param policy - Pricing policy (defaults to getDefaultMehrkostenPolicy())
 * @returns MehrkostenResult with items, total, and disclosure
 */
export function calculateMehrkosten(
    context: MehrkostenContext,
    policy: MehrkostenPolicy = getDefaultMehrkostenPolicy()
): MehrkostenResult {
    const items: MehrkostenResult['items'] = [];
    let total = 0;

    if (context.treatmentType === 'endo') {
        // Per-canal pricing
        const canals = context.endo?.canals ?? 1;
        const canalTotal = canals * policy.endo.perCanalAmount;
        items.push({
            label: `Wurzelkanalbehandlung (${canals} ${canals === 1 ? 'Kanal' : 'Kanäle'})`,
            amount: canalTotal,
            code: 'ENDO_PERCANAL'
        });
        total += canalTotal;

        // Add-ons
        const flags = context.flags ?? {};

        if (flags.microscope && policy.endo.addOns.microscope.enabled) {
            const addon = policy.endo.addOns.microscope;
            items.push({
                label: addon.label,
                amount: addon.amount,
                code: 'ADDON_MICROSCOPE'
            });
            total += addon.amount;
        }

        if (flags.niti && policy.endo.addOns.niti.enabled) {
            const addon = policy.endo.addOns.niti;
            items.push({
                label: addon.label,
                amount: addon.amount,
                code: 'ADDON_NITI'
            });
            total += addon.amount;
        }

        if (flags.irrigationProtocol && policy.endo.addOns.irrigationProtocol.enabled) {
            const addon = policy.endo.addOns.irrigationProtocol;
            items.push({
                label: addon.label,
                amount: addon.amount,
                code: 'ADDON_IRRIGATION'
            });
            total += addon.amount;
        }

        return {
            items,
            total,
            formattedTotal: formatCurrency(total, policy),
            disclosureText: policy.disclosures.endoText,
            labelMode: 'zusatzleistung'
        };
    }

    if (context.treatmentType === 'filling') {
        let amount: number;

        if (policy.filling.mode === 'fixed') {
            amount = policy.filling.fixedAmount;
        } else {
            const gozBase = context.filling?.gozBaseAmount ?? 0;
            amount = gozBase * (policy.filling.percentageOfGOZ / 100);
        }

        items.push({
            label: 'Mehrschichttechnik / Adhäsivtechnik',
            amount,
            code: 'GOZ_2197'
        });
        total = amount;

        return {
            items,
            total,
            formattedTotal: formatCurrency(total, policy),
            disclosureText: policy.disclosures.mkvText,
            labelMode: 'mkv'
        };
    }

    // Other treatment types - empty result
    return {
        items: [],
        total: 0,
        formattedTotal: formatCurrency(0, policy),
        disclosureText: '',
        labelMode: 'zusatzleistung'
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Formats a currency amount according to policy.
 */
export function formatCurrency(amount: number, policy: MehrkostenPolicy): string {
    return amount.toLocaleString(policy.currency.locale, {
        minimumFractionDigits: policy.currency.decimals,
        maximumFractionDigits: policy.currency.decimals
    }) + policy.currency.symbol;
}

/**
 * Validates a Mehrkosten policy for consistency.
 */
export function validatePolicy(policy: MehrkostenPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (policy.endo.perCanalAmount < 0) {
        errors.push('Per-canal amount cannot be negative');
    }

    if (policy.filling.mode === 'percentage' &&
        (policy.filling.percentageOfGOZ < 0 || policy.filling.percentageOfGOZ > 1000)) {
        errors.push('Percentage must be between 0 and 1000');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    getDefaultMehrkostenPolicy,
    calculateMehrkosten,
    formatCurrency,
    validatePolicy
};
