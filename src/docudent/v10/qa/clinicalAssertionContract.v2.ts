/**
 * M34: Clinical Assertion Contract V2
 * 
 * Per-instance contract assertions for multi-treatment dictations.
 * Supports askback, chip, and billing invariants scoped to treatment instances.
 */

import type { V10PipelineOutput } from '../types';
import { parseScopedDictation, attributeStatement } from './segmentScoping';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Instance key: treatment type or treatment:tooth combo */
export type InstanceKey = 'endo' | 'fuellung' | `endo:${string}` | `fuellung:${string}`;

/** Askback expectations */
export interface AskbackExpectations {
    mustHave?: string[];
    mustNotHave?: string[];
}

/** Chip expectations */
export interface ChipExpectations {
    mustHave?: string[];
    mustNotHave?: string[];
}

/** Billing invariants */
export interface BillingExpectations {
    mustIncludeCodes?: string[];
    mustNotIncludeCodes?: string[];
    mustBeExplainableByChips?: boolean;
}

/** Per-instance expectations */
export interface InstanceExpectations {
    askbacks?: AskbackExpectations;
    chips?: ChipExpectations;
    billing?: BillingExpectations;
    textMustContain?: string[];
    textMustNotContain?: string[];
}

/** Global expectations (across all instances) */
export interface GlobalExpectations {
    askbacks?: AskbackExpectations;
    billing?: BillingExpectations;
}

/** V2 Contract with per-instance support */
export interface ClinicalContractV2 {
    expectedState: 'output' | 'questions' | 'error';
    global?: GlobalExpectations;
    byInstance?: Partial<Record<InstanceKey, InstanceExpectations>>;
}

/** V5 Truthcase with V2 contract */
export interface ClinicalTruthcaseV5 {
    id: string;
    dictation: string;
    treatmentId?: string | 'multi'; // Primary for single-treatment, 'multi' for combined
    insuranceType?: 'GKV' | 'PKV' | 'MKV';
    answers?: Record<string, unknown>;
    settings?: {
        practice?: Record<string, unknown>;
        user?: Record<string, unknown>;
    };
    overrides?: Record<string, Record<string, { mode: 'auto' | 'on' | 'off'; value?: unknown }>>;
    contractV2: ClinicalContractV2;
    description?: string;
    category?: string;
}

// ═══════════════════════════════════════════════════════════════
// EVALUATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface ContractViolationV2 {
    type: 'state' | 'askback' | 'chip' | 'billing' | 'text';
    instance?: InstanceKey | 'global';
    message: string;
    expected?: string;
    actual?: string;
}

export interface ContractResultV2 {
    passed: boolean;
    violations: ContractViolationV2[];
    instanceMapping?: Record<string, InstanceKey>;
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect instances from result trace.
 */
export function detectInstances(result: V10PipelineOutput): InstanceKey[] {
    const instances: InstanceKey[] = [];

    // Check trace for instances
    if (result.trace?.instances) {
        for (const inst of result.trace.instances) {
            const treatment = inst.treatmentId as 'endo' | 'fuellung';
            const tooth = inst.tooth;
            if (treatment && tooth) {
                instances.push(`${treatment}:${tooth}` as InstanceKey);
            } else if (treatment) {
                instances.push(treatment);
            }
        }
    }

    // Fallback: detect from dictation
    if (instances.length === 0 && result.input?.dictation) {
        const scoped = parseScopedDictation(result.input.dictation);
        for (const t of scoped.detectedTreatments) {
            if (t !== 'unknown') {
                instances.push(t as InstanceKey);
            }
        }
    }

    return instances.length > 0 ? instances : ['fuellung']; // Default
}

/**
 * Get chips for a specific instance.
 */
export function getChipsForInstance(
    result: V10PipelineOutput,
    instanceKey: InstanceKey
): string[] {
    const treatment = instanceKey.split(':')[0] as 'endo' | 'fuellung';
    const tooth = instanceKey.includes(':') ? instanceKey.split(':')[1] : null;

    if (result.trace?.instances) {
        for (const inst of result.trace.instances) {
            if (inst.treatmentId === treatment) {
                if (!tooth || inst.tooth === tooth) {
                    return inst.chips || [];
                }
            }
        }
    }

    // Fallback: return all chips
    return result.trace?.allChips || [];
}

/**
 * Get billing codes for a specific instance.
 */
export function getBillingForInstance(
    result: V10PipelineOutput,
    instanceKey: InstanceKey
): string[] {
    // For now, billing is session-level
    // Per-instance billing would require trace changes
    return result.output?.billingCodes || [];
}

/**
 * Get askbacks attributed to an instance.
 */
export function getAskbacksForInstance(
    result: V10PipelineOutput,
    instanceKey: InstanceKey,
    dictation: string
): string[] {
    const allAskbacks = result.questions?.map(q => q.id) || [];
    const scoped = parseScopedDictation(dictation);
    const treatment = instanceKey.split(':')[0] as 'endo' | 'fuellung';

    // Filter askbacks that relate to this instance
    // Simple heuristic: askbacks with treatment prefix
    return allAskbacks.filter(id => {
        // If askback has treatment in name
        if (id.includes('endo') && treatment === 'endo') return true;
        if (id.includes('fuellung') && treatment === 'fuellung') return true;
        if (id.includes('füllung') && treatment === 'fuellung') return true;

        // Medical askbacks: attribute based on dictation context
        if (id.startsWith('medical_')) {
            // Check if the triggering statement is in this instance's scope
            const attr = attributeStatement(id, scoped);
            return attr.scope === treatment || attr.scope === 'ambiguous';
        }

        return true; // Default: global askback
    });
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate V2 contract against result.
 */
export function evaluateContractV2(
    result: V10PipelineOutput,
    contract: ClinicalContractV2,
    dictation?: string
): ContractResultV2 {
    const violations: ContractViolationV2[] = [];
    const dict = dictation || result.input?.dictation || '';

    // 1. State check
    if (result.state !== contract.expectedState) {
        violations.push({
            type: 'state',
            instance: 'global',
            message: `Expected state '${contract.expectedState}', got '${result.state}'`,
            expected: contract.expectedState,
            actual: result.state,
        });
    }

    // 2. Global expectations
    if (contract.global) {
        const globalViolations = evaluateGlobal(result, contract.global);
        violations.push(...globalViolations);
    }

    // 3. Per-instance expectations
    if (contract.byInstance) {
        for (const [instanceKey, expectations] of Object.entries(contract.byInstance)) {
            const instViolations = evaluateInstance(
                result,
                instanceKey as InstanceKey,
                expectations,
                dict
            );
            violations.push(...instViolations);
        }
    }

    return {
        passed: violations.length === 0,
        violations,
    };
}

function evaluateGlobal(
    result: V10PipelineOutput,
    global: GlobalExpectations
): ContractViolationV2[] {
    const violations: ContractViolationV2[] = [];

    // Askbacks
    if (global.askbacks) {
        const actualAskbacks = result.questions?.map(q => q.id) || [];

        for (const id of global.askbacks.mustHave || []) {
            if (!actualAskbacks.includes(id)) {
                violations.push({
                    type: 'askback',
                    instance: 'global',
                    message: `Missing required askback: ${id}`,
                    expected: id,
                });
            }
        }

        for (const id of global.askbacks.mustNotHave || []) {
            if (actualAskbacks.includes(id)) {
                violations.push({
                    type: 'askback',
                    instance: 'global',
                    message: `Forbidden askback present: ${id}`,
                    actual: id,
                });
            }
        }
    }

    // Billing
    if (global.billing) {
        const actualCodes = result.output?.billingCodes || [];

        for (const code of global.billing.mustIncludeCodes || []) {
            if (!actualCodes.includes(code)) {
                violations.push({
                    type: 'billing',
                    instance: 'global',
                    message: `Missing required billing code: ${code}`,
                    expected: code,
                });
            }
        }

        for (const code of global.billing.mustNotIncludeCodes || []) {
            if (actualCodes.includes(code)) {
                violations.push({
                    type: 'billing',
                    instance: 'global',
                    message: `Forbidden billing code present: ${code}`,
                    actual: code,
                });
            }
        }
    }

    return violations;
}

function evaluateInstance(
    result: V10PipelineOutput,
    instanceKey: InstanceKey,
    expectations: InstanceExpectations,
    dictation: string
): ContractViolationV2[] {
    const violations: ContractViolationV2[] = [];

    // Chips
    if (expectations.chips) {
        const actualChips = getChipsForInstance(result, instanceKey);

        for (const chip of expectations.chips.mustHave || []) {
            if (!actualChips.includes(chip)) {
                violations.push({
                    type: 'chip',
                    instance: instanceKey,
                    message: `Missing required chip: ${chip}`,
                    expected: chip,
                });
            }
        }

        for (const chip of expectations.chips.mustNotHave || []) {
            if (actualChips.includes(chip)) {
                violations.push({
                    type: 'chip',
                    instance: instanceKey,
                    message: `Forbidden chip present: ${chip}`,
                    actual: chip,
                });
            }
        }
    }

    // Billing (per-instance)
    if (expectations.billing) {
        const actualCodes = getBillingForInstance(result, instanceKey);

        for (const code of expectations.billing.mustNotIncludeCodes || []) {
            if (actualCodes.includes(code)) {
                violations.push({
                    type: 'billing',
                    instance: instanceKey,
                    message: `Forbidden billing code for instance: ${code}`,
                    actual: code,
                });
            }
        }
    }

    // Text
    if (expectations.textMustContain && result.state === 'output') {
        const text = result.output?.fullText?.toLowerCase() || '';

        for (const phrase of expectations.textMustContain) {
            if (!text.includes(phrase.toLowerCase())) {
                violations.push({
                    type: 'text',
                    instance: instanceKey,
                    message: `Missing required text: "${phrase}"`,
                    expected: phrase,
                });
            }
        }
    }

    if (expectations.textMustNotContain && result.state === 'output') {
        const text = result.output?.fullText?.toLowerCase() || '';

        for (const phrase of expectations.textMustNotContain) {
            if (text.includes(phrase.toLowerCase())) {
                violations.push({
                    type: 'text',
                    instance: instanceKey,
                    message: `Forbidden text present: "${phrase}"`,
                    actual: phrase,
                });
            }
        }
    }

    return violations;
}

/**
 * Format V2 violations as readable output.
 */
export function formatViolationsV2(violations: ContractViolationV2[]): string {
    if (violations.length === 0) return '✅ All checks passed';

    return violations.map(v => {
        let line = `❌ [${v.type.toUpperCase()}]`;
        if (v.instance) line += ` [${v.instance}]`;
        line += ` ${v.message}`;
        if (v.expected) line += ` (expected: ${v.expected})`;
        if (v.actual) line += ` (actual: ${v.actual})`;
        return line;
    }).join('\n');
}
