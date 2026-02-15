/**
 * Medical Engine — Dispatcher and Core Logic (P1+P2 Refactored)
 *
 * This module evaluates extracted data against medical rules
 * to determine required askbacks before any output is generated.
 *
 * INVARIANTS:
 * - Pure function (no side effects)
 * - No patient identity data processed
 * - All IDs namespaced by treatmentId
 * - Deterministic output for same input
 * - Uses MedicalCtx (P2) for clean trigger evaluation
 */

import type { MedicalResult, MedicalAskback, MedicalFinding, MedicalAskbackMatrix, AskbackTrigger, AskbackDefinition } from '../../contracts/medical';
import type { ExtractedDataV2 } from '../../contracts/extraction';

// Import matrix - sync import since it's a static JSON file
import matrixData from './medicalAskbackMatrix.v1.json';

const matrix = matrixData as MedicalAskbackMatrix;

// ═══════════════════════════════════════════════════════════════════════════════
// P2: MEDICAL CONTEXT TYPES — Clean view for trigger evaluation
// ═══════════════════════════════════════════════════════════════════════════════

export interface FuellungMedicalCtx {
    tooth: string | null;
    surfaces: string[] | null;
    vitality: string | null;
    percussion: string | null;
    tiefe: string | null;
    kofferdam: boolean | null;
    cappingPresent: boolean | null;
    material: string | null;
}

export interface EndoMedicalCtx {
    tooth: string | null;
    endoStep: string | null;
    canalCount: number | null;
    obturation: string | null;
    irrigationProtocol: string | null;
    medication: string | null;
    vitality: string | null;
    percussion: string | null;
    kofferdam: boolean | null;  // P5: Rubber dam isolation
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Evaluate trigger condition against MedicalCtx
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateTrigger(trigger: AskbackTrigger, ctx: Record<string, unknown>): boolean {
    // Handle AND conditions
    if (trigger.AND) {
        return trigger.AND.every(t => evaluateTrigger(t, ctx));
    }

    const fieldValue = ctx[trigger.field];

    // Check "is" condition
    if ('is' in trigger) {
        if (trigger.is === null) {
            return fieldValue === null || fieldValue === undefined;
        }
        return fieldValue === trigger.is;
    }

    // Check "in" condition
    if (trigger.in) {
        return trigger.in.includes(fieldValue as string | number | boolean);
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Check if minimal dataset is met using MedicalCtx
// ═══════════════════════════════════════════════════════════════════════════════

function checkMinimalDataset(fields: string[], ctx: Record<string, unknown>): { met: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of fields) {
        const value = ctx[field];

        if (value === null || value === undefined) {
            missing.push(field);
        } else if (Array.isArray(value) && value.length === 0) {
            // Empty array counts as missing (e.g., surfaces: [])
            missing.push(field);
        }
    }

    return { met: missing.length === 0, missing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Build askback from definition (P1: use def.questionId directly)
// ═══════════════════════════════════════════════════════════════════════════════

function buildAskback(def: AskbackDefinition, severity: 'hard' | 'soft'): MedicalAskback {
    return {
        id: def.id,
        questionId: def.questionId, // P1: Use fully-qualified ID from matrix
        priority: def.priority,
        severity,
        reason: def.reason
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P2: FUELLUNG CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildFuellungCtx(extracted: ExtractedDataV2): FuellungMedicalCtx {
    return {
        tooth: extracted.tooth?.value ?? null,
        surfaces: extracted.surfaces?.value ?? null,
        vitality: extracted.mentioned?.vitality?.value ?? null,
        percussion: extracted.mentioned?.percussion?.value ?? null,
        tiefe: extracted.mentioned?.tiefe?.value ?? null,
        kofferdam: extracted.mentioned?.kofferdam?.value ?? null,
        cappingPresent: extracted.mentioned?.capping?.value?.present ?? null,
        material: extracted.mentioned?.material?.value ?? null
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUELLUNG MEDICAL ENGINE (P2: Uses clean ctx)
// ═══════════════════════════════════════════════════════════════════════════════

export function processFuellungMedical(extracted: ExtractedDataV2): MedicalResult {
    const config = matrix.treatments.fuellung;
    const treatmentId = 'fuellung';

    const hardAskbacks: MedicalAskback[] = [];
    const softAskbacks: MedicalAskback[] = [];
    const findings: MedicalFinding[] = [];

    // P2: Build clean context for trigger evaluation
    const ctx = buildFuellungCtx(extracted);

    // Check hard askbacks against ctx
    for (const def of config.hardAskbacks) {
        if (evaluateTrigger(def.trigger, ctx as unknown as Record<string, unknown>)) {
            hardAskbacks.push(buildAskback(def, 'hard'));
        }
    }

    // Check soft askbacks against ctx
    for (const def of config.softAskbacks) {
        if (evaluateTrigger(def.trigger, ctx as unknown as Record<string, unknown>)) {
            softAskbacks.push(buildAskback(def, 'soft'));
        }
    }

    // Check minimal dataset using ctx
    const minimalCheck = checkMinimalDataset(config.minimalDataset, ctx as unknown as Record<string, unknown>);

    // Check contradictions: deep cavity without capping
    if (ctx.tiefe === 'tief' && ctx.cappingPresent !== true) {
        findings.push({
            id: 'fuellung.deep_but_no_capping',
            severity: 'warning',
            message: 'Tiefe Kavität ohne Überkappungsangabe',
            field: 'cappingPresent'
        });
    }

    // P3.2: Deep cavity without isolation documentation
    if (ctx.tiefe === 'tief' && ctx.kofferdam === null) {
        findings.push({
            id: 'fuellung.tiefe_ohne_isolation',
            severity: 'warning',
            message: 'Tiefe Kavität ohne Trockenlegungsangabe',
            field: 'kofferdam'
        });
    }

    // Sort by priority
    hardAskbacks.sort((a, b) => a.priority - b.priority);
    softAskbacks.sort((a, b) => a.priority - b.priority);

    return {
        treatmentId,
        minimalDatasetMet: minimalCheck.met,
        hardAskbacks,
        softAskbacks,
        findings,
        askbackReason: minimalCheck.met ? undefined : `Fehlende Pflichtdaten: ${minimalCheck.missing.join(', ')}`
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P10: ENDO STEP NORMALIZATION
// question_bank uses 'endo_start'|'endo_interim'|'endo_complete'
// medical matrix expects 'start'|'interim'|'complete'
// ═══════════════════════════════════════════════════════════════════════════════

type CanonicalEndoStep = 'start' | 'interim' | 'complete' | null;

const ENDO_STEP_NORMALIZATION: Record<string, CanonicalEndoStep> = {
    // UI/question_bank values
    'endo_start': 'start',
    'endo_interim': 'interim',
    'endo_complete': 'complete',
    // Already canonical values (pass through)
    'start': 'start',
    'interim': 'interim',
    'complete': 'complete',
    // Common extraction variations
    'trepanation': 'start',
    'einlage': 'start',
    'zwischensitzung': 'interim',
    'wurzelfüllung': 'complete',
    'wf': 'complete'
};

export function normalizeEndoStep(rawValue: unknown): CanonicalEndoStep {
    if (rawValue === null || rawValue === undefined) return null;
    const normalized = String(rawValue).toLowerCase().trim();
    return ENDO_STEP_NORMALIZATION[normalized] ?? null;
}

function buildEndoCtx(extracted: ExtractedDataV2): EndoMedicalCtx {
    // Map from ExtractedDataV2.mentioned to our clean ctx
    // Note: The mentioned fields may be named differently, we normalize here
    const mentioned = extracted.mentioned as Record<string, { value: unknown } | undefined> | undefined;

    // P10: Normalize endo step to canonical values
    const rawEndoStep = mentioned?.endo_step?.value;
    const canonicalEndoStep = normalizeEndoStep(rawEndoStep);

    return {
        tooth: extracted.tooth?.value ?? null,
        endoStep: canonicalEndoStep,
        canalCount: (mentioned?.kanalzahl?.value as number) ?? null,
        obturation: (mentioned?.obturation?.value as string) ?? null,
        irrigationProtocol: (mentioned?.spuelung?.value as string) ?? null,
        medication: (mentioned?.medikament?.value as string) ?? null,
        vitality: extracted.mentioned?.vitality?.value ?? null,
        percussion: extracted.mentioned?.percussion?.value ?? null,
        kofferdam: extracted.mentioned?.kofferdam?.value ?? null  // P5: Rubber dam isolation
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDO MEDICAL ENGINE (P2: Uses clean ctx)
// ═══════════════════════════════════════════════════════════════════════════════

export function processEndoMedical(extracted: ExtractedDataV2): MedicalResult {
    const config = matrix.treatments.endo;
    const treatmentId = 'endo';

    const hardAskbacks: MedicalAskback[] = [];
    const softAskbacks: MedicalAskback[] = [];
    const findings: MedicalFinding[] = [];

    // P2: Build clean context for trigger evaluation
    const ctx = buildEndoCtx(extracted);

    // Check hard askbacks against ctx
    for (const def of config.hardAskbacks) {
        if (evaluateTrigger(def.trigger, ctx as unknown as Record<string, unknown>)) {
            hardAskbacks.push(buildAskback(def, 'hard'));
        }
    }

    // Check soft askbacks against ctx
    for (const def of config.softAskbacks) {
        if (evaluateTrigger(def.trigger, ctx as unknown as Record<string, unknown>)) {
            softAskbacks.push(buildAskback(def, 'soft'));
        }
    }

    // Check minimal dataset using ctx
    const minimalCheck = checkMinimalDataset(config.minimalDataset, ctx as unknown as Record<string, unknown>);

    // Check contradictions: complete without canal count
    if (ctx.endoStep === 'complete' && ctx.canalCount === null) {
        findings.push({
            id: 'endo.complete_without_canals',
            severity: 'error',
            message: 'Abschluss ohne Kanalzahl nicht möglich',
            field: 'canalCount'
        });
    }

    // P3.1: Endo start without diagnostic tests
    if (ctx.endoStep === 'start' && ctx.vitality === null && ctx.percussion === null) {
        findings.push({
            id: 'endo.start_ohne_diagnostik',
            severity: 'warning',
            message: 'Endo-Beginn ohne Sensibilitäts-/Perkussionstests dokumentiert',
            field: 'vitality'
        });
    }

    // Sort by priority
    hardAskbacks.sort((a, b) => a.priority - b.priority);
    softAskbacks.sort((a, b) => a.priority - b.priority);

    return {
        treatmentId,
        minimalDatasetMet: minimalCheck.met,
        hardAskbacks,
        softAskbacks,
        findings,
        askbackReason: minimalCheck.met ? undefined : `Fehlende Pflichtdaten: ${minimalCheck.missing.join(', ')}`
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process medical evaluation for extracted data.
 *
 * This is a PURE FUNCTION with deterministic output.
 * It determines which questions MUST be asked before output can be generated.
 *
 * @param treatmentId - The treatment type
 * @param extracted - Extracted data from dictation
 * @returns MedicalResult with askbacks and findings
 */
export function processMedical(treatmentId: string, extracted: ExtractedDataV2): MedicalResult {
    switch (treatmentId) {
        case 'fuellung':
            return processFuellungMedical(extracted);
        case 'endo':
            return processEndoMedical(extracted);
        default:
            // Unknown treatment - return minimal result
            console.warn(`[MedicalEngine] Unknown treatmentId: ${treatmentId}`);
            return {
                treatmentId: treatmentId as 'fuellung' | 'endo',
                minimalDatasetMet: true,
                hardAskbacks: [],
                softAskbacks: [],
                findings: [{
                    id: `${treatmentId}.unknown_treatment`,
                    severity: 'warning',
                    message: `Unbekannte Behandlung: ${treatmentId}`
                }]
            };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

export { matrix as medicalMatrix };
