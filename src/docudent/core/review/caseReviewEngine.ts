/**
 * Case Review Engine — Quality & Compliance Check
 *
 * ═══════════════════════════════════════════════════════════════
 * Analyzes a CaseDoc and produces findings for user review.
 * Calm, professional language — no fear-inducing terms.
 * ═══════════════════════════════════════════════════════════════
 */

import type { CaseDoc } from '../case/caseService';
import type { Finding, FindingSeverity, ReviewCategory, ReviewResult } from './reviewTypes';

// ═══════════════════════════════════════════════════════════════
// SETTINGS TYPE (for settings-aware review)
// ═══════════════════════════════════════════════════════════════

export interface PracticeSettings {
    /** Anesthesia documentation policy */
    anesthesiaDefault?: 'always_documented' | 'on_demand' | 'never';
    /** Whether MKV documentation is required */
    mkvDocumentationRequired?: boolean;
    /** Strict reproducibility enforcement */
    strictReproducibility?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// REVIEW RULES
// ═══════════════════════════════════════════════════════════════

type ReviewRule = (caseDoc: CaseDoc, settings?: PracticeSettings) => Finding | null;

const REVIEW_RULES: ReviewRule[] = [
    // Rule 1: Finalized without reproducibility
    (c, settings) => {
        if (c.status === 'finalized' && !c.reproducibility) {
            // Check settings: strict mode → attention, else note
            const severity: FindingSeverity = settings?.strictReproducibility ? 'attention' : 'note';
            return {
                id: 'missing_reproducibility',
                category: 'formal',
                severity,
                message: 'Reproduzierbarkeit nicht vollständig',
                hint: 'Die aktuelle Dokumentation ermöglicht keine vollständige Nachvollziehbarkeit.',
                ctaRoute: '/settings',
                ctaLabel: 'Einstellungen prüfen',
            };
        }
        return null;
    },

    // Rule 2: Missing or short patient reference
    (c) => {
        if (!c.patientRef || c.patientRef.length < 4) {
            return {
                id: 'short_patient_ref',
                category: 'completeness',
                severity: 'attention',
                message: 'Patientenreferenz fehlt oder ist zu kurz',
                hint: 'Eine eindeutige Referenz erleichtert die spätere Zuordnung.',
            };
        }
        return null;
    },

    // Rule 3: Missing normalized dictation in input
    (c) => {
        if (!c.input?.normalizedDictation) {
            return {
                id: 'missing_dictation',
                category: 'completeness',
                severity: 'note',
                message: 'Diktat fehlt',
                hint: 'Ohne Diktat ist die Dokumentation weniger detailliert.',
                ctaRoute: `/cases?caseId=${c.id}`,
                ctaLabel: 'Fall öffnen',
            };
        }
        return null;
    },

    // Rule 4: MKV but no billing codes
    (c, settings) => {
        if (c.input?.hasMKV && (!c.output?.billingCodes || c.output.billingCodes.length === 0)) {
            // Check settings: if MKV documentation required → attention
            const severity: FindingSeverity = settings?.mkvDocumentationRequired ? 'attention' : 'note';
            return {
                id: 'mkv_no_billing',
                category: 'billing',
                severity,
                message: 'Mehrkostenvereinbarung ohne Positionen',
                hint: 'Es gibt Hinweise auf eine MKV, aber keine zugeordneten Abrechnungspositionen.',
                ctaRoute: `/cases?caseId=${c.id}`,
                ctaLabel: 'Fall prüfen',
            };
        }
        return null;
    },

    // Rule 5: Draft older than 24h
    (c) => {
        if (c.status === 'draft') {
            const createdAt = c.createdAt.toDate();
            const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceCreation > 24) {
                return {
                    id: 'stale_draft',
                    category: 'completeness',
                    severity: 'note',
                    message: 'Entwurf seit über 24 Stunden offen',
                    hint: 'Dieser Fall wartet auf Abschluss.',
                    ctaRoute: `/cases?caseId=${c.id}`,
                    ctaLabel: 'Fall öffnen',
                };
            }
        }
        return null;
    },

    // Rule 6: Output has warnings
    (c) => {
        if (c.output?.warnings && c.output.warnings.length > 0) {
            return {
                id: 'output_warnings',
                category: 'medical',
                severity: 'note',
                message: 'Hinweise aus der Verarbeitung',
                hint: 'Es gibt optionale Informationen, die geprüft werden könnten.',
                ctaRoute: `/cases?caseId=${c.id}`,
                ctaLabel: 'Fall öffnen',
            };
        }
        return null;
    },

    // Rule 7: Missing anesthesia when required
    (c, settings) => {
        // Only check if anesthesia is set to "always documented"
        if (settings?.anesthesiaDefault === 'always_documented') {
            const hasAnesthesia = c.answers && ('anesthesia' in (c.answers as Record<string, unknown>));
            if (!hasAnesthesia) {
                return {
                    id: 'missing_anesthesia',
                    category: 'billing',
                    severity: 'attention',
                    message: 'Anästhesie nicht dokumentiert',
                    hint: 'Laut Praxiseinstellungen sollte Anästhesie immer erfasst werden.',
                };
            }
        }
        return null;
    },

    // Rule 8: All good (positive finding)
    (c) => {
        if (c.status === 'finalized' && c.reproducibility && c.patientRef && c.input?.normalizedDictation) {
            return {
                id: 'all_good',
                category: 'completeness',
                severity: 'info',
                message: 'Dokumentation vollständig',
                hint: 'Alle relevanten Felder wurden sauber erkannt und gespeichert.',
            };
        }
        return null;
    },
];

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Review a single case, optionally respecting practice settings.
 */
export function reviewCase(caseDoc: CaseDoc, settings?: PracticeSettings): ReviewResult {
    const findings: Finding[] = [];

    for (const rule of REVIEW_RULES) {
        const finding = rule(caseDoc, settings);
        if (finding) {
            findings.push(finding);
        }
    }

    // Determine overall severity
    let overallSeverity: FindingSeverity = 'info';
    if (findings.some(f => f.severity === 'attention')) {
        overallSeverity = 'attention';
    } else if (findings.some(f => f.severity === 'note')) {
        overallSeverity = 'note';
    }

    return {
        caseId: caseDoc.id,
        findings,
        reviewedAt: new Date(),
        overallSeverity,
    };
}

/**
 * Review multiple cases.
 */
export function reviewCases(cases: CaseDoc[], settings?: PracticeSettings): ReviewResult[] {
    return cases.map(c => reviewCase(c, settings));
}

/**
 * Group findings by category for UI display.
 */
export function groupFindingsByCategory(findings: Finding[]): Map<ReviewCategory, Finding[]> {
    const grouped = new Map<ReviewCategory, Finding[]>();

    for (const finding of findings) {
        const existing = grouped.get(finding.category) ?? [];
        existing.push(finding);
        grouped.set(finding.category, existing);
    }

    return grouped;
}

// Re-export types for convenience
export type { Finding, FindingSeverity, ReviewCategory, ReviewResult } from './reviewTypes';
