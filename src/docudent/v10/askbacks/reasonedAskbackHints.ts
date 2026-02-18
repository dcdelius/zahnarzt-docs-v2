import type { ReasonedExtractionV1 } from '@/docudent/contracts/extractionV6';

import type { TreatmentFacts } from '../facts';
import { buildDocumentationContextFromExtraction } from '../extraction/context/documentationContext';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';
import { isFactKnownForAskback } from '../settings/settingsResolver';

export interface ReasonedAskbackHints {
    required: string[];
    optional: string[];
    priorities: Map<string, number>;
    provenance: Array<{
        askbackId: string;
        ruleId: string;
    }>;
}

const FACT_KEY_TO_ASKBACK_ID: Record<string, string> = {
    la_type: 'la_type',
    anesthesia: 'la_type',
    vitality: 'vitality',
    percussion: 'percussion',
    isolation: 'isolation',
    kofferdam: 'isolation',
    capping: 'ueberkappung',
    ueberkappung: 'ueberkappung',
    ueberkappung_material: 'ueberkappung_material',
    material: 'material',
    fissuren_indikation: 'fissuren_indikation',
    fissuren_material: 'fissuren_material',
    crown_prep_preparation: 'crown_prep_preparation',
    crown_prep_impression: 'crown_prep_impression',
    crown_prep_provisional: 'crown_prep_provisional',
    working_length_method: 'wl_method',
    wl_method: 'wl_method',
    wf_technique: 'wf_technique',
    irrigation: 'irrigation',
    irrigation_solutions: 'irrigation',
    medication: 'medication',
    endo_medication: 'medication',
    canal_count: 'canal_count',
    root_canals: 'canal_count',
    layering: 'layering',
    adhesive: 'adhesive_technique',
    adhesive_technique: 'adhesive_technique',
    hemostasis: 'hemostasis',
    sensitivity_followup: 'sensitivity_followup',
    wound_care: 'wound_care',
    radiology_indication: 'radiology_indication',
    radiology_type: 'radiology_type',
    radiology_timing: 'radiology_timing',
    radiology_findings: 'radiology_findings',
    parodontologie_phase: 'parodontologie_phase',
    parodontologie_upt_grad: 'parodontologie_upt_grad',
    upt_grad: 'upt_grad',
    upt_intervall: 'upt_intervall',
    krone_art: 'krone_art',
    krone_eingliederung: 'krone_eingliederung',
    teilkrone_art: 'teilkrone_art',
    teilkrone_eingliederung: 'teilkrone_eingliederung',
    bruecke_typ: 'bruecke_typ',
    bruecke_phase: 'bruecke_phase',
    trauma_art: 'trauma_art',
    trauma_schienung: 'trauma_schienung',
    trauma_kontrolle: 'trauma_kontrolle',
    implant_phase: 'implant_phase',
    implant_nachsorge: 'implant_nachsorge',
    schiene_typ: 'schiene_typ',
    schiene_phase: 'schiene_phase',
    teilprothese_typ: 'teilprothese_typ',
    teilprothese_phase: 'teilprothese_phase',
    totalprothese_typ: 'totalprothese_typ',
    totalprothese_phase: 'totalprothese_phase',
    wsr_zugang: 'wsr_zugang',
    wsr_lokalisation: 'wsr_lokalisation',
    untersuchung_anlass: 'untersuchung_anlass',
    untersuchung_befunde: 'untersuchung_befunde',
    untersuchung_beurteilung: 'untersuchung_beurteilung',
};

const UNRESOLVED_KEYWORD_HINTS: Array<{ pattern: RegExp; askbackId: string }> = [
    { pattern: /(arbeitsl(ä|ae|a)ng|wl|l(ä|ae|a)ngenbestimmung|apex)/i, askbackId: 'wl_method' },
    { pattern: /(wurzelf(ü|u)ll|obturation|technik|warm|kalt|single[- ]?cone)/i, askbackId: 'wf_technique' },
    { pattern: /(sp(ü|u)l|irrigation|naocl|edta|chx)/i, askbackId: 'irrigation' },
    { pattern: /(kanal|wurzelkanal|mb|ml|db|dl|pal)/i, askbackId: 'canal_count' },
    { pattern: /(an(a|ä)sthes|leitung|infiltr|ila)/i, askbackId: 'la_type' },
    { pattern: /(kofferdam|isolation|trockenlegung|watterolle)/i, askbackId: 'isolation' },
    { pattern: /(vipr|vital)/i, askbackId: 'vitality' },
    { pattern: /(perkussion|perk|klopf)/i, askbackId: 'percussion' },
    { pattern: /(überkapp|ueberkapp|pulpa)/i, askbackId: 'ueberkappung' },
    { pattern: /(material|komposit|giz|adh(a|ä)siv|amalgam)/i, askbackId: 'material' },
    { pattern: /(roentgen|r(ö|o)ntgen|opg|zahnfilm|bissfl(ü|u)gel)/i, askbackId: 'radiology_type' },
    { pattern: /(indikation|rechtfertigung|begründung)/i, askbackId: 'radiology_indication' },
    { pattern: /(hemostase|blutstill|blutung)/i, askbackId: 'hemostasis' },
    { pattern: /(empfindlich|sensitivity|hypersens)/i, askbackId: 'sensitivity_followup' },
];

function normalizeHintKey(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[\s\-]+/g, '_');
}

function mapHintKeyToAskbackId(rawKey: string): string | undefined {
    const normalized = normalizeHintKey(rawKey);
    return FACT_KEY_TO_ASKBACK_ID[normalized];
}

function pushUnique(
    target: string[],
    seen: Set<string>,
    askbackId: string
): void {
    const normalized = normalizeAskbackId(askbackId);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    target.push(askbackId);
}

function getReasonedFromExtraction(extracted: Record<string, unknown>): ReasonedExtractionV1 | undefined {
    const value = extracted.reasoning;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as ReasonedExtractionV1;
}

function withPriority(current: Map<string, number>, askbackId: string, priority: number): void {
    const key = normalizeAskbackId(askbackId);
    const existing = current.get(key);
    if (existing === undefined || priority < existing) {
        current.set(key, priority);
    }
}

/**
 * Derives additional askback candidates from reasoned extraction hints.
 * This never mutates facts and never bypasses existing fact-known checks.
 */
export function deriveReasonedAskbackHints(
    extracted: Record<string, unknown>,
    facts: TreatmentFacts
): ReasonedAskbackHints {
    const reasoning = getReasonedFromExtraction(extracted);
    const documentationContext = buildDocumentationContextFromExtraction(extracted);
    const unresolvedCandidates = Array.from(new Set([
        ...(reasoning?.unresolved ?? []),
        ...documentationContext.unresolved,
    ]));
    if (!reasoning && unresolvedCandidates.length === 0) {
        return { required: [], optional: [], priorities: new Map(), provenance: [] };
    }

    const required: string[] = [];
    const optional: string[] = [];
    const requiredSeen = new Set<string>();
    const optionalSeen = new Set<string>();
    const priorities = new Map<string, number>();
    const provenance = new Map<string, { askbackId: string; ruleId: string }>();

    const upsertProvenance = (askbackId: string, ruleId: string) => {
        const normalized = normalizeAskbackId(askbackId);
        if (!provenance.has(normalized)) {
            provenance.set(normalized, { askbackId, ruleId });
        }
    };

    for (const hint of reasoning?.factHints ?? []) {
        if (!hint || typeof hint !== 'object') continue;
        const askbackId = mapHintKeyToAskbackId(String(hint.key ?? ''));
        if (!askbackId) continue;
        if (isFactKnownForAskback(askbackId, facts)) continue;

        const confidence = typeof hint.confidence === 'number' && Number.isFinite(hint.confidence)
            ? Math.max(0, Math.min(1, hint.confidence))
            : 0.5;
        const basis = hint.basis === 'inferred' ? 'inferred' : 'explicit';
        const mustConfirm = hint.requiresConfirmation === true
            || basis === 'inferred'
            || confidence < 0.75;
        const priority = mustConfirm ? 0 : 1;

        if (mustConfirm) {
            pushUnique(required, requiredSeen, askbackId);
        } else {
            pushUnique(optional, optionalSeen, askbackId);
        }
        withPriority(priorities, askbackId, priority);
        upsertProvenance(askbackId, `reasoned:fact_hint:${normalizeHintKey(String(hint.key ?? ''))}`);
    }

    for (const unresolvedEntry of unresolvedCandidates) {
        const unresolved = String(unresolvedEntry ?? '').trim();
        if (!unresolved) continue;
        const matchedIds = UNRESOLVED_KEYWORD_HINTS
            .filter(entry => entry.pattern.test(unresolved))
            .map(entry => entry.askbackId);

        for (const askbackId of matchedIds) {
            if (isFactKnownForAskback(askbackId, facts)) continue;
            pushUnique(required, requiredSeen, askbackId);
            withPriority(priorities, askbackId, 0);
            const provenancePrefix = reasoning?.unresolved?.includes(unresolvedEntry)
                ? 'reasoned:unresolved'
                : 'reasoned:context_unresolved';
            upsertProvenance(askbackId, `${provenancePrefix}:${normalizeAskbackId(askbackId)}`);
        }
    }

    return {
        required,
        optional,
        priorities,
        provenance: Array.from(provenance.values()),
    };
}

/**
 * Deterministic askback ordering:
 * 1. lower priority score first
 * 2. normalized askback id lexical order
 */
export function orderAskbacksDeterministically(
    askbacks: string[],
    priorities?: Map<string, number>
): string[] {
    return [...askbacks].sort((left, right) => {
        const leftId = normalizeAskbackId(left);
        const rightId = normalizeAskbackId(right);
        const leftPriority = priorities?.get(leftId) ?? 100;
        const rightPriority = priorities?.get(rightId) ?? 100;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return leftId.localeCompare(rightId);
    });
}
