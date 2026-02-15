import { TemplateV3, TemplateField } from '../../types/templateV3';
import {
    Source,
    FieldClass,
    FieldValue,
    FIELD_THRESHOLDS,
    FIELD_CLASSES
} from '../behandlungen/_shared/types';

// ========================================
// CONFIDENCE MODEL (V1 - Deterministic)
// ========================================

/**
 * Berechnet Confidence deterministisch basierend auf:
 * - Source (user=1.0, dictation=basierend auf evidence, default=0.5)
 * - Evidence-Qualität (Länge, Anzahl)
 * - Feld-Typ
 */
export function scoreConfidence(
    fieldId: string,
    value: any,
    evidence: string[] | undefined,
    source: Source
): number {
    // User-Eingabe hat immer volle Confidence
    if (source === 'user') return 1.0;

    // Default-Werte haben niedrige Confidence (müssen bestätigt werden)
    if (source === 'default') return 0.5;

    // Inferred-Werte haben sehr niedrige Confidence
    if (source === 'inferred') return 0.3;

    // Dictation: Confidence basiert auf Evidence-Qualität
    if (source === 'dictation') {
        let confidence = 0.6; // Basis

        if (evidence && evidence.length > 0) {
            // Mehr Evidence = höhere Confidence
            confidence += Math.min(evidence.length * 0.1, 0.2);

            // Längere Evidence = höhere Confidence
            const avgLength = evidence.reduce((sum, e) => sum + e.length, 0) / evidence.length;
            if (avgLength > 10) confidence += 0.1;
            if (avgLength > 20) confidence += 0.1;
        }

        // Value vorhanden und nicht leer
        if (value !== null && value !== undefined && value !== '') {
            confidence += 0.05;
        }

        return Math.min(confidence, 1.0);
    }

    return 0.5; // Fallback
}

/**
 * Gibt den Threshold für ein Feld zurück
 */
export function getThresholdForField(fieldId: string): number {
    const fieldClass = FIELD_CLASSES[fieldId] || 'prozess';
    return FIELD_THRESHOLDS[fieldClass];
}

/**
 * Prüft ob Confirmation erforderlich ist
 */
export function needsConfirmation(fieldId: string, confidence: number): boolean {
    const threshold = getThresholdForField(fieldId);
    return confidence < threshold;
}

/**
 * Wendet Confidence auf extrahierte Daten an
 * Wandelt raw extracted data in FieldValue<T> Struktur um
 */
export interface ExtractedWithConfidence {
    [fieldId: string]: FieldValue<any>;
}

export interface RawExtractionWithEvidence {
    [fieldId: string]: {
        value: any;
        evidence?: string[];
    };
}

export function applyConfidenceToExtraction(
    rawExtraction: RawExtractionWithEvidence,
    defaultValues: Record<string, any> = {}
): ExtractedWithConfidence {
    const result: ExtractedWithConfidence = {};

    // Verarbeite extrahierte Werte
    for (const [fieldId, data] of Object.entries(rawExtraction)) {
        const source: Source = 'dictation';
        const confidence = scoreConfidence(fieldId, data.value, data.evidence, source);

        result[fieldId] = {
            value: data.value,
            source,
            confidence,
            evidence: data.evidence,
            needsConfirmation: needsConfirmation(fieldId, confidence)
        };
    }

    // Füge Defaults hinzu für nicht-extrahierte Felder
    for (const [fieldId, value] of Object.entries(defaultValues)) {
        if (!result[fieldId]) {
            const source: Source = 'default';
            const confidence = scoreConfidence(fieldId, value, undefined, source);

            result[fieldId] = {
                value,
                source,
                confidence,
                evidence: undefined,
                needsConfirmation: needsConfirmation(fieldId, confidence)
            };
        }
    }

    return result;
}

/**
 * Normalizes extracted data to canonical formats based on template definitions.
 * Handles synonyms, surface notation, FDI validation, etc.
 */

// Synonym maps for common variations
const ANESTHESIA_SYNONYMS: Record<string, string> = {
    'ILA': 'Infiltration',
    'Infiltrationsanästhesie': 'Infiltration',
    'Oberflächenanästhesie': 'Infiltration',
    'LA': 'Leitung',
    'Leitungsanästhesie': 'Leitung',
    'Leitungsanästh': 'Leitung',
    'intraliegamentär': 'Intraligamentär',
    'keine Spritze': 'Keine',
    'ohne Spritze': 'Keine',
    'ohne Anästhesie': 'Keine',
    'keine': 'Keine'
};

const ISOLATION_SYNONYMS: Record<string, string> = {
    'Trockenlegung': 'Relativ',
    'relativ': 'Relativ',
    'Watterollen': 'Watterollen',
    'KD': 'Kofferdam',
    'Koff': 'Kofferdam',
    'Spanngummi': 'Kofferdam'
};

/**
 * Validates and normalizes FDI tooth notation
 */
function normalizeTooth(value: any): string | null {
    if (!value) return null;

    const str = String(value).replace(/[.\s]/g, ''); // Remove dots, spaces
    const num = parseInt(str, 10);

    // Valid FDI: 11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85
    if (num >= 11 && num <= 18) return str;
    if (num >= 21 && num <= 28) return str;
    if (num >= 31 && num <= 38) return str;
    if (num >= 41 && num <= 48) return str;
    if (num >= 51 && num <= 55) return str;
    if (num >= 61 && num <= 65) return str;
    if (num >= 71 && num <= 75) return str;
    if (num >= 81 && num <= 85) return str;

    return null; // Invalid FDI
}

/**
 * Normalizes surfaces notation
 * Accepts: "mod", "MOD", "m,o,d", ["m", "o", "d"], etc.
 */
function normalizeSurfaces(value: any, allowedSurfaces: string[]): string[] | null {
    if (!value) return null;
    if (Array.isArray(value)) {
        return value
            .map(s => String(s).toLowerCase().trim())
            .filter(s => allowedSurfaces.includes(s));
    }

    // String: "mod" or "m,o,d" or "m o d"
    const str = String(value).toLowerCase().replace(/[,\s]+/g, '');
    const surfaces = str.split('').filter(s => allowedSurfaces.includes(s));

    return surfaces.length > 0 ? surfaces : null;
}

/**
 * Normalizes enum value using synonym map
 */
function normalizeEnum(value: any, synonymMap: Record<string, string>, allowedValues: string[]): string | null {
    if (!value) return null;

    const str = String(value).trim();

    // Direct match (case-insensitive)
    const directMatch = allowedValues.find(v => v.toLowerCase() === str.toLowerCase());
    if (directMatch) return directMatch;

    // Synonym match
    const synonym = synonymMap[str];
    if (synonym && allowedValues.includes(synonym)) return synonym;

    // Partial match (e.g. "Leitung" in "Leitungsanästhesie")
    for (const allowed of allowedValues) {
        if (str.toLowerCase().includes(allowed.toLowerCase())) return allowed;
    }

    return null; // No match
}

export interface NormalizationWarning {
    field: string;
    original: any;
    normalized: any;
    reason: string;
}

export function normalizeExtractedData(
    template: TemplateV3,
    extracted: Record<string, any>
): { normalized: Record<string, any>; warnings: NormalizationWarning[] } {
    const normalized: Record<string, any> = {};
    const warnings: NormalizationWarning[] = [];

    template.fields.forEach((field: TemplateField) => {
        const value = extracted[field.id];
        if (value === undefined || value === null) {
            // Field not extracted, skip
            return;
        }

        let normalizedValue = value;

        switch (field.type) {
            case 'string':
            case 'text':
                // Special handling for tooth field
                if (field.id === 'tooth' || field.id.toLowerCase().includes('zahn')) {
                    const tooth = normalizeTooth(value);
                    if (tooth === null && value) {
                        warnings.push({
                            field: field.id,
                            original: value,
                            normalized: null,
                            reason: `Invalid FDI notation: "${value}"`
                        });
                    }
                    normalizedValue = tooth;
                } else {
                    normalizedValue = String(value).trim();
                }
                break;

            case 'enum':
                if (!field.options || field.options.length === 0) {
                    normalizedValue = String(value).trim();
                    break;
                }

                // Apply synonym map based on field name
                let synonymMap: Record<string, string> = {};
                if (field.id.toLowerCase().includes('anesth') || field.id.toLowerCase().includes('anästh')) {
                    synonymMap = ANESTHESIA_SYNONYMS;
                } else if (field.id.toLowerCase().includes('isolation') || field.id.toLowerCase().includes('trocken')) {
                    synonymMap = ISOLATION_SYNONYMS;
                }

                const enumValue = normalizeEnum(value, synonymMap, field.options);
                if (enumValue === null && value) {
                    warnings.push({
                        field: field.id,
                        original: value,
                        normalized: null,
                        reason: `"${value}" is not in allowed values: [${field.options.join(', ')}]`
                    });
                }
                normalizedValue = enumValue;
                break;

            case 'multiselect':
                if (!field.options || field.options.length === 0) {
                    normalizedValue = Array.isArray(value) ? value : [value];
                    break;
                }

                // Special handling for surfaces
                if (field.id === 'surfaces' || field.id.toLowerCase().includes('fläch')) {
                    const surfaces = normalizeSurfaces(value, field.options);
                    if (surfaces === null && value) {
                        warnings.push({
                            field: field.id,
                            original: value,
                            normalized: null,
                            reason: `Could not normalize surfaces: "${value}"`
                        });
                    }
                    normalizedValue = surfaces;
                } else {
                    // Generic multiselect
                    const arr = Array.isArray(value) ? value : [value];
                    normalizedValue = arr.filter(v => field.options?.includes(String(v)));

                    const invalid = arr.filter(v => !field.options?.includes(String(v)));
                    if (invalid.length > 0) {
                        warnings.push({
                            field: field.id,
                            original: value,
                            normalized: normalizedValue,
                            reason: `Filtered invalid values: [${invalid.join(', ')}]`
                        });
                    }
                }
                break;

            case 'boolean':
                // Normalize to true/false
                if (typeof value === 'boolean') {
                    normalizedValue = value;
                } else {
                    const str = String(value).toLowerCase();
                    if (str === 'true' || str === 'ja' || str === 'yes' || str === '1') {
                        normalizedValue = true;
                    } else if (str === 'false' || str === 'nein' || str === 'no' || str === '0') {
                        normalizedValue = false;
                    } else {
                        normalizedValue = null;
                        warnings.push({
                            field: field.id,
                            original: value,
                            normalized: null,
                            reason: `Could not parse boolean from: "${value}"`
                        });
                    }
                }
                break;

            case 'number':
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(num)) {
                    normalizedValue = null;
                    warnings.push({
                        field: field.id,
                        original: value,
                        normalized: null,
                        reason: `Could not parse number from: "${value}"`
                    });
                } else {
                    normalizedValue = num;
                }
                break;
        }

        // Only set if not null
        if (normalizedValue !== null) {
            normalized[field.id] = normalizedValue;
        }
    });

    // Explicitly preserve dictationExtras if present
    if (extracted.dictationExtras && Array.isArray(extracted.dictationExtras)) {
        normalized.dictationExtras = extracted.dictationExtras;
    }

    // Preserve critical fields that may not be in template
    // These are always extracted by the LLM even without template definition
    if (extracted.costs && !normalized.costs) {
        normalized.costs = String(extracted.costs).replace(/[^\d]/g, ''); // Only digits
    }
    if (extracted.kosten && !normalized.costs) {
        normalized.costs = String(extracted.kosten).replace(/[^\d]/g, '');
    }
    if (extracted.tooth && !normalized.tooth) {
        const tooth = normalizeTooth(extracted.tooth);
        if (tooth) normalized.tooth = tooth;
    }
    if (extracted.surfaces && !normalized.surfaces) {
        const surfaces = normalizeSurfaces(extracted.surfaces, ['m', 'o', 'd', 'b', 'l', 'p', 'v', 'i']);
        if (surfaces) normalized.surfaces = surfaces;
    }
    if (extracted.diagnosis && !normalized.diagnosis) {
        normalized.diagnosis = String(extracted.diagnosis);
    }

    return { normalized, warnings };
}
