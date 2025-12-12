import { TemplateRule, RuleCondition, RuleAction, ValidationResult, ValidationIssue } from '../types/templateV3';

/**
 * Evaluates a single condition against the provided data.
 */
export const evaluateCondition = (condition: RuleCondition, data: Record<string, any>): boolean => {
    const value = data[condition.fieldId];

    switch (condition.operator) {
        case 'eq':
            return value === condition.value;
        case 'neq':
            return value !== condition.value;
        case 'exists':
            return value !== undefined && value !== null && value !== '';
        case 'notExists':
            return value === undefined || value === null || value === '';
        case 'contains':
            if (Array.isArray(value)) {
                return value.includes(condition.value);
            }
            if (typeof value === 'string') {
                return value.includes(condition.value);
            }
            return false;
        case 'in':
            if (Array.isArray(condition.value)) {
                return condition.value.includes(value);
            }
            return false;
        default:
            return false;
    }
};

/**
 * Evaluates a list of conditions (AND logic).
 */
export const evaluateConditions = (conditions: RuleCondition[], data: Record<string, any>): boolean => {
    return conditions.every(cond => evaluateCondition(cond, data));
};

/**
 * Result of rule application.
 */
export interface RuleExecutionResult {
    requiredFields: string[]; // Field IDs that are now required
    defaultUpdates: Record<string, any>; // Field IDs -> New Values
    warnings: ValidationIssue[]; // Generated warnings
}

/**
 * Applies rules to the data and returns the effects (requirements, defaults, warnings).
 * Does NOT mutate data.
 */
export const executeRules = (rules: TemplateRule[] | undefined, data: Record<string, any>): RuleExecutionResult => {
    const result: RuleExecutionResult = {
        requiredFields: [],
        defaultUpdates: {},
        warnings: []
    };

    if (!rules) return result;

    for (const rule of rules) {
        if (evaluateConditions(rule.when, data)) {
            for (const action of rule.then) {
                switch (action.type) {
                    case 'require':
                        if (action.targetFieldId) {
                            result.requiredFields.push(action.targetFieldId);
                        }
                        break;
                    case 'setDefault':
                        if (action.targetFieldId && action.value !== undefined) {
                            // Only set default if field is currently empty
                            if (data[action.targetFieldId] === undefined || data[action.targetFieldId] === null || data[action.targetFieldId] === '') {
                                result.defaultUpdates[action.targetFieldId] = action.value;
                            }
                        }
                        break;
                    case 'warn':
                        if (action.message) {
                            result.warnings.push({
                                code: rule.id,
                                type: 'warning',
                                path: action.targetFieldId || 'global',
                                message: action.message,
                                blocking: false
                            });
                        }
                        break;
                    case 'error':
                        if (action.message) {
                            result.warnings.push({
                                code: rule.id,
                                type: 'error',
                                path: action.targetFieldId || 'global',
                                message: action.message,
                                blocking: true
                            });
                        }
                        break;
                }
            }
        }
    }

    return result;
};
