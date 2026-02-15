/**
 * Medical Layer Contracts — SSOT for Medical Askbacks
 *
 * This layer sits between EXTRACT and ASK.
 * It determines medically-required questions before any business logic.
 *
 * INVARIANTS:
 * - No patient identity data (no patientId, caseId, name, DOB)
 * - All IDs namespaced by treatmentId
 * - Pure functions only (no side effects)
 */

// Treatment ID type - matches core/billing/knowledgeBase/registry/treatmentRegistry.ts
export type TreatmentId = 'fuellung' | 'endo';

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL FINDING — Issues detected in extracted data
// ═══════════════════════════════════════════════════════════════════════════════

export interface MedicalFinding {
    /** Unique finding ID, namespaced: {treatmentId}.{finding_name} */
    id: string;

    /** Severity: error = blocks output, warning = proceeds with note, info = logged */
    severity: 'error' | 'warning' | 'info';

    /** Human-readable message (German), PII-safe */
    message: string;

    /** Field path that triggered this finding */
    field?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL ASKBACK — Required question triggered by medical logic
// ═══════════════════════════════════════════════════════════════════════════════

export interface MedicalAskback {
    /** Trigger ID, namespaced: {treatmentId}.{askback_name} */
    id: string;

    /** Question ID to ask (fully namespaced, e.g., 'fuellung.vitality'). Must exist in question_bank. */
    questionId: string;

    /** Priority: lower number = asked first */
    priority: number;

    /** hard = required for output, soft = recommended */
    severity: 'hard' | 'soft';

    /** Why this askback was triggered (PII-safe) */
    reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL RESULT — Output of medical evaluation
// ═══════════════════════════════════════════════════════════════════════════════

export interface MedicalResult {
    /** Treatment this result is for */
    treatmentId: TreatmentId;

    /** Whether minimum dataset for output is met */
    minimalDatasetMet: boolean;

    /** Hard askbacks (must be answered) */
    hardAskbacks: MedicalAskback[];

    /** Soft askbacks (recommended but optional) */
    softAskbacks: MedicalAskback[];

    /** Findings (contradictions, warnings, errors) */
    findings: MedicalFinding[];

    /** Reason if minimal dataset not met (PII-safe) */
    askbackReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATRIX TYPES — For loading from JSON
// ═══════════════════════════════════════════════════════════════════════════════

export interface AskbackTrigger {
    field: string;
    is?: null | string | number | boolean;
    in?: (string | number | boolean)[];
    AND?: AskbackTrigger[];
}

export interface AskbackDefinition {
    /** Unique ID for this askback, namespaced: {treatmentId}.{name} */
    id: string;
    /** Trigger condition for this askback */
    trigger: AskbackTrigger;
    /** Fully namespaced question ID, e.g., 'fuellung.vitality' */
    questionId: string;
    /** Priority: lower = asked first */
    priority: number;
    /** Human-readable reason (PII-safe) */
    reason: string;
}

export interface ContradictionDefinition {
    id: string;
    condition: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
}

export interface TreatmentMedicalConfig {
    minimalDataset: string[];
    hardAskbacks: AskbackDefinition[];
    softAskbacks: AskbackDefinition[];
    contradictions: ContradictionDefinition[];
}

export interface MedicalAskbackMatrix {
    version: string;
    treatments: {
        fuellung: TreatmentMedicalConfig;
        endo: TreatmentMedicalConfig;
    };
}
