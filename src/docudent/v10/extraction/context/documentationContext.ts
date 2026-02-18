export type ContextLegacyField = 'klinischeZusatzinfos' | 'patientenangaben' | 'zusatzinfos';

export type DocumentationContextBucket = 'clinical' | 'patient' | 'administrative';
export type DocumentationContextMergeBucket = DocumentationContextBucket | 'forensicNotes' | 'unresolved';

export interface DocumentationContextMappingRule {
    keys: string[];
    target: ContextLegacyField;
    bucket: DocumentationContextBucket;
    label: string;
}

export interface DocumentationContextV1 {
    version: 'v1';
    clinical: string[];
    patient: string[];
    administrative: string[];
    forensicNotes: string[];
    unresolved: string[];
}

const DOC_CONTEXT_VERSION = 'v1' as const;

const CONTEXT_MAPPINGS: DocumentationContextMappingRule[] = [
    { keys: ['currentMedication', 'current_medication'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Medikation' },
    { keys: ['medicationChange', 'medication_change'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Medikationsaenderung' },
    { keys: ['allergies'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Allergien' },
    { keys: ['comorbidities'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Begleiterkrankungen' },
    { keys: ['anticoagulation'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Antikoagulation' },
    { keys: ['immunosuppression'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Immunsuppression' },
    { keys: ['pregnancyStatus', 'pregnancy_status'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Schwangerschaft' },
    { keys: ['infectiousRisk', 'infectious_risk'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Infektionsrisiko' },
    { keys: ['previousTreatmentOutcome', 'previous_treatment_outcome'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Vorbehandlung' },
    { keys: ['followupNeed', 'followup_need'], target: 'klinischeZusatzinfos', bucket: 'clinical', label: 'Follow-up' },
    { keys: ['patientConcern', 'patient_concern'], target: 'patientenangaben', bucket: 'patient', label: 'Patientenangabe' },
    { keys: ['patientGoal', 'patient_goal'], target: 'patientenangaben', bucket: 'patient', label: 'Patientenwunsch' },
    { keys: ['adherenceIssue', 'adherence_issue'], target: 'patientenangaben', bucket: 'patient', label: 'Adhaerenz' },
    { keys: ['familyContext', 'family_context'], target: 'patientenangaben', bucket: 'patient', label: 'Familiaerer Kontext' },
    { keys: ['socialContext', 'social_context'], target: 'patientenangaben', bucket: 'patient', label: 'Sozialer Kontext' },
    { keys: ['administrativeNote', 'administrative_note'], target: 'zusatzinfos', bucket: 'administrative', label: 'Organisatorischer Hinweis' },
];

const CONTEXT_MAPPING_LOOKUP = new Map<string, DocumentationContextMappingRule>();
for (const mapping of CONTEXT_MAPPINGS) {
    for (const key of mapping.keys) {
        CONTEXT_MAPPING_LOOKUP.set(normalizeContextKey(key), mapping);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeContextKey(value: string): string {
    return value
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[\s\-]+/g, '_');
}

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? [trimmed] : [];
    }
    return [];
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function stringArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
}

export function normalizeContextValueLines(value: unknown): string[] {
    if (value === undefined || value === null) return [];
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? [trimmed] : [];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }
    if (Array.isArray(value)) {
        return value
            .map(item => String(item).trim())
            .filter(Boolean);
    }
    if (isRecord(value)) {
        return Object.entries(value)
            .map(([key, item]) => {
                const left = key.trim();
                const right = String(item ?? '').trim();
                if (!left || !right) return '';
                return `${left}: ${right}`;
            })
            .filter(Boolean);
    }
    return [];
}

export function createDocumentationContext(): DocumentationContextV1 {
    return {
        version: DOC_CONTEXT_VERSION,
        clinical: [],
        patient: [],
        administrative: [],
        forensicNotes: [],
        unresolved: [],
    };
}

export function normalizeDocumentationContext(value: unknown): DocumentationContextV1 | undefined {
    if (!isRecord(value)) return undefined;
    const clinical = normalizeStringArray(value.clinical);
    const patient = normalizeStringArray(value.patient);
    const administrative = normalizeStringArray(value.administrative);
    const forensicNotes = normalizeStringArray(value.forensicNotes);
    const unresolved = normalizeStringArray(value.unresolved);
    if (
        clinical.length === 0
        && patient.length === 0
        && administrative.length === 0
        && forensicNotes.length === 0
        && unresolved.length === 0
    ) {
        return undefined;
    }
    return {
        version: DOC_CONTEXT_VERSION,
        clinical,
        patient,
        administrative,
        forensicNotes,
        unresolved,
    };
}

function mergeIntoContextBucket(
    context: DocumentationContextV1,
    bucket: DocumentationContextMergeBucket,
    notes: string[]
): boolean {
    const normalized = unique(notes);
    if (normalized.length === 0) return false;
    const before = context[bucket];
    const merged = unique([...before, ...normalized]);
    if (stringArraysEqual(before, merged)) return false;
    context[bucket] = merged;
    return true;
}

export function resolveDocumentationContextMapping(key: string): DocumentationContextMappingRule | undefined {
    return CONTEXT_MAPPING_LOOKUP.get(normalizeContextKey(key));
}

export function buildLabeledContextNotes(mapping: DocumentationContextMappingRule, value: unknown): string[] {
    const lines = normalizeContextValueLines(value);
    return lines.map(line => `${mapping.label}: ${line}`.trim());
}

export function buildDocumentationContextFromExtraction(extracted: Record<string, unknown>): DocumentationContextV1 {
    const base = createDocumentationContext();
    const normalized = normalizeDocumentationContext(extracted.documentationContext);
    if (normalized) {
        mergeIntoContextBucket(base, 'clinical', normalized.clinical);
        mergeIntoContextBucket(base, 'patient', normalized.patient);
        mergeIntoContextBucket(base, 'administrative', normalized.administrative);
        mergeIntoContextBucket(base, 'forensicNotes', normalized.forensicNotes);
        mergeIntoContextBucket(base, 'unresolved', normalized.unresolved);
    }

    mergeIntoContextBucket(base, 'clinical', normalizeStringArray(extracted.klinischeZusatzinfos));
    mergeIntoContextBucket(base, 'patient', normalizeStringArray(extracted.patientenangaben));
    mergeIntoContextBucket(base, 'administrative', normalizeStringArray(extracted.zusatzinfos));

    if (isRecord(extracted.reasoning)) {
        mergeIntoContextBucket(base, 'forensicNotes', normalizeStringArray(extracted.reasoning.forensicNotes));
        mergeIntoContextBucket(base, 'unresolved', normalizeStringArray(extracted.reasoning.unresolved));
    }

    return base;
}

export function mergeNotesIntoDocumentationContext(
    context: DocumentationContextV1,
    bucket: DocumentationContextMergeBucket,
    notes: string[]
): boolean {
    return mergeIntoContextBucket(context, bucket, notes);
}

export function collectSharedForensicNotes(sharedFacts: Record<string, unknown>): string[] {
    return unique([
        ...normalizeStringArray(sharedFacts.forensicNotes),
        ...normalizeStringArray(sharedFacts.forensic_notes),
        ...normalizeStringArray(sharedFacts.contextNotes),
        ...normalizeStringArray(sharedFacts.context_notes),
    ]);
}

export function collectSharedUnresolvedNotes(sharedFacts: Record<string, unknown>): string[] {
    return unique([
        ...normalizeStringArray(sharedFacts.unresolved),
        ...normalizeStringArray(sharedFacts.unresolvedForensicHints),
        ...normalizeStringArray(sharedFacts.unresolved_forensic_hints),
    ]);
}

export function syncDocumentationContextToExtraction(
    extracted: Record<string, unknown>,
    contextInput?: DocumentationContextV1
): string[] {
    const context = contextInput ?? buildDocumentationContextFromExtraction(extracted);
    const appliedKeys: string[] = [];
    const normalizedContext = {
        version: DOC_CONTEXT_VERSION,
        clinical: unique(context.clinical),
        patient: unique(context.patient),
        administrative: unique(context.administrative),
        forensicNotes: unique(context.forensicNotes),
        unresolved: unique(context.unresolved),
    } satisfies DocumentationContextV1;

    const existingContext = normalizeDocumentationContext(extracted.documentationContext);
    const contextChanged =
        !existingContext
        || !stringArraysEqual(existingContext.clinical, normalizedContext.clinical)
        || !stringArraysEqual(existingContext.patient, normalizedContext.patient)
        || !stringArraysEqual(existingContext.administrative, normalizedContext.administrative)
        || !stringArraysEqual(existingContext.forensicNotes, normalizedContext.forensicNotes)
        || !stringArraysEqual(existingContext.unresolved, normalizedContext.unresolved);
    if (contextChanged) {
        extracted.documentationContext = normalizedContext;
        appliedKeys.push('documentationContext');
    }

    const clinicalLegacy = normalizedContext.clinical;
    const patientLegacy = unique([...normalizedContext.patient, ...normalizedContext.forensicNotes]);
    const administrativeLegacy = normalizedContext.administrative;

    const existingClinical = normalizeStringArray(extracted.klinischeZusatzinfos);
    if (!stringArraysEqual(existingClinical, clinicalLegacy)) {
        extracted.klinischeZusatzinfos = clinicalLegacy;
        appliedKeys.push('klinischeZusatzinfos');
    }

    const existingPatient = normalizeStringArray(extracted.patientenangaben);
    if (!stringArraysEqual(existingPatient, patientLegacy)) {
        extracted.patientenangaben = patientLegacy;
        appliedKeys.push('patientenangaben');
    }

    const existingAdministrative = normalizeStringArray(extracted.zusatzinfos);
    if (!stringArraysEqual(existingAdministrative, administrativeLegacy)) {
        extracted.zusatzinfos = administrativeLegacy;
        appliedKeys.push('zusatzinfos');
    }

    const reasoning = isRecord(extracted.reasoning)
        ? { ...extracted.reasoning }
        : { version: DOC_CONTEXT_VERSION };
    const existingForensicNotes = normalizeStringArray(reasoning.forensicNotes);
    if (!stringArraysEqual(existingForensicNotes, normalizedContext.forensicNotes)) {
        if (normalizedContext.forensicNotes.length > 0) {
            reasoning.forensicNotes = normalizedContext.forensicNotes;
        } else {
            delete reasoning.forensicNotes;
        }
        appliedKeys.push('reasoning.forensicNotes');
    }
    const existingUnresolved = normalizeStringArray(reasoning.unresolved);
    if (!stringArraysEqual(existingUnresolved, normalizedContext.unresolved)) {
        if (normalizedContext.unresolved.length > 0) {
            reasoning.unresolved = normalizedContext.unresolved;
        } else {
            delete reasoning.unresolved;
        }
        appliedKeys.push('reasoning.unresolved');
    }
    if (isRecord(reasoning) && Object.keys(reasoning).length > 0) {
        extracted.reasoning = reasoning;
    }

    return appliedKeys;
}

