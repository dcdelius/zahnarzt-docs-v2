/**
 * LLM Auditor — Informational Review (Non-blocking)
 * 
 * Generates structured diff reports for failed cases.
 * Does NOT block CI — purely informational.
 */

import type { RealCaseFixture } from '../fixtures/realCases';
import type { RuleViolation } from './truthRules';

// ═══════════════════════════════════════════════════════════════
// AUDIT REPORT TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuditReport {
    fixtureId: string;
    timestamp: string;
    dictationSummary: string;
    outputSummary: string;
    discrepancies: string[];
    billingSummary: string;
    suggestedFixes: string[];
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate an audit report for a failed test case
 * (Mock implementation — no external LLM call)
 */
export function generateAuditReport(
    fixture: RealCaseFixture,
    outputText: string,
    billingCodes: string[],
    billingReason: string | undefined,
    violations: RuleViolation[]
): AuditReport {
    const report: AuditReport = {
        fixtureId: fixture.id,
        timestamp: new Date().toISOString(),
        dictationSummary: summarizeDictation(fixture.dictation),
        outputSummary: summarizeOutput(outputText),
        discrepancies: extractDiscrepancies(violations),
        billingSummary: summarizeBilling(billingCodes, billingReason),
        suggestedFixes: generateFixSuggestions(violations),
    };

    return report;
}

/**
 * Summarize dictation (first 200 chars + key terms)
 */
function summarizeDictation(dictation: string): string {
    const preview = dictation.slice(0, 200);
    const toothMatch = dictation.match(/Zahn\s+(\d+)/i);
    const tooth = toothMatch ? `Tooth: ${toothMatch[1]}` : 'Tooth: not found';
    return `${tooth} | ${preview}...`;
}

/**
 * Summarize output (first 300 chars)
 */
function summarizeOutput(outputText: string): string {
    return outputText.slice(0, 300) + '...';
}

/**
 * Extract discrepancies from violations
 */
function extractDiscrepancies(violations: RuleViolation[]): string[] {
    return violations.map(v => {
        const prefix = v.severity === 'hard' ? '[HARD]' : '[SOFT]';
        return `${prefix} ${v.rule}: ${v.message}`;
    });
}

/**
 * Summarize billing
 */
function summarizeBilling(codes: string[], reason?: string): string {
    if (codes.length === 0) {
        return reason ? `Empty billing: ${reason}` : 'Empty billing (no reason)';
    }
    return `${codes.length} codes: ${codes.join(', ')}`;
}

/**
 * Generate fix suggestions based on violation types
 */
function generateFixSuggestions(violations: RuleViolation[]): string[] {
    const suggestions: string[] = [];

    const ruleTypes = new Set(violations.map(v => v.rule));

    if (ruleTypes.has('CROSS_TREATMENT_LEAKAGE')) {
        suggestions.push(
            'Check treatmentId propagation in pipeline',
            'Verify output renderer uses correct treatment context',
            'Review template selection logic in outputComposer',
        );
    }

    if (ruleTypes.has('TOOTH_PRESENCE')) {
        suggestions.push(
            'Check tooth extraction in extractionService',
            'Verify extracted.tooth is passed to output composer',
            'Ensure output templates include tooth placeholder',
        );
    }

    if (ruleTypes.has('FORBIDDEN_MOCK_STRINGS')) {
        suggestions.push(
            'Search codebase for hardcoded mock strings',
            'Remove demo data from production components',
            'Check OutputFlow for static text',
        );
    }

    if (ruleTypes.has('BILLING_PLAUSIBILITY')) {
        suggestions.push(
            'Review billing eligibility guards',
            'Check treatment-specific billing rules',
            'Verify billingReason is set when codes empty',
        );
    }

    if (ruleTypes.has('QUESTION_NECESSITY')) {
        suggestions.push(
            'Review questionService generation logic',
            'Check when-clauses for required questions',
            'Verify dictation parsing for missing data detection',
        );
    }

    return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN FORMATTER
// ═══════════════════════════════════════════════════════════════

/**
 * Format audit report as Markdown
 */
export function formatReportAsMarkdown(report: AuditReport): string {
    return `
## Audit Report: ${report.fixtureId}

**Timestamp:** ${report.timestamp}

### Dictation Summary
${report.dictationSummary}

### Output Summary
${report.outputSummary}

### Discrepancies
${report.discrepancies.length > 0 ? report.discrepancies.map(d => `- ${d}`).join('\n') : '- None'}

### Billing Summary
${report.billingSummary}

### Suggested Fixes
${report.suggestedFixes.length > 0 ? report.suggestedFixes.map(s => `- ${s}`).join('\n') : '- None'}

---
`;
}

/**
 * Generate full audit report file content
 */
export function generateFullAuditReport(reports: AuditReport[]): string {
    const header = `# V7 Real-Case E2E Audit Report

Generated: ${new Date().toISOString()}

Total Cases: ${reports.length}

---
`;

    const body = reports.map(r => formatReportAsMarkdown(r)).join('\n');

    return header + body;
}

export default {
    generateAuditReport,
    formatReportAsMarkdown,
    generateFullAuditReport,
};
