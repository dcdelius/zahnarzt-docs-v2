/**
 * Filling Canonical Vocabulary — SSOT for Restorative Dentistry
 *
 * ═══════════════════════════════════════════════════════════════
 * All canonical codes, German labels, and helper functions for
 * filling/restorative dentistry domain.
 * 
 * HARD RULE: DB payloads must only contain these canonical codes.
 *            Renderer maps codes → German labels.
 * ═══════════════════════════════════════════════════════════════
 */

import { registerDomainVocab, type DomainVocab } from '../../questionEngine/vocabRegistry';

// ═══════════════════════════════════════════════════════════════
// B1) SURFACE CODES
// ═══════════════════════════════════════════════════════════════

export const SURFACE_CODES = [
    'O', 'M', 'D', 'B', 'L', 'I', 'P',
    'MO', 'OD', 'MOD', 'MODB', 'MODBL', 'MB', 'DB', 'ML', 'DL',
    'OB', 'OL', 'BOL', 'ALL',
] as const;

export type SurfaceCode = typeof SURFACE_CODES[number];

export const SURFACE_LABELS: Record<SurfaceCode, string> = {
    'O': 'okklusal',
    'M': 'mesial',
    'D': 'distal',
    'B': 'bukkal',
    'L': 'lingual',
    'I': 'inzisal',
    'P': 'palatinal',
    'MO': 'mesio-okklusal',
    'OD': 'okkluso-distal',
    'MOD': 'mesio-okkluso-distal',
    'MODB': 'mesio-okkluso-disto-bukkal',
    'MODBL': 'mesio-okkluso-disto-bukko-lingual',
    'MB': 'mesio-bukkal',
    'DB': 'disto-bukkal',
    'ML': 'mesio-lingual',
    'DL': 'disto-lingual',
    'OB': 'okkluso-bukkal',
    'OL': 'okkluso-lingual',
    'BOL': 'bukko-okkluso-lingual',
    'ALL': 'allseitig',
};

// ═══════════════════════════════════════════════════════════════
// B2) MATERIAL CODES
// ═══════════════════════════════════════════════════════════════

export const MATERIAL_CODES = [
    'COMPOSITE',
    'GIC',
    'AMALGAM',
    'TEMPORARY',
    'COMPOMER',
    'OTHER',
] as const;

export type MaterialCode = typeof MATERIAL_CODES[number];

export const MATERIAL_LABELS: Record<MaterialCode, string> = {
    'COMPOSITE': 'Komposit',
    'GIC': 'Glasionomer',
    'AMALGAM': 'Amalgam',
    'TEMPORARY': 'provisorische Füllung',
    'COMPOMER': 'Kompomer',
    'OTHER': 'Sonstiges Material',
};

// ═══════════════════════════════════════════════════════════════
// B3) ADHESIVE MODE CODES
// ═══════════════════════════════════════════════════════════════

export const ADHESIVE_MODE_CODES = [
    'ETCH_AND_RINSE',
    'SELF_ETCH',
    'SELECTIVE_ETCH',
    'NONE',
] as const;

export type AdhesiveModeCode = typeof ADHESIVE_MODE_CODES[number];

export const ADHESIVE_MODE_LABELS: Record<AdhesiveModeCode, string> = {
    'ETCH_AND_RINSE': 'Etch-and-Rinse',
    'SELF_ETCH': 'Self-Etch',
    'SELECTIVE_ETCH': 'selektive Schmelzätzung',
    'NONE': 'keine Adhäsivtechnik',
};

// ═══════════════════════════════════════════════════════════════
// B4) ANESTHESIA CODES
// ═══════════════════════════════════════════════════════════════

export const ANESTHESIA_CODES = [
    'NONE',
    'INFILTRATION',
    'CONDUCTION',
    'COMBINED',
] as const;

export type AnesthesiaCode = typeof ANESTHESIA_CODES[number];

export const ANESTHESIA_LABELS: Record<AnesthesiaCode, string> = {
    'NONE': 'ohne Anästhesie',
    'INFILTRATION': 'Infiltrationsanästhesie',
    'CONDUCTION': 'Leitungsanästhesie',
    'COMBINED': 'kombinierte Anästhesie',
};

// ═══════════════════════════════════════════════════════════════
// B5) ISOLATION CODES
// ═══════════════════════════════════════════════════════════════

export const ISOLATION_CODES = [
    'RUBBER_DAM',
    'RELATIVE',
    'NONE',
] as const;

export type IsolationCode = typeof ISOLATION_CODES[number];

export const ISOLATION_LABELS: Record<IsolationCode, string> = {
    'RUBBER_DAM': 'Kofferdam',
    'RELATIVE': 'relative Trockenlegung',
    'NONE': 'keine Isolation',
};

// ═══════════════════════════════════════════════════════════════
// B6) CARIES DEPTH CODES
// ═══════════════════════════════════════════════════════════════

export const CARIES_DEPTH_CODES = [
    'SUPERFICIAL',
    'MEDIUM',
    'DEEP',
    'PULP_PROXIMAL',
] as const;

export type CariesDepthCode = typeof CARIES_DEPTH_CODES[number];

export const CARIES_DEPTH_LABELS: Record<CariesDepthCode, string> = {
    'SUPERFICIAL': 'oberflächliche Karies',
    'MEDIUM': 'mittlere Karies',
    'DEEP': 'tiefe Dentinkaries',
    'PULP_PROXIMAL': 'pulpanahe Karies',
};

// ═══════════════════════════════════════════════════════════════
// B7) BILLING MODE CODES
// ═══════════════════════════════════════════════════════════════

export const BILLING_MODE_CODES = [
    'GKV_ONLY',
    'GKV_PLUS_PRIVATE',
    'PRIVATE_ONLY',
] as const;

export type BillingModeCode = typeof BILLING_MODE_CODES[number];

export const BILLING_MODE_LABELS: Record<BillingModeCode, string> = {
    'GKV_ONLY': 'GKV-Leistung',
    'GKV_PLUS_PRIVATE': 'GKV + Mehrkostenvereinbarung',
    'PRIVATE_ONLY': 'Privatleistung',
};

// ═══════════════════════════════════════════════════════════════
// DEVIATION REASON CODES (for filling deviations)
// ═══════════════════════════════════════════════════════════════

export const FILLING_DEVIATION_CODES = [
    'PULP_EXPOSURE',
    'TIME_CONSTRAINT',
    'PATIENT_PREFERENCE',
    'MATERIAL_UNAVAILABLE',
    'OTHER',
] as const;

export type FillingDeviationCode = typeof FILLING_DEVIATION_CODES[number];

export const FILLING_DEVIATION_LABELS: Record<FillingDeviationCode, string> = {
    'PULP_EXPOSURE': 'Pulpaeröffnung',
    'TIME_CONSTRAINT': 'Zeitmangel',
    'PATIENT_PREFERENCE': 'Patientenwunsch',
    'MATERIAL_UNAVAILABLE': 'Material nicht verfügbar',
    'OTHER': 'Sonstiges',
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function toSurfaceLabel(code: SurfaceCode): string {
    return SURFACE_LABELS[code] ?? code;
}

export function toMaterialLabel(code: MaterialCode): string {
    return MATERIAL_LABELS[code] ?? code;
}

export function toAdhesiveModeLabel(code: AdhesiveModeCode): string {
    return ADHESIVE_MODE_LABELS[code] ?? code;
}

export function toAnesthesiaLabel(code: AnesthesiaCode): string {
    return ANESTHESIA_LABELS[code] ?? code;
}

export function toIsolationLabel(code: IsolationCode): string {
    return ISOLATION_LABELS[code] ?? code;
}

export function toCariesDepthLabel(code: CariesDepthCode): string {
    return CARIES_DEPTH_LABELS[code] ?? code;
}

export function toBillingModeLabel(code: BillingModeCode): string {
    return BILLING_MODE_LABELS[code] ?? code;
}

export function isValidSurfaceCode(code: string): code is SurfaceCode {
    return SURFACE_CODES.includes(code as SurfaceCode);
}

export function isValidMaterialCode(code: string): code is MaterialCode {
    return MATERIAL_CODES.includes(code as MaterialCode);
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATED VOCABULARY
// ═══════════════════════════════════════════════════════════════

export const FILLING_VOCAB = {
    surfaces: { codes: SURFACE_CODES, labels: SURFACE_LABELS },
    materials: { codes: MATERIAL_CODES, labels: MATERIAL_LABELS },
    adhesiveModes: { codes: ADHESIVE_MODE_CODES, labels: ADHESIVE_MODE_LABELS },
    anesthesia: { codes: ANESTHESIA_CODES, labels: ANESTHESIA_LABELS },
    isolation: { codes: ISOLATION_CODES, labels: ISOLATION_LABELS },
    cariesDepth: { codes: CARIES_DEPTH_CODES, labels: CARIES_DEPTH_LABELS },
    billingMode: { codes: BILLING_MODE_CODES, labels: BILLING_MODE_LABELS },
    deviation: { codes: FILLING_DEVIATION_CODES, labels: FILLING_DEVIATION_LABELS },
} as const;

// ═══════════════════════════════════════════════════════════════
// REGISTER WITH GLOBAL REGISTRY
// ═══════════════════════════════════════════════════════════════

const FILLING_DOMAIN_VOCAB: DomainVocab = {
    domain: 'filling',
    fields: {
        surfaces: { codes: SURFACE_CODES, labels: SURFACE_LABELS },
        material: { codes: MATERIAL_CODES, labels: MATERIAL_LABELS },
        adhesiveMode: { codes: ADHESIVE_MODE_CODES, labels: ADHESIVE_MODE_LABELS },
        anesthesia: { codes: ANESTHESIA_CODES, labels: ANESTHESIA_LABELS },
        isolation: { codes: ISOLATION_CODES, labels: ISOLATION_LABELS },
        cariesDepth: { codes: CARIES_DEPTH_CODES, labels: CARIES_DEPTH_LABELS },
        billingMode: { codes: BILLING_MODE_CODES, labels: BILLING_MODE_LABELS },
        fillingDeviationReason: { codes: FILLING_DEVIATION_CODES, labels: FILLING_DEVIATION_LABELS },
    },
};

// Auto-register when module is imported
registerDomainVocab(FILLING_DOMAIN_VOCAB);

export { FILLING_DOMAIN_VOCAB };
