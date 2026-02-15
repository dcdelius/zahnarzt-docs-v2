/**
 * Medical Engine v1 — KB-Driven Evaluation
 *
 * Evaluates medical rules from medical_kb.v1.json to:
 * - Apply defaults to facts
 * - Determine required/optional askbacks
 * - Emit chip IDs
 *
 * All medical decisions are traceable via sourceRefs.
 */

import {
    medicalKb,
    type Rule,
    type RuleCondition,
    type RuleAction,
    type DefaultSetting,
    type SourceRef,
    type Concept,
    type MedicalKB,
    getSourceRefsForRule,
} from '../index';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MedicalEvalInput {
    /** Facts object (from v7/medical or extracted mapping) */
    facts: Record<string, unknown>;
    /** Treatment ID (e.g., "fuellung", "endo") */
    treatmentId: string;
    /** Optional instance scope for multi-tooth cases */
    instanceScope?: { tooth?: string };
    /** Raw or normalized answers */
    answers?: Map<string, unknown>;
    /** Allow emit_chip actions (default: true). V10 uses false. */
    allowChipEmission?: boolean;
    /** Optional KB override (e.g. V10 no-emit KB) */
    kbOverride?: MedicalKB;
}

export interface MedicalEvalOutput {
    /** Facts after defaults applied */
    facts: Record<string, unknown>;
    /** Required askback IDs (scoped if instanceScope.tooth provided) */
    requiredAskbacks: string[];
    /** Optional askback IDs (scoped if instanceScope.tooth provided) */
    optionalAskbacks: string[];
    /** Emitted chip IDs */
    emittedChips: string[];
    /** Execution trace for debugging/auditing */
    trace: {
        appliedDefaults: string[];
        firedRules: string[];
        firedConcepts: string[];
        requiredAskbacks: Array<{ id: string; ruleId: string; sourceRefs: SourceRef[] }>;
        emittedChips: Array<{ id: string; ruleId: string; sourceRefs: SourceRef[] }>;
    };
}

// ═══════════════════════════════════════════════════════════════
// SCOPING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Add tooth scope to an askback ID
 * @example withToothScope('medical_ueberkappung', '16') → 'medical_ueberkappung::tooth:16'
 */
export function withToothScope(id: string, tooth: string): string {
    if (!tooth) return id;
    return `${id}::tooth:${tooth}`;
}

/**
 * Remove tooth scope from an askback ID
 * @example stripToothScope('medical_ueberkappung::tooth:16') → 'medical_ueberkappung'
 */
export function stripToothScope(id: string): string {
    const match = id.match(/^(.+?)::tooth:\d+$/);
    return match ? match[1] : id;
}

/**
 * Extract tooth number from a scoped ID
 * @example getToothFromScopedId('medical_ueberkappung::tooth:16') → '16'
 */
export function getToothFromScopedId(id: string): string | null {
    const match = id.match(/::tooth:(\d+)$/);
    return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════════
// CONDITION EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get a nested value from an object using dot notation
 * @example getNestedValue({ facts: { capping: { performed: 'yes' } } }, 'facts.capping.performed') → 'yes'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }

    return current;
}

/**
 * Evaluate a single condition against input
 */
function evaluateCondition(
    condition: RuleCondition,
    input: MedicalEvalInput
): boolean {
    // Build context object with facts at root
    const context = {
        ...input.facts,
        facts: input.facts,
        treatmentId: input.treatmentId,
    };

    const value = getNestedValue(context, condition.field);

    switch (condition.op) {
        case 'eq':
            return value === condition.value;

        case 'neq':
            return value !== condition.value;

        case 'in':
            if (!Array.isArray(condition.value)) return false;
            return (condition.value as unknown[]).includes(value);

        case 'gt':
            return typeof value === 'number' &&
                typeof condition.value === 'number' &&
                value > condition.value;

        case 'lt':
            return typeof value === 'number' &&
                typeof condition.value === 'number' &&
                value < condition.value;

        case 'exists':
            const exists = value !== undefined && value !== null && value !== 'unknown';
            return condition.value === true ? exists : !exists;

        case 'contains':
            // Check if array contains value
            if (!Array.isArray(value)) return false;
            return (value as unknown[]).includes(condition.value);

        case 'empty':
            // Check if array is empty or undefined
            if (!Array.isArray(value)) return condition.value === true;
            return condition.value === true ? value.length === 0 : value.length > 0;

        default:
            return false;
    }
}

/**
 * Evaluate all conditions for a rule (AND logic)
 */
function evaluateConditions(
    conditions: RuleCondition[],
    input: MedicalEvalInput
): boolean {
    return conditions.every(c => evaluateCondition(c, input));
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT APPLICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply defaults from KB to facts
 */
function applyDefaults(
    facts: Record<string, unknown>,
    defaults: DefaultSetting[],
    input: MedicalEvalInput
): { facts: Record<string, unknown>; applied: string[] } {
    const newFacts = JSON.parse(JSON.stringify(facts));
    const applied: string[] = [];

    for (const def of defaults) {
        // Check conditions
        if (!evaluateConditions(def.conditions, { ...input, facts: newFacts })) {
            continue;
        }

        // Strip 'facts.' prefix from field path since we're operating on facts directly
        const fieldPath = def.field.startsWith('facts.')
            ? def.field.slice(6)
            : def.field;

        // Check if field is missing/unknown
        const currentValue = getNestedValue(newFacts, fieldPath);
        if (currentValue !== undefined && currentValue !== null && currentValue !== 'unknown') {
            continue; // Already has a value
        }

        // Apply default
        setNestedValue(newFacts, fieldPath, def.value);
        applied.push(def.id);
    }

    return { facts: newFacts, applied };
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
}

// ═══════════════════════════════════════════════════════════════
// RULE EVALUATION
// ═══════════════════════════════════════════════════════════════

interface RuleResult {
    firedRules: string[];
    firedConcepts: string[];
    requiredAskbacks: Array<{ id: string; ruleId: string; sourceRefs: SourceRef[] }>;
    optionalAskbacks: Array<{ id: string; ruleId: string; sourceRefs: SourceRef[] }>;
    emittedChips: Array<{ id: string; ruleId: string; sourceRefs: SourceRef[] }>;
}

/**
 * Evaluate all active rules and collect actions
 */
function evaluateRules(
    rules: Rule[],
    input: MedicalEvalInput,
    facts: Record<string, unknown>
): RuleResult {
    const result: RuleResult = {
        firedRules: [],
        firedConcepts: [],
        requiredAskbacks: [],
        optionalAskbacks: [],
        emittedChips: [],
    };

    // Sort by priority (ascending - lower number = higher priority)
    const sortedRules = [...rules]
        .filter(r => r.active)
        .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    for (const rule of sortedRules) {
        // Evaluate conditions
        if (!evaluateConditions(rule.when, { ...input, facts })) {
            continue;
        }

        result.firedRules.push(rule.id);

        // Process actions
        for (const action of rule.then) {
            switch (action.type) {
                case 'require_askback':
                    result.requiredAskbacks.push({
                        id: action.target,
                        ruleId: rule.id,
                        sourceRefs: getSourceRefsForRule(rule.id),
                    });
                    break;

                case 'emit_chip':
                    result.emittedChips.push({
                        id: action.target,
                        ruleId: rule.id,
                        sourceRefs: getSourceRefsForRule(rule.id),
                    });
                    break;

                case 'set_default':
                    // Defaults are handled separately in applyDefaults
                    break;

                case 'add_warning':
                    // TODO: implement warnings if needed
                    break;
            }
        }
    }

    return result;
}

function collectConceptEffects(
    result: RuleResult,
    conceptId: string,
    sourceRefs: SourceRef[] | undefined,
    effects: { requiredAskbacks?: string[]; optionalAskbacks?: string[]; emitChips?: string[] }
) {
    if (effects.requiredAskbacks) {
        for (const id of effects.requiredAskbacks) {
            result.requiredAskbacks.push({
                id,
                ruleId: conceptId,
                sourceRefs: sourceRefs ?? [],
            });
        }
    }
    if (effects.optionalAskbacks) {
        for (const id of effects.optionalAskbacks) {
            result.optionalAskbacks.push({
                id,
                ruleId: conceptId,
                sourceRefs: sourceRefs ?? [],
            });
        }
    }
    if (effects.emitChips) {
        for (const id of effects.emitChips) {
            result.emittedChips.push({
                id,
                ruleId: conceptId,
                sourceRefs: sourceRefs ?? [],
            });
        }
    }
}

function evaluateConcepts(
    concepts: Concept[],
    input: MedicalEvalInput,
    facts: Record<string, unknown>
): RuleResult {
    const result: RuleResult = {
        firedRules: [],
        firedConcepts: [],
        requiredAskbacks: [],
        optionalAskbacks: [],
        emittedChips: [],
    };

    const sortedConcepts = [...concepts].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    for (const concept of sortedConcepts) {
        const conceptSource = concept.sourceRefs ?? [];
        if (concept.cases && concept.cases.length > 0) {
            const sortedCases = [...concept.cases].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
            for (const c of sortedCases) {
                if (!evaluateConditions(c.when, { ...input, facts })) {
                    continue;
                }
                const conceptCaseId = `concept:${concept.id}:${c.id}`;
                result.firedConcepts.push(conceptCaseId);
                collectConceptEffects(result, conceptCaseId, conceptSource, c.effects);
            }
            continue;
        }

        if (concept.when && concept.effects) {
            if (!evaluateConditions(concept.when, { ...input, facts })) {
                continue;
            }
            const conceptId = `concept:${concept.id}`;
            result.firedConcepts.push(conceptId);
            collectConceptEffects(result, conceptId, conceptSource, concept.effects);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply Medical KB rules to evaluate askbacks and emit chips
 *
 * @param input - Facts, treatment ID, optional instance scope, answers
 * @returns Evaluation output with facts, askbacks, chips, and trace
 */
export function applyMedicalKb(input: MedicalEvalInput): MedicalEvalOutput {
    const kb = input.kbOverride ?? medicalKb;
    const allowChipEmission = input.allowChipEmission !== false;
    const trace: MedicalEvalOutput['trace'] = {
        appliedDefaults: [],
        firedRules: [],
        firedConcepts: [],
        requiredAskbacks: [],
        emittedChips: [],
    };

    // 1. Apply defaults first
    const { facts: factsWithDefaults, applied } = applyDefaults(
        input.facts,
        kb.defaults,
        input
    );
    trace.appliedDefaults = applied;

    // 2. Evaluate rules with updated facts
    const ruleResult = evaluateRules(
        kb.rules,
        { ...input, facts: factsWithDefaults },
        factsWithDefaults
    );

    const conceptResult = evaluateConcepts(
        kb.concepts ?? [],
        { ...input, facts: factsWithDefaults },
        factsWithDefaults
    );

    // Merge rule + concept actions (concepts are first-class, rules remain for legacy)
    ruleResult.firedConcepts.push(...conceptResult.firedConcepts);
    ruleResult.requiredAskbacks.push(...conceptResult.requiredAskbacks);
    ruleResult.optionalAskbacks.push(...conceptResult.optionalAskbacks);
    ruleResult.emittedChips.push(...conceptResult.emittedChips);

    trace.firedRules = ruleResult.firedRules;
    trace.firedConcepts = ruleResult.firedConcepts;
    trace.requiredAskbacks = ruleResult.requiredAskbacks;
    trace.emittedChips = allowChipEmission ? ruleResult.emittedChips : [];

    // 3. Apply tooth scope if provided
    const tooth = input.instanceScope?.tooth;

    const scopeId = (id: string): string =>
        tooth ? withToothScope(id, tooth) : id;

    // 4. Dedupe and sort askbacks
    const requiredSet = new Set<string>();
    const requiredWithMeta: Array<{ id: string; priority: number }> = [];

    for (const askback of ruleResult.requiredAskbacks) {
        const scopedId = scopeId(askback.id);
        if (!requiredSet.has(scopedId)) {
            requiredSet.add(scopedId);
            const rule = kb.rules.find(r => r.id === askback.ruleId);
            requiredWithMeta.push({
                id: scopedId,
                priority: rule?.priority ?? 100,
            });
        }
    }

    // Sort: by priority, then by id for determinism
    requiredWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.id.localeCompare(b.id);
    });

    const requiredAskbacks = requiredWithMeta.map(a => a.id);

    // 5. Dedupe and sort optional askbacks
    const optionalSet = new Set<string>();
    const optionalWithMeta: Array<{ id: string; priority: number }> = [];
    for (const askback of ruleResult.optionalAskbacks) {
        const scopedId = scopeId(askback.id);
        if (!optionalSet.has(scopedId)) {
            optionalSet.add(scopedId);
            const rule = kb.rules.find(r => r.id === askback.ruleId);
            optionalWithMeta.push({
                id: scopedId,
                priority: rule?.priority ?? 100,
            });
        }
    }
    optionalWithMeta.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.id.localeCompare(b.id);
    });
    const optionalAskbacks = optionalWithMeta.map(a => a.id);

    // 6. Dedupe and sort chips (optional in V10)
    const emittedChips = allowChipEmission
        ? (() => {
            const chipSet = new Set<string>();
            const chipsWithMeta: Array<{ id: string; priority: number }> = [];

            for (const chip of ruleResult.emittedChips) {
                if (!chipSet.has(chip.id)) {
                    chipSet.add(chip.id);
                    const rule = kb.rules.find(r => r.id === chip.ruleId);
                    chipsWithMeta.push({
                        id: chip.id,
                        priority: rule?.priority ?? 100,
                    });
                }
            }

            chipsWithMeta.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.id.localeCompare(b.id);
            });

            return chipsWithMeta.map(c => c.id);
        })()
        : [];

    return {
        facts: factsWithDefaults,
        requiredAskbacks,
        optionalAskbacks,
        emittedChips,
        trace,
    };
}
