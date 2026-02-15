/**
 * Surface Billing Resolver
 *
 * Resolves F-codes (BEMA_13/GOZ_2060) from surface_mapping in treatment KB.
 * Used when a chip has billingRef:null with hinweis containing "surface_mapping".
 *
 * SSOT: All billing codes come from KB, no hardcoded values.
 * NO SILENT DEFAULTS: Missing surfaces returns null with reason, never guesses.
 * MKV TWO-CHANNEL: Returns base + addon codes for Mischkasse.
 * CHANNELIZATION: Uses BillingIntent to prevent forbidden lookups.
 */

import type { BillingIntent } from '../types';

export interface SurfaceMapping {
    [surfaceCount: string]: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
        /** MKV addon code (GOZ) for Mehrkosten */
        MKV_addon?: string;
    };
}

export interface SurfaceBillingContext {
    surfaces?: string[];
    surfaceCount?: number;
}

export interface SurfaceBillingResult {
    /** Base billing code (BEMA for GKV/MKV, GOZ for PKV) */
    billingCode: string | null;
    /** Addon billing code for MKV when Mehrkosten confirmed (GOZ) */
    addonCode?: string | null;
    surfaceCount: number;
    mappingKey: string;
    source: 'surface_mapping';
    /** Reason when billingCode is null */
    reason?: 'surfaces_missing' | 'surfaces_zero' | 'mapping_not_found' | 'insurance_not_found';
}

/**
 * Resolve billing code from surface_mapping based on surface count.
 *
 * NO SILENT DEFAULTS: If surfaces are missing/empty/zero, returns null with reason.
 * MKV TWO-CHANNEL: Returns base (BEMA) + addon (GOZ) codes for Mischkasse.
 * CHANNELIZATION: Uses BillingIntent to control allowed lookups.
 *
 * @param surfaceMapping - The surface_mapping object from unified.json
 * @param context - Context with surfaces array or surfaceCount
 * @param billingIntent - Controls which catalog lookups are allowed
 * @returns Resolved billing codes or null with reason
 */
export function resolveSurfaceBilling(
    surfaceMapping: SurfaceMapping | undefined,
    context: SurfaceBillingContext | undefined,
    billingIntent: BillingIntent | 'GKV' | 'PKV' | 'MKV'  // Backward compat
): SurfaceBillingResult | null {
    if (!surfaceMapping) {
        return null;
    }

    // Determine surface count from context
    let surfaceCount: number;
    if (context?.surfaceCount !== undefined) {
        surfaceCount = context.surfaceCount;
    } else if (context?.surfaces && Array.isArray(context.surfaces)) {
        surfaceCount = context.surfaces.length;
    } else {
        // NO SILENT DEFAULT: Return null with reason when surfaces missing
        return {
            billingCode: null,
            addonCode: null,
            surfaceCount: 0,
            mappingKey: 'unknown',
            source: 'surface_mapping',
            reason: 'surfaces_missing',
        };
    }

    // surfaceCount=0 is medically invalid for Füllung - return error
    if (surfaceCount === 0) {
        return {
            billingCode: null,
            addonCode: null,
            surfaceCount: 0,
            mappingKey: 'unknown',
            source: 'surface_mapping',
            reason: 'surfaces_zero',
        };
    }

    // Determine mapping key (clamp >4 to "4+")
    let mappingKey: string;
    if (surfaceCount >= 4) {
        mappingKey = '4+';
    } else {
        mappingKey = String(surfaceCount);
    }

    // Get mapping for surface count
    const mapping = surfaceMapping[mappingKey] ?? (mappingKey === '4+' ? surfaceMapping['4'] : undefined);
    if (!mapping) {
        return {
            billingCode: null,
            addonCode: null,
            surfaceCount,
            mappingKey,
            source: 'surface_mapping',
            reason: 'mapping_not_found',
        };
    }

    // Normalize billingIntent (backward compat: string → BillingIntent, undefined → GKV default)
    const intent: BillingIntent = typeof billingIntent === 'string'
        ? { mode: billingIntent, allowBema: billingIntent !== 'PKV', allowGoz: billingIntent === 'PKV', allowGozAddon: billingIntent === 'MKV' }
        : billingIntent ?? { mode: 'GKV', allowBema: true, allowGoz: false, allowGozAddon: false };

    // Resolve base code based on channelization
    let billingCode: string | null = null;

    if (intent.allowBema && (intent.mode === 'GKV' || intent.mode === 'MKV')) {
        // BEMA lookup (GKV or MKV base)
        billingCode = intent.mode === 'MKV'
            ? (mapping.MKV ?? mapping.GKV ?? null)
            : (mapping.GKV ?? null);
    } else if (intent.allowGoz && intent.mode === 'PKV') {
        // GOZ lookup (PKV only)
        billingCode = mapping.PKV ?? null;
    }

    if (billingCode === null) {
        return {
            billingCode: null,
            addonCode: null,
            surfaceCount,
            mappingKey,
            source: 'surface_mapping',
            reason: 'insurance_not_found',
        };
    }

    // Resolve addon code (only for MKV when allowGozAddon)
    let addonCode: string | null = null;
    if (intent.allowGozAddon && intent.mode === 'MKV') {
        addonCode = mapping.MKV_addon ?? null;
    }

    return {
        billingCode,
        addonCode,
        surfaceCount,
        mappingKey,
        source: 'surface_mapping',
    };
}

/**
 * Check if a chip should use surface_mapping for billing.
 *
 * A chip uses surface_mapping if:
 * - billingRef is null
 * - hinweis contains "surface_mapping"
 *
 * @param chip - The chip object from unified.json
 * @returns true if chip should use surface_mapping
 */
export function chipUsesSurfaceMapping(chip: {
    billingRef?: unknown;
    hinweis?: string;
}): boolean {
    return (
        chip.billingRef === null &&
        typeof chip.hinweis === 'string' &&
        chip.hinweis.toLowerCase().includes('surface_mapping')
    );
}
