/**
 * Case Review Engine — Quality & Compliance Check
 *
 * ═══════════════════════════════════════════════════════════════
 * Analyzes a CaseDoc and produces findings for user review.
 * No billing logic - just quality checks.
 * ═══════════════════════════════════════════════════════════════
 */

import type { CaseDoc } from '../case/caseService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type FindingSeverity = 'ok' | 'hinweis' | 'risiko';

export interface Finding {
    id: string;
    severity: FindingSeverity;
    title: string;
    detail: string;
    ctaRoute?: string;   // Optional: route to fix the issue
    ctaLabel?: string;   // Optional: label for the CTA
}

export interface ReviewResult {
    caseId: string;
    findings: Finding[];
    reviewedAt: Date;
    overallStatus: FindingSeverity;
}

// ═══════════════════════════════════════════════════════════════
// REVIEW RULES
// ═══════════════════════════════════════════════════════════════

type ReviewRule = (caseDoc: CaseDoc) => Finding | null;

const REVIEW_RULES: ReviewRule[] = [
    // Rule 1: Finalized without reproducibility
    (c) => {
        if (c.status === 'finalized' && !c.reproducibility) {
            return {
                id: 'missing_reproducibility',
                severity: 'risiko',
                title: 'Abrechnung nicht eindeutig reproduzierbar',
                detail: 'Die aktuellen Einstellungen oder Eingaben lassen keine eindeutige Abrechnungslogik zu.',
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
                severity: 'risiko',
                title: 'Patientenreferenz fehlt',
                detail: 'Die Patientenreferenz ist zu kurz oder fehlt. Zuordnung erschwert.',
            };
        }
        return null;
    },

    // Rule 3: Missing normalized dictation in input
    (c) => {
        if (!c.input?.normalizedDictation) {
            return {
                id: 'missing_dictation',
                severity: 'hinweis',
                title: 'Dokumentation teilweise unvollständig',
                detail: 'Einige optionale Angaben fehlen. Der Fall bleibt gültig, könnte aber klarer sein.',
                ctaRoute: `/cases?caseId=${c.id}`,
                ctaLabel: 'Fall öffnen',
            };
        }
        return null;
    },

    // Rule 4: MKV but no billing codes
    (c) => {
        if (c.input?.hasMKV && (!c.output?.billingCodes || c.output.billingCodes.length === 0)) {
            return {
                id: 'mkv_no_billing',
                severity: 'risiko',
                title: 'Mehrkosten erkannt, aber nicht vollständig dokumentiert',
                detail: 'Es gibt Hinweise auf eine Mehrkostenvereinbarung, aber keine vollständige Zuordnung.',
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
                    severity: 'hinweis',
                    title: 'Dokumentation teilweise unvollständig',
                    detail: 'Einige optionale Angaben fehlen. Der Fall bleibt gültig, könnte aber klarer sein.',
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
                severity: 'hinweis',
                title: 'Dokumentation teilweise unvollständig',
                detail: 'Einige optionale Angaben fehlen. Der Fall bleibt gültig, könnte aber klarer sein.',
                ctaRoute: `/cases?caseId=${c.id}`,
                ctaLabel: 'Fall öffnen',
            };
        }
        return null;
    },

    // Rule 7: All good (positive finding)
    (c) => {
        if (c.status === 'finalized' && c.reproducibility && c.patientRef && c.input?.normalizedDictation) {
            return {
                id: 'all_good',
                severity: 'ok',
                title: 'Struktur vollständig',
                detail: 'Alle relevanten Felder wurden sauber erkannt und gespeichert.',
            };
        }
        return null;
    },
];

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

export function reviewCase(caseDoc: CaseDoc): ReviewResult {
    const findings: Finding[] = [];

    for (const rule of REVIEW_RULES) {
        const finding = rule(caseDoc);
        if (finding) {
            findings.push(finding);
        }
    }

    // Determine overall status
    let overallStatus: FindingSeverity = 'ok';
    if (findings.some(f => f.severity === 'risiko')) {
        overallStatus = 'risiko';
    } else if (findings.some(f => f.severity === 'hinweis')) {
        overallStatus = 'hinweis';
    }

    return {
        caseId: caseDoc.id,
        findings,
        reviewedAt: new Date(),
        overallStatus,
    };
}

// Convenience for multiple cases
export function reviewCases(cases: CaseDoc[]): ReviewResult[] {
    return cases.map(reviewCase);
}
