import {
    DOCUMENTATION_OBLIGATION_RULES,
    type DocumentationObligationCondition,
    type DocumentationObligationLineConfig,
    type DocumentationObligationRule,
} from '../../../../contracts/documentationObligations';

type ObligationContext = {
    treatmentId: string;
    extractedData: Record<string, any>;
};

export type DocumentationObligationLine = {
    sectionId: string;
    text: string;
    evidenceId: string;
};


const normalizeText = (value: string): string =>
    value
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

const hasEquivalentText = (haystack: string, needle: string): boolean => {
    const a = normalizeText(haystack);
    const b = normalizeText(needle);
    return b.length > 0 && a.includes(b);
};

function getValueByPath(input: Record<string, any>, path: string): unknown {
    const parts = path.split('.');
    let cursor: any = input;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object') return undefined;
        cursor = cursor[part];
    }
    return cursor;
}

function isRuleEnabledForTreatment(rule: DocumentationObligationRule, treatmentId: string): boolean {
    if (!rule.treatmentIds || rule.treatmentIds.length === 0) return true;
    return rule.treatmentIds.includes(treatmentId);
}

function conditionMatches(condition: DocumentationObligationCondition, value: unknown): boolean {
    if (condition.kind === 'present') {
        return typeof value === 'string'
            ? value.trim().length > 0
            : value !== undefined && value !== null;
    }
    if (condition.kind === 'positiveNumber') {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0;
    }
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === condition.value.trim().toLowerCase();
}

function formatValue(
    value: unknown,
    format: 'raw' | 'currency2' | undefined
): string {
    if (format === 'currency2') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(2) : '';
    }
    return String(value ?? '').trim();
}

function buildLineText(
    rule: DocumentationObligationRule,
    value: unknown,
    extractedData: Record<string, any>
): string | undefined {
    if (rule.line.kind === 'value') {
        const formatted = formatValue(value, rule.line.format);
        if (!formatted) return undefined;
        return rule.line.template.replace('{{value}}', formatted);
    }

    if (!rule.line.materialPath) return rule.line.text;
    const material = String(getValueByPath(extractedData, rule.line.materialPath) ?? '').trim();
    if (!material) return rule.line.text;
    return rule.line.text.replace(/\.$/, ` (${material}).`);
}

/**
 * Runtime documentation obligations:
 * If clinically/forensically relevant facts exist, they must be visible in final text.
 * This is architecture-level behavior (composer), not only a test-time gate.
 */
export function buildDocumentationObligations(ctx: ObligationContext): DocumentationObligationLine[] {
    const obligations: DocumentationObligationLine[] = [];
    const extractedData = ctx.extractedData ?? {};

    for (const rule of DOCUMENTATION_OBLIGATION_RULES) {
        if (!isRuleEnabledForTreatment(rule, ctx.treatmentId)) continue;
        const value = getValueByPath(extractedData, rule.factPath);
        if (!conditionMatches(rule.condition, value)) continue;
        const text = buildLineText(rule, value, extractedData);
        if (!text || !text.trim()) continue;
        obligations.push({
            sectionId: rule.sectionId,
            text: text.trim(),
            evidenceId: `obligation:${rule.id}`,
        });
    }

    return obligations;
}

export function mergeObligationLinesIntoSectionContent(
    existingContent: string,
    obligationLines: string[]
): string {
    const linesToAdd = obligationLines.filter(line => !hasEquivalentText(existingContent, line));
    if (linesToAdd.length === 0) return existingContent;
    if (!existingContent.trim()) return linesToAdd.join('\n');
    return `${existingContent.trim()}\n${linesToAdd.join('\n')}`;
}
