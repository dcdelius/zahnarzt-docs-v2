import { TemplateV3, ValidationResult, ValidationIssue } from '../types/templateV3';
import { executeRules } from './ruleEngine';

/**
 * Validates data against the template schema and rules.
 */
export const validateData = (template: TemplateV3 | null | undefined, data: Record<string, any>, externalIssues: ValidationIssue[] = []): ValidationResult => {
    if (!template) {
        return {
            isValid: true,
            issues: [...externalIssues],
            blockingIssues: externalIssues.filter(i => i.blocking),
            normalizedData: data
        };
    }

    const issues: ValidationIssue[] = [...externalIssues];
    const blockingIssues: ValidationIssue[] = externalIssues.filter(i => i.blocking);

    // 1. Run Rules to get dynamic requirements and defaults
    const ruleResult = executeRules(template.rules, data);

    // 2. Apply Defaults (create normalized data)
    const normalizedData = { ...data, ...ruleResult.defaultUpdates };

    // 3. Check Static Required Fields
    template.fields.forEach(field => {
        if (field.required) {
            const value = normalizedData[field.id];
            if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                const issue: ValidationIssue = {
                    code: 'required_field_missing',
                    type: 'error',
                    path: field.id,
                    message: `Pflichtfeld "${field.label}" fehlt.`,
                    blocking: true
                };
                issues.push(issue);
                blockingIssues.push(issue);
            }
        }
    });

    // 4. Check Dynamic Required Fields (from Rules)
    ruleResult.requiredFields.forEach(fieldId => {
        const value = normalizedData[fieldId];
        const fieldDef = template.fields.find(f => f.id === fieldId);
        const label = fieldDef ? fieldDef.label : fieldId;

        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            // Avoid duplicates if already flagged as static required
            if (!issues.some(i => i.path === fieldId && i.code === 'required_field_missing')) {
                const issue: ValidationIssue = {
                    code: 'required_field_missing_dynamic',
                    type: 'error',
                    path: fieldId,
                    message: `Pflichtfeld "${label}" fehlt (bedingt erforderlich).`,
                    blocking: true
                };
                issues.push(issue);
                blockingIssues.push(issue);
            }
        }
    });

    // 5. Add Rule-Generated Warnings/Errors
    ruleResult.warnings.forEach(w => {
        issues.push(w);
        if (w.blocking) {
            blockingIssues.push(w);
        }
    });

    return {
        isValid: blockingIssues.length === 0,
        issues,
        blockingIssues,
        normalizedData
    };
};
