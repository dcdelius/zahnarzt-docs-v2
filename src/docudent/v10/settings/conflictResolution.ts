/**
 * M37: Settings Conflict Resolution
 * 
 * Resolves fact values when dictation conflicts with settings.
 * Negation always wins over defaults.
 */

import type { SettingsInput } from './settingsTypes';
import type { TreatmentType } from '../qa/segmentScoping';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type FactSource = 'dictation' | 'settings' | 'user_edit' | 'default' | 'inferred';

export interface ResolvedFact<T = unknown> {
    value: T;
    source: FactSource;
    reason: ResolveReason;
    overridden?: {
        value: T;
        source: FactSource;
    };
}

export type ResolveReason =
    | 'from_dictation'
    | 'filled_from_settings'
    | 'negation_overrides_default'
    | 'user_override'
    | 'default_fallback'
    | 'ambiguous_needs_askback';

export interface FactInput<T = unknown> {
    dictationValue?: T;
    dictationNegated?: boolean;
    settingsValue?: T;
    userEditValue?: T;
    defaultValue: T;
    segmentScope?: TreatmentType;
}

export interface AskbackProvenance {
    id: string;
    whyAsked?: string;
    whySkipped?: string;
    sourceRefs?: string[];
    scope?: TreatmentType;
}

export interface SettingsApplyTrace {
    instanceId: string;
    filled: number;
    overridden: number;
    conflicts: number;
}

// ═══════════════════════════════════════════════════════════════
// CONFLICT RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a fact value with conflict handling.
 * 
 * Priority:
 * 1. dictation negation ("ohne/kein") → always wins
 * 2. dictation explicit value → wins over settings
 * 3. user edit → wins over settings
 * 4. settings value → fills ambiguous
 * 5. default → fallback
 */
export function resolveFactValue<T>(input: FactInput<T>): ResolvedFact<T> {
    const {
        dictationValue,
        dictationNegated,
        settingsValue,
        userEditValue,
        defaultValue
    } = input;

    // Rule 1: Dictation negation always wins
    if (dictationNegated === true) {
        return {
            value: defaultValue, // Negation means "don't do this"
            source: 'dictation',
            reason: 'negation_overrides_default',
            overridden: settingsValue !== undefined ? {
                value: settingsValue,
                source: 'settings',
            } : undefined,
        };
    }

    // Rule 2: Explicit dictation value wins
    if (dictationValue !== undefined) {
        return {
            value: dictationValue,
            source: 'dictation',
            reason: 'from_dictation',
            overridden: settingsValue !== undefined && settingsValue !== dictationValue ? {
                value: settingsValue,
                source: 'settings',
            } : undefined,
        };
    }

    // Rule 3: User edit wins over settings
    if (userEditValue !== undefined) {
        return {
            value: userEditValue,
            source: 'user_edit',
            reason: 'user_override',
            overridden: settingsValue !== undefined && settingsValue !== userEditValue ? {
                value: settingsValue,
                source: 'settings',
            } : undefined,
        };
    }

    // Rule 4: Settings fill ambiguous
    if (settingsValue !== undefined) {
        return {
            value: settingsValue,
            source: 'settings',
            reason: 'filled_from_settings',
        };
    }

    // Rule 5: Default fallback
    return {
        value: defaultValue,
        source: 'default',
        reason: 'default_fallback',
    };
}

// ═══════════════════════════════════════════════════════════════
// ASKBACK DECISION
// ═══════════════════════════════════════════════════════════════

export interface AskbackDecision {
    shouldAsk: boolean;
    provenance: AskbackProvenance;
}

/**
 * Decide whether to ask a question based on dictation and settings.
 */
export function decideAskback(
    askbackId: string,
    input: {
        dictationHasValue: boolean;
        dictationNegated: boolean;
        settingsValue: unknown | undefined;
        isCritical?: boolean;
        scope?: TreatmentType;
    }
): AskbackDecision {
    const { dictationHasValue, dictationNegated, settingsValue, isCritical, scope } = input;

    // Rule: Dictation provides explicit value → no askback
    if (dictationHasValue || dictationNegated) {
        return {
            shouldAsk: false,
            provenance: {
                id: askbackId,
                whySkipped: dictationNegated
                    ? 'Negation in dictation ("ohne/kein")'
                    : 'Explicit value in dictation',
                sourceRefs: ['dictation'],
                scope,
            },
        };
    }

    // Rule: Critical askbacks cannot be skipped by settings
    if (isCritical) {
        return {
            shouldAsk: true,
            provenance: {
                id: askbackId,
                whyAsked: 'Critical question cannot be auto-filled',
                scope,
            },
        };
    }

    // Rule: Settings provide value → no askback
    if (settingsValue !== undefined) {
        return {
            shouldAsk: false,
            provenance: {
                id: askbackId,
                whySkipped: `Filled from settings: ${String(settingsValue)}`,
                sourceRefs: ['settings'],
                scope,
            },
        };
    }

    // Rule: No value → askback
    return {
        shouldAsk: true,
        provenance: {
            id: askbackId,
            whyAsked: 'No value in dictation or settings',
            scope,
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// CRITICAL ASKBACKS (cannot be skipped)
// ═══════════════════════════════════════════════════════════════

const CRITICAL_ASKBACKS = new Set([
    'endo_canal_count', // Must know canal count
    'endo_tooth',       // Must know which tooth
    'fuellung_tooth',   // Must know which tooth
    'fuellung_surface', // Must know surface
]);

export function isCriticalAskback(askbackId: string): boolean {
    return CRITICAL_ASKBACKS.has(askbackId);
}

// ═══════════════════════════════════════════════════════════════
// TRACE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate settings apply trace line.
 */
export function generateSettingsApplyTrace(
    instanceId: string,
    resolved: ResolvedFact[]
): SettingsApplyTrace {
    const filled = resolved.filter(r => r.source === 'settings').length;
    const overridden = resolved.filter(r => r.overridden !== undefined).length;
    const conflicts = resolved.filter(r =>
        r.reason === 'negation_overrides_default' ||
        (r.overridden && r.source === 'dictation')
    ).length;

    return {
        instanceId,
        filled,
        overridden,
        conflicts,
    };
}

/**
 * Format trace line for logging.
 */
export function formatSettingsApplyTrace(trace: SettingsApplyTrace): string {
    return `settings_apply:instance=${trace.instanceId};filled=${trace.filled};overridden=${trace.overridden};conflicts=${trace.conflicts}`;
}
