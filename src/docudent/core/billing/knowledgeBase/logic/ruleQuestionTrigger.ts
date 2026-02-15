/**
 * Rule-Based Question Triggering — Engine Logic
 *
 * SSOT: Questions come from Rules, not from category heuristics.
 *
 * Pipeline:
 * 1. Load applicable rules for treatment + active chips
 * 2. Check each rule's triggerField
 * 3. If field missing → generate question
 * 4. QuestionBank provides UI semantics only
 */

import type { ExtractedDataV2, Field } from '../../../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RuleDefinition {
    id: string;
    appliesTo: string[];
    shortSummary: string;
    triggerField: string;
    triggerValue?: string;
    riskLevel: 'niedrig' | 'mittel' | 'hoch';
    questionTrigger?: boolean;
    questionKey?: string;
    regressRisk?: boolean;
    auditWarning?: string;
    source?: string;
    insuranceCondition?: 'GKV' | 'PKV' | 'MKV';
    condition?: string;
}

export interface RequiredField {
    field: string;
    questionKey: string;
    ruleId: string;
    riskLevel: RuleDefinition['riskLevel'];
    regressRisk: boolean;
    reason: string;
}

// ═══════════════════════════════════════════════════════════════
// LOAD RULES
// ═══════════════════════════════════════════════════════════════

// ESM import for browser compatibility
import fuellungRegeln from '../regeln/fuellung_regeln.json';

type RulesCache = Map<string, RuleDefinition[]>;
const _rulesCache: RulesCache = new Map();

export function loadRulesForTreatment(treatmentId: string): RuleDefinition[] {
    const normalized = String(treatmentId ?? '').trim().toLowerCase();
    const cacheKey = normalized || treatmentId;
    if (_rulesCache.has(cacheKey)) {
        return _rulesCache.get(cacheKey)!;
    }

    let rules: RuleDefinition[] = [];
    switch (normalized) {
        case 'fuellung':
            rules = fuellungRegeln.rules || [];
            break;
        case 'endo':
            rules = [];
            break;
        default:
            if (normalized) {
                console.warn(`[RuleEngine] No rules found for: ${normalized}`);
            }
    }

    _rulesCache.set(cacheKey, rules);
    return rules;
}

// ═══════════════════════════════════════════════════════════════
// FIELD VALUE CHECKER
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a field is missing or needs confirmation in extracted data
 */
function isFieldMissing(extracted: ExtractedDataV2, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current: unknown = extracted;

    for (const part of parts) {
        if (current === null || current === undefined) return true;
        if (typeof current !== 'object') return true;
        current = (current as Record<string, unknown>)[part];
    }

    // Check if it's a Field<T> with null value or needsConfirmation
    if (current && typeof current === 'object' && 'value' in current) {
        const field = current as Field<unknown>;
        return field.value === null || field.needsConfirmation;
    }

    return current === null || current === undefined;
}

/**
 * Map rule triggerField to extraction field path
 */
function mapTriggerFieldToPath(triggerField: string): string {
    const mapping: Record<string, string> = {
        'vitality': 'mentioned.vitality',
        'percussion': 'mentioned.percussion',
        'tiefe': 'mentioned.tiefe',
        'isolation': 'mentioned.kofferdam',
        'material': 'mentioned.material',
        'anesthesia': 'mentioned.anesthesia',
        'capping': 'mentioned.capping',
        'zahn': 'tooth',
        'flaechen': 'surfaces',
        'costs': 'costs',
    };
    return mapping[triggerField] || `mentioned.${triggerField}`;
}

/**
 * Map rule triggerField to question key
 */
function mapTriggerFieldToQuestionKey(triggerField: string): string {
    const mapping: Record<string, string> = {
        'vitality': 'vitality',
        'percussion': 'percussion',
        'tiefe': 'tiefe',
        'isolation': 'isolation',
        'material': 'material',
    };
    return mapping[triggerField] || triggerField;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Get Required Fields from Rules
// ═══════════════════════════════════════════════════════════════

/**
 * getRequiredFieldsFromRules — Rule-driven question triggering
 *
 * Returns list of fields that MUST be answered based on:
 * 1. Rules with questionTrigger=true
 * 2. Field is missing in extracted data
 *
 * NO HEURISTICS. Only rules.
 */
export function getRequiredFieldsFromRules(
    treatmentId: string,
    activeChipIds: string[],
    extracted: ExtractedDataV2,
    insuranceType: 'GKV' | 'PKV',
    hasMKV: boolean
): RequiredField[] {
    const rules = loadRulesForTreatment(treatmentId);
    const required: RequiredField[] = [];
    const seenFields = new Set<string>();

    for (const rule of rules) {
        // Skip if not a question trigger
        if (!rule.questionTrigger) continue;

        // Skip if insurance condition doesn't match
        if (rule.insuranceCondition) {
            if (rule.insuranceCondition === 'MKV' && !hasMKV) continue;
            if (rule.insuranceCondition === 'PKV' && insuranceType !== 'PKV') continue;
            if (rule.insuranceCondition === 'GKV' && insuranceType !== 'GKV') continue;
        }

        // Check if rule applies to any active chip (or is global)
        const appliesToActive = rule.appliesTo.length === 0 ||
            rule.appliesTo.some(chipId => activeChipIds.includes(chipId));

        // For now, include all question triggers (can be refined later)
        // TODO: Check chip relevance more strictly
        if (!appliesToActive && activeChipIds.length > 0) {
            // Skip rules that don't apply to active chips
            // continue;
        }

        // Get field path
        const fieldPath = mapTriggerFieldToPath(rule.triggerField);
        const questionKey = rule.questionKey || mapTriggerFieldToQuestionKey(rule.triggerField);

        // Skip duplicates
        if (seenFields.has(rule.triggerField)) continue;

        // Check if field is missing
        if (isFieldMissing(extracted, fieldPath)) {
            required.push({
                field: rule.triggerField,
                questionKey,
                ruleId: rule.id,
                riskLevel: rule.riskLevel,
                regressRisk: rule.regressRisk || false,
                reason: rule.shortSummary,
            });
            seenFields.add(rule.triggerField);
        }
    }

    // Sort by risk level (hoch first)
    const riskOrder = { hoch: 0, mittel: 1, niedrig: 2 };
    required.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return required;
}

/**
 * getApplicableRules — Get all rules that apply to current context
 */
export function getApplicableRules(
    treatmentId: string,
    activeChipIds: string[],
    insuranceType: 'GKV' | 'PKV',
    hasMKV: boolean
): RuleDefinition[] {
    const rules = loadRulesForTreatment(treatmentId);

    return rules.filter(rule => {
        // Check insurance condition
        if (rule.insuranceCondition) {
            if (rule.insuranceCondition === 'MKV' && !hasMKV) return false;
            if (rule.insuranceCondition === 'PKV' && insuranceType !== 'PKV') return false;
            if (rule.insuranceCondition === 'GKV' && insuranceType !== 'GKV') return false;
        }

        // Check if applies to active chips
        if (rule.appliesTo.length > 0) {
            const applies = rule.appliesTo.some(chipId => activeChipIds.includes(chipId));
            if (!applies) return false;
        }

        return true;
    });
}
