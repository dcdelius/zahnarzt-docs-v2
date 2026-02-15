/**
 * Output Composer — Template-Driven Text Rendering (SSOT)
 * 
 * SSOT Sources (only these are allowed):
 * - chip.textSnippets (Leistungen, Behandlung)
 * - disclosures (Aufklärung, MKV, PostOP)
 * - rules/auditWarnings (Warnungen)
 * - mappings/fuellung_finding_map.json (Befund)
 * - Neutral connectors/phrasebank (no fachliche meaning)
 * 
 * Templates define ONLY layout and slots, no fachliche content.
 * 
 * Each section tracks evidenceRefs[] for full traceability.
 */

import type { ProcessingResult, ChipDefinition } from './treatmentEngine';
import { type ValidationWarning, createWarningFromString } from '../../../../contracts/warnings';

// Aufklärung Registry (SSOT-safe contextual clauses)
import {
    FUELLUNG_AUFKLAERUNG_CLAUSES,
    buildAufklaerungFromClauses,
    type VerbosityLevel,
} from '../registry/aufklaerungRegistry';

// Settings Store (aufklaerungEnabled toggle)

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// Treatment labels for header display (SSOT)
const TREATMENT_LABELS: Record<string, string> = {
    fuellung: 'Kompositfüllung',
    endo: 'Wurzelbehandlung',
    crown_prep: 'Kronenversorgung',
    extraction: 'Extraktion',
    pzr: 'Professionelle Zahnreinigung',
};

const CANONICAL_SECTION_ORDER = [
    'befund',
    'aufklaerung',
    'behandlung',
    'leistungen',
    'hinweise',
    'abrechnung',
] as const;

// Billing reason enum for diagnostics
export type BillingReasonCode =
    | 'RULES_DB_UNAVAILABLE'
    | 'BILLING_GATED_MISSING_ANSWERS'
    | 'NO_MATCHING_RULES'
    | 'ENGINE_RETURNED_EMPTY'
    | 'NO_CHIPS_WITH_BILLING_REF';

interface TemplateSection {
    id: string;
    label: string;
    format: 'inline' | 'prose' | 'bullets' | 'billing';
    source?: 'chips' | 'extractedData' | 'disclosures' | 'billingDetails';
    slotRule?: {
        phases?: string[];
        fields?: string[];
        hasBilling?: boolean;
        proseAllowed?: boolean;
    };
    disclosureIds?: string[];
    connectorSource?: string;
    maxBullets?: number;
    slots?: string[];
    separator?: string;
    includeAuditNotes?: boolean;
    includeDisclosure?: string;
    groupBy?: string;
}

interface OutputTemplate {
    _meta: { id: string; version: string };
    sections: TemplateSection[];
    dedupeRules: {
        byChipId: string[];
        byCategory: string[];
    };
    phrasebank: {
        behandlung: {
            start: string[];
            middle: string[];
            end: string[];
        };
    };
    textLengthPolicy: {
        [key: string]: {
            snippetKey: string;
            maxSentencesPerChip: number;
            skipSections?: string[];
        };
    };
}

interface Disclosure {
    id: string;
    context: string;
    insuranceTypes: string[];
    text?: string;
    textSnippets?: { kurz?: string; mittel?: string; lang?: string };
    condition?: string;
    variables?: string[];
}

interface DisclosureFile {
    disclosures: Disclosure[];
}

function resolveDisclosureText(disclosure: Disclosure, textLength?: string): string {
    const key = (textLength || 'mittel') as 'kurz' | 'mittel' | 'lang';
    return disclosure.textSnippets?.[key]
        ?? disclosure.textSnippets?.mittel
        ?? disclosure.text
        ?? '';
}

interface FindingMapField {
    label: string;
    valueMap?: { [key: string]: { text: string; meaning: string } };
    renderTemplate?: string;
    required?: boolean;
    auditNoteIfMissing?: string;
}

interface FindingMap {
    fields: { [key: string]: FindingMapField };
    sectionOrder: string[];
    rendering: {
        separator: string;
        emptyValueBehavior: string;
        labelPrefix: boolean;
    };
}

// Evidence tracking for traceability
interface EvidenceRef {
    type: 'chip' | 'rule' | 'disclosure' | 'mapping';
    id: string;
    source?: string;
}

// Line-level evidence for strict testing
interface LineEvidence {
    line: string;
    evidenceRefs: EvidenceRef[];
}

export interface ComposedSection {
    id: string;
    label: string;
    content: string;
    lines: string[];  // Individual lines for testing
    evidenceByLineIndex: EvidenceRef[][];  // Evidence per line
    format: string;
    evidenceRefs: EvidenceRef[];  // Aggregate evidence for section
}

export interface ComposedOutput {
    sections: ComposedSection[];
    fullText: string;
    billingCodes: string[];
    warnings: ValidationWarning[];
    /** Reason why billing is empty (PII-safe diagnostic) */
    billingReason?: BillingReasonCode;
    /** Codes blocked by billing eligibility guards */
    billingBlocked?: string[];
    _evidenceTrace: {  // Internal, not for UI
        allRefs: EvidenceRef[];
        chipIds: string[];
        ruleIds: string[];
        disclosureIds: string[];
        mappingKeys: string[];
    };
}

function sortSectionsByCanonicalOrder(sections: ComposedSection[]): ComposedSection[] {
    const order = new Map<string, number>(CANONICAL_SECTION_ORDER.map((id, index) => [id, index]));
    return [...sections].sort((left, right) => {
        const leftOrder = order.has(left.id) ? order.get(left.id)! : Number.MAX_SAFE_INTEGER;
        const rightOrder = order.has(right.id) ? order.get(right.id)! : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.id.localeCompare(right.id);
    });
}

export interface ComposeOptions {
    textLength: 'kurz' | 'mittel' | 'lang';
    hasMKV: boolean;
    // hasAnesthesia REMOVED (Option B) — derived internally from activeChips
    mkvBetrag?: number;
    // Aufklärung toggle (wired from V10 settings, default true)
    aufklaerungEnabled?: boolean;
    // MKV context: explicit "nur Kasse" (suppress MKV disclosures)
    nurKasse?: boolean;
    // Material for capping placeholder substitution
    cappingMaterial?: 'mta' | 'caoh' | 'biodentine' | string;
    // Educational context for 'why this matters' notes
    educationalContext?: EducationalContext;
    // Optional disclosure override ids (bundle-driven)
    disclosureIds?: string[];
}

// Educational context for transparent decision documentation
export interface EducationalContext {
    trockenlegung?: { value: string; source: 'default' | 'manual' | 'dictation' };
    anesthesiaType?: string;
    diagnoseSeverity?: 'media' | 'profunda' | 'initialkaries';
    cavityDepth?: 'normal' | 'tief';
    ueberkappung?: boolean;
    ueberkappungMaterial?: { value: string; source: 'default' | 'manual' };
}

// Internal derived flags — computed inside composeOutput from activeChips
interface DerivedFlags {
    hasAnesthesia: boolean;
}

function replacePlaceholders(
    text: string,
    extractedData: Record<string, any>,
    excludeKeys: string[] = []
): string {
    const depthDisplay = (() => {
        if (extractedData.depthDisplay) {
            return String(extractedData.depthDisplay);
        }
        const diagnose = String(extractedData.diagnose || '').toLowerCase();
        if (diagnose.includes('profunda')) return ' tief (caries profunda)';
        if (diagnose.includes('media')) return ' mittel (caries media)';
        if (diagnose.includes('pulpanah')) return ' pulpanah';
        if (extractedData.tiefe) {
            return ` ${String(extractedData.tiefe)}`;
        }
        return '';
    })();

    const replacements: Record<string, string> = {
        tooth: extractedData.tooth ?? extractedData.zahn ?? '',
        surfacesFormatted: extractedData.flaechen ?? extractedData.surfacesFormatted ?? extractedData.surfaces ?? '',
        surfaces: extractedData.surfaces ?? extractedData.flaechen ?? '',
        diagnose: extractedData.diagnose ?? '',
        tiefe: extractedData.tiefe ?? '',
        depthDisplay,
        material: extractedData.material ?? '',
        fill_material: extractedData.fill_material ?? extractedData.material ?? '',
        la_agent: extractedData.la_agent ?? '',
        adhesive_material: extractedData.adhesive_material ?? '',
        etch_material: extractedData.etch_material ?? '',
        flowable_material: extractedData.flowable_material ?? '',
        bulk_material: extractedData.bulk_material ?? '',
        matrix_system: extractedData.matrix_system ?? '',
        mkv_justification: extractedData.mkv_justification ?? extractedData.mkvJustification ?? '',
    };

    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
        if (excludeKeys.includes(key)) continue;
        const pattern = new RegExp(`\\{${key}\\}`, 'gi');
        const replacement = value === undefined || value === null ? '' : String(value);
        result = result.replace(pattern, replacement);
    }

    // Clean up unresolved depthDisplay placeholder when no depth info was detected
    result = result.replace(/\{depthDisplay\}/gi, '');
    // Remove empty parentheses left by missing placeholders (e.g. surfaces)
    result = result.replace(/\(\s*\)/g, '');
    // Clean double spaces without touching newlines
    result = result.replace(/[ \t]{2,}/g, ' ');
    // Remove stray spaces before punctuation
    result = result.replace(/\s+([.,;:])/g, '$1');

    return result;
}

// ═══════════════════════════════════════════════════════════════
// STATIC IMPORTS — Only shared files that are NOT treatment-specific
// ═══════════════════════════════════════════════════════════════
import standardDisclosures from '../disclosures/standard_disclosures.json';

// Registry loaders for treatment-specific files (SSOT)
import { loadTemplateConfig, loadFindingMapConfig, type TemplateConfig, type FindingMapConfig } from '../registry';

// Cache for loaded configs (per treatmentId)
const templateCache = new Map<string, OutputTemplate | null>();
const findingMapCache = new Map<string, FindingMap | null>();

function loadTemplate(templateId: string): OutputTemplate | null {
    if (templateCache.has(templateId)) {
        return templateCache.get(templateId) || null;
    }

    try {
        const config = loadTemplateConfig(templateId);
        if (!config) {
            console.warn(`[OutputComposer] Template not found: ${templateId}`);
            templateCache.set(templateId, null);
            return null;
        }
        const template = config as unknown as OutputTemplate;
        templateCache.set(templateId, template);
        return template;
    } catch (e) {
        console.error(`[OutputComposer] Error loading template for ${templateId}:`, e);
        return null;
    }
}

function loadDisclosures(): DisclosureFile | null {
    return standardDisclosures as unknown as DisclosureFile;
}

function loadFindingMap(treatmentId: string): FindingMap | null {
    if (findingMapCache.has(treatmentId)) {
        return findingMapCache.get(treatmentId) || null;
    }

    try {
        const config = loadFindingMapConfig(treatmentId);
        if (!config) {
            console.warn(`[OutputComposer] Finding map not found: ${treatmentId}`);
            findingMapCache.set(treatmentId, null);
            return null;
        }
        const findingMap = config as unknown as FindingMap;
        findingMapCache.set(treatmentId, findingMap);
        return findingMap;
    } catch (e) {
        console.error(`[OutputComposer] Error loading finding map for ${treatmentId}:`, e);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// DEDUPE
// ═══════════════════════════════════════════════════════════════

function dedupeChips(
    chips: ChipDefinition[],
    rules: { byChipId: string[]; byCategory: string[] }
): ChipDefinition[] {
    const seen = new Set<string>();
    const seenCategories = new Set<string>();

    return chips.filter(chip => {
        if (seen.has(chip.id)) return false;
        seen.add(chip.id);

        if (rules.byCategory.includes(chip.category || '')) {
            if (seenCategories.has(chip.category || '')) return false;
            seenCategories.add(chip.category || '');
        }

        return true;
    });
}

// ═══════════════════════════════════════════════════════════════
// PROSE BUILDER (neutral connectors only)
// ═══════════════════════════════════════════════════════════════

function buildProse(
    snippets: Array<{ text: string; chipId: string }>,
    phrasebank: { start: string[]; middle: string[]; end: string[] } | undefined,
    seed: number = 0
): { text: string; usedChipIds: string[] } {
    if (snippets.length === 0) return { text: '', usedChipIds: [] };

    // Default phrasebank for null-safety
    const safePhrasebank = {
        start: phrasebank?.start?.length ? phrasebank.start : ['Zunächst', 'Initial'],
        middle: phrasebank?.middle?.length ? phrasebank.middle : ['Anschließend', 'Daraufhin'],
        end: phrasebank?.end?.length ? phrasebank.end : ['Abschließend'],
    };

    const result: string[] = [];
    const usedChipIds: string[] = [];

    for (let i = 0; i < snippets.length; i++) {
        const { text: snippet, chipId } = snippets[i];
        if (!snippet?.trim()) continue;

        usedChipIds.push(chipId);

        // Deterministic connector selection
        let connector = '';
        if (i === 0) {
            connector = safePhrasebank.start[(seed + i) % safePhrasebank.start.length];
        } else if (i === snippets.length - 1 && snippets.length > 2) {
            connector = safePhrasebank.end[(seed + i) % safePhrasebank.end.length];
        } else {
            connector = safePhrasebank.middle[(seed + i) % safePhrasebank.middle.length];
        }

        const cleanedSnippet = snippet.trim().replace(/[.]+$/g, '');
        const fullSentence = i === 0
            ? `${connector} ${cleanedSnippet}.`
            : ` ${connector} ${cleanedSnippet}.`;

        result.push(fullSentence);
    }

    return { text: result.join(''), usedChipIds };
}

function lowercaseFirst(str: string): string {
    if (!str) return str;
    if (str.match(/^[A-Z]{2,}/)) return str;  // Abbreviation
    return str.charAt(0).toLowerCase() + str.slice(1);
}

// ═══════════════════════════════════════════════════════════════
// BEFUND RENDERER (SSOT-mapped)
// ═══════════════════════════════════════════════════════════════

function renderBefundFromMapping(
    findingMap: FindingMap,
    extractedData: Record<string, any>
): { content: string; evidenceRefs: EvidenceRef[]; missingRequired: string[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];
    const missingRequired: string[] = [];

    const findingSectionOrder = findingMap?.sectionOrder ?? [];
    for (const fieldKey of findingSectionOrder) {
        const fieldDef = findingMap.fields[fieldKey];
        if (!fieldDef) continue;

        const value = extractedData[fieldKey];

        // Handle missing required fields
        if (!value) {
            if (fieldDef.required && fieldDef.auditNoteIfMissing) {
                missingRequired.push(fieldDef.auditNoteIfMissing);
            }
            continue;
        }

        let renderedText = '';

        // Use valueMap if available
        if (fieldDef.valueMap && fieldDef.valueMap[value]) {
            renderedText = fieldDef.valueMap[value].text;
        } else if (fieldDef.renderTemplate) {
            renderedText = fieldDef.renderTemplate.replace('{value}', String(value));
        } else {
            renderedText = String(value);
        }

        if (renderedText) {
            // Add label prefix if configured
            if (findingMap.rendering.labelPrefix) {
                parts.push(`${fieldDef.label}: ${renderedText}`);
            } else {
                parts.push(renderedText);
            }

            // Track evidence
            evidenceRefs.push({
                type: 'mapping',
                id: `fuellung_finding_map.${fieldKey}`,
                source: value
            });
        }
    }

    return {
        content: parts.join(findingMap?.rendering?.separator ?? ' '),
        evidenceRefs,
        missingRequired
    };
}

// ═══════════════════════════════════════════════════════════════
// SECTION RENDERERS
// ═══════════════════════════════════════════════════════════════

function renderHeader(
    section: TemplateSection,
    extractedData: Record<string, any>
): { content: string; evidenceRefs: EvidenceRef[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const slot of section.slots || []) {
        const key = slot.replace(/[{}]/g, '');
        const value = extractedData[key];
        if (value) {
            parts.push(String(value));
            evidenceRefs.push({ type: 'mapping', id: `header.${key}` });
        }
    }

    return {
        content: parts.join(section.separator || ' | '),
        evidenceRefs
    };
}

function renderAufklaerung(
    section: TemplateSection,
    disclosures: Disclosure[],
    insuranceType: string,
    options: ComposeOptions,
    derived: DerivedFlags,
    activeChips: string[],
    extracted?: Record<string, unknown>
): { content: string; evidenceRefs: EvidenceRef[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    // ────────────────────────────────────────────────────────────
    // SSOT-SAFE CHECK: aufklaerungEnabled setting
    // ────────────────────────────────────────────────────────────
    if (options.aufklaerungEnabled === false) {
        // Aufklärung disabled by practice setting → return empty
        return { content: '', evidenceRefs: [] };
    }

    // ────────────────────────────────────────────────────────────
    // CONTEXTUAL AUFKLÄRUNG from Registry (SSOT-safe)
    // Dataflow: activeChips + extracted + answers → aufklaerung text
    // ────────────────────────────────────────────────────────────
    const verbosity = (options.textLength || 'mittel') as VerbosityLevel;
    const evalContext = {
        activeChips,
        answers: new Map<string, unknown>(), // TODO: wire from outside if needed
        extracted: extracted || {},
        hasMKV: options.hasMKV === true,
    };

    const registryResult = buildAufklaerungFromClauses(
        FUELLUNG_AUFKLAERUNG_CLAUSES,
        evalContext,
        verbosity
    );

    if (registryResult.text) {
        const textWithPlaceholders = replacePlaceholders(registryResult.text, extracted || {});
        parts.push(textWithPlaceholders);
        // Evidence: clauses used
        for (const clauseId of registryResult.clauseIds) {
            evidenceRefs.push({ type: 'disclosure', id: `clause:${clauseId}` });
        }
    }

    if (options.nurKasse) {
        parts.push('Es wurde ausschließlich eine Kassenleistung erbracht.');
    }

    // ────────────────────────────────────────────────────────────
    // DISCLOSURE-BASED AUFKLÄRUNG (legacy template disclosures)
    // ────────────────────────────────────────────────────────────
    for (const discId of section.disclosureIds || []) {
        const disclosure = disclosures.find(d => d.id === discId);
        if (!disclosure) continue;

        // Check insurance type
        const insuranceMatch = disclosure.insuranceTypes.includes(insuranceType) ||
            (insuranceType === 'GKV' && options.hasMKV && disclosure.insuranceTypes.includes('MKV'));
        if (!insuranceMatch) continue;
        if (insuranceType === 'MKV' && options.nurKasse && disclosure.insuranceTypes.includes('MKV')) {
            continue;
        }

        // Check condition
        if (disclosure.condition === 'hasMKV' && !options.hasMKV) continue;
        if (disclosure.condition === 'hasAnesthesia' && !derived.hasAnesthesia) continue;

        // Variable substitution
        let text = resolveDisclosureText(disclosure, options.textLength);
        if (disclosure.variables?.includes('mkvBetrag') && options.mkvBetrag) {
            text = text.replace('{mkvBetrag}', `${options.mkvBetrag} €`);
        }

        const textWithPlaceholders = replacePlaceholders(text, extracted || {});
        parts.push(textWithPlaceholders);
        evidenceRefs.push({ type: 'disclosure', id: discId });
    }

    return { content: parts.join(' '), evidenceRefs };
}

function renderBehandlung(
    section: TemplateSection,
    chips: ChipDefinition[],
    phrasebank: { start: string[]; middle: string[]; end: string[] },
    textLength: string,
    seed: number,
    extractedData: Record<string, any>,
    options?: ComposeOptions
): { content: string; evidenceRefs: EvidenceRef[] } {
    const orderByPhase = (list: ChipDefinition[]): ChipDefinition[] => {
        const phaseOrder = section.slotRule?.phases;
        if (!phaseOrder || phaseOrder.length === 0) return list;
        const indexByPhase = new Map<string, number>(phaseOrder.map((p, i) => [p, i]));
        return list
            .map((chip, idx) => ({ chip, idx }))
            .sort((a, b) => {
                const ai = indexByPhase.get(a.chip.phase || '') ?? Number.POSITIVE_INFINITY;
                const bi = indexByPhase.get(b.chip.phase || '') ?? Number.POSITIVE_INFINITY;
                if (ai !== bi) return ai - bi;
                return a.idx - b.idx; // stable within phase
            })
            .map(x => x.chip);
    };

    // Filter chips by phase (SSOT: chip.phase)
    const filtered = chips.filter(chip => {
        if (!section.slotRule?.phases) return true;
        return section.slotRule.phases.includes(chip.phase || '');
    });
    const ordered = orderByPhase(filtered);

    // Material name mapping for placeholder substitution
    const MATERIAL_NAMES: Record<string, string> = {
        'mta': 'MTA',
        'caoh': 'Ca(OH)₂',
        'biodentine': 'Biodentine',
    };
    const materialName = options?.cappingMaterial
        ? (MATERIAL_NAMES[options.cappingMaterial.toLowerCase()] || options.cappingMaterial)
        : 'geeignetem Material'; // Safe fallback - never leak placeholder

    // Get snippets from SSOT (chip.textSnippets) and substitute placeholders
    const snippets: Array<{ text: string; chipId: string }> = [];
    for (const chip of ordered) {
        let snippet = chip.textSnippets?.[textLength] || chip.textSnippets?.mittel;
        if (snippet?.trim()) {
            snippet = replacePlaceholders(snippet, extractedData, ['material']);
            // Substitute {material} placeholder (capping context)
            snippet = snippet.replace(/\{material\}/gi, materialName);
            snippets.push({ text: snippet, chipId: chip.id });
        }
    }

    const { text, usedChipIds } = buildProse(snippets, phrasebank, seed);

    // Build educational context notes (if context provided)
    const notes = buildEducationalNotes(options?.educationalContext);
    const contentWithNotes = notes ? `${text}\n\n${notes}` : text;
    const klinischeZusatzinfos = Array.isArray(extractedData?.klinischeZusatzinfos)
        ? extractedData.klinischeZusatzinfos.map((info: unknown) => String(info).trim()).filter(Boolean)
        : [];
    const contentWithExtras = klinischeZusatzinfos.length > 0
        ? `${contentWithNotes}\n\nKlinische Zusatzinfo: ${klinischeZusatzinfos.join('; ')}.`
        : contentWithNotes;

    return {
        content: contentWithExtras,
        evidenceRefs: usedChipIds.map(id => ({ type: 'chip' as const, id }))
    };
}

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL NOTES BUILDER (transparent decision documentation)
// ═══════════════════════════════════════════════════════════════

function buildEducationalNotes(ctx?: EducationalContext): string {
    if (!ctx) return '';

    const notes: string[] = [];

    // Trockenlegung note
    if (ctx.trockenlegung) {
        const sourceLabel = ctx.trockenlegung.source === 'default' ? 'Praxis-Standard' :
            ctx.trockenlegung.source === 'manual' ? 'Manuell gewählt' : 'Aus Diktat';
        notes.push(`Trockenlegung: ${ctx.trockenlegung.value} (${sourceLabel}).`);
    }

    // Anesthesia note
    if (ctx.anesthesiaType) {
        notes.push(`Anästhesie: ${ctx.anesthesiaType}.`);
    }

    // Diagnosis severity note
    if (ctx.diagnoseSeverity) {
        const severityText = ctx.diagnoseSeverity === 'profunda' ? 'Caries profunda dokumentiert.' :
            ctx.diagnoseSeverity === 'media' ? 'Caries media dokumentiert.' :
                'Initialkaries dokumentiert.';
        notes.push(severityText);
    }

    // Cavity depth note (only if deep)
    if (ctx.cavityDepth === 'tief') {
        notes.push('Pulpanah dokumentiert.');
    }

    // Überkappung note
    if (ctx.ueberkappung) {
        const materialNote = ctx.ueberkappungMaterial
            ? `${ctx.ueberkappungMaterial.value} (${ctx.ueberkappungMaterial.source === 'default' ? 'Praxis-Standard' : 'Manuell gewählt'})`
            : '';
        notes.push(`Überkappung durchgeführt${materialNote ? ': ' + materialNote : ''}.`);
    }

    return notes.length > 0 ? `[Dokumentationshinweise] ${notes.join(' ')}` : '';
}

function renderLeistungen(
    section: TemplateSection,
    chips: ChipDefinition[],
    textLength: string,
    maxBullets: number = 8,
    extractedData: Record<string, any>,
    options?: ComposeOptions
): { content: string; evidenceRefs: EvidenceRef[] } {
    const orderByPhase = (list: ChipDefinition[]): ChipDefinition[] => {
        const phaseOrder = section.slotRule?.phases;
        if (!phaseOrder || phaseOrder.length === 0) return list;
        const indexByPhase = new Map<string, number>(phaseOrder.map((p, i) => [p, i]));
        return list
            .map((chip, idx) => ({ chip, idx }))
            .sort((a, b) => {
                const ai = indexByPhase.get(a.chip.phase || '') ?? Number.POSITIVE_INFINITY;
                const bi = indexByPhase.get(b.chip.phase || '') ?? Number.POSITIVE_INFINITY;
                if (ai !== bi) return ai - bi;
                return a.idx - b.idx; // stable within phase
            })
            .map(x => x.chip);
    };

    const filtered = chips.filter(chip => {
        if (section.slotRule?.hasBilling && !chip.billingRef) return false;
        if (section.slotRule?.phases) {
            return section.slotRule.phases.includes(chip.phase || '');
        }
        return true;
    });
    const ordered = orderByPhase(filtered);

    // Material name mapping for placeholder substitution (same as renderBehandlung)
    const MATERIAL_NAMES: Record<string, string> = {
        'mta': 'MTA',
        'caoh': 'Ca(OH)₂',
        'biodentine': 'Biodentine',
    };
    const materialName = options?.cappingMaterial
        ? (MATERIAL_NAMES[options.cappingMaterial.toLowerCase()] || options.cappingMaterial)
        : 'geeignetem Material';

    const bullets: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const chip of ordered.slice(0, maxBullets)) {
        // SSOT: chip.textSnippets.kurz or chip.label
        let snippet = chip.textSnippets?.kurz || chip.label;
        if (snippet) {
            snippet = replacePlaceholders(snippet, extractedData, ['material'])
                .replace(/\{material\}/gi, materialName);
            bullets.push(`• ${snippet}`);
            evidenceRefs.push({ type: 'chip', id: chip.id });
        }
    }

    return { content: bullets.join('\n'), evidenceRefs };
}

function renderAbrechnung(
    section: TemplateSection,
    billingDetails: Array<{ code: string; bezeichnung?: string; betrag?: number }>,
    insuranceType: string,
    hasMKV: boolean,
    disclosures: Disclosure[],
    options?: ComposeOptions
): { content: string; evidenceRefs: EvidenceRef[] } {
    const lines: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    const bema = billingDetails.filter(d => d.code.includes('BEMA'));
    const goz = billingDetails.filter(d => d.code.includes('GOZ'));

    if (bema.length > 0) {
        lines.push('Kassenleistung (BEMA):');
        for (const d of bema) {
            const code = d.code.replace('BEMA_', '');
            lines.push(`  ${code}${d.bezeichnung ? ` – ${d.bezeichnung}` : ''}`);
            evidenceRefs.push({ type: 'chip', id: d.code, source: 'billingDetails' });
        }
    }

    if (goz.length > 0) {
        lines.push('Privatleistung (GOZ):');
        for (const d of goz) {
            const code = d.code.replace('GOZ_', '');
            lines.push(`  ${code}${d.bezeichnung ? ` – ${d.bezeichnung}` : ''}`);
            evidenceRefs.push({ type: 'chip', id: d.code, source: 'billingDetails' });
        }
    }

    // MKV validation note (if active)
    if (hasMKV) {
        const hasMehrschicht = goz.some(d => d.code.includes('2060') || d.code.includes('2080'));
        const hasAdhasiv = goz.some(d => d.code.includes('2100') || d.code.includes('2197'));

        if (hasMehrschicht || hasAdhasiv) {
            const validations: string[] = [];
            if (hasMehrschicht) validations.push('Mehrschichttechnik');
            if (hasAdhasiv) validations.push('Adhäsivtechnik');
            lines.push(`[MKV-Validierung] ${validations.join(' + ')} dokumentiert.`);
        }

        // MKV disclosure(s) - prefer bundle meta overrides
        const disclosureIds = section.disclosureIds ?? (section.includeDisclosure ? [section.includeDisclosure] : []);
        for (const disclosureId of disclosureIds) {
            const mkvHinweis = disclosures.find(d => d.id === disclosureId);
            if (!mkvHinweis) continue;
            let text = resolveDisclosureText(mkvHinweis, options?.textLength);
            if (options?.mkvBetrag) {
                text = text.replace('{mkvBetrag}', `${options.mkvBetrag} €`);
            }
            lines.push('');
            lines.push(text);
            evidenceRefs.push({ type: 'disclosure', id: disclosureId });
        }
    }

    return { content: lines.join('\n'), evidenceRefs };
}

function renderHinweise(
    section: TemplateSection,
    disclosures: Disclosure[],
    options: ComposeOptions,
    derived: DerivedFlags,
    extractedData?: Record<string, any>
): { content: string; evidenceRefs: EvidenceRef[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const discId of section.disclosureIds || []) {
        const disclosure = disclosures.find(d => d.id === discId);
        if (!disclosure) continue;

        if (disclosure.condition === 'hasAnesthesia' && !derived.hasAnesthesia) continue;

        parts.push(resolveDisclosureText(disclosure, options.textLength));
        evidenceRefs.push({ type: 'disclosure', id: discId });
    }

    if (derived.hasAnesthesia) {
        const laHinweis = disclosures.find(d => d.id === 'postop_la');
        if (laHinweis) {
            const laText = resolveDisclosureText(laHinweis, options.textLength);
            if (laText && !parts.includes(laText)) {
                parts.push(laText);
                evidenceRefs.push({ type: 'disclosure', id: 'postop_la' });
            }
        }
    }

    const patientenangaben = Array.isArray(extractedData?.patientenangaben)
        ? extractedData.patientenangaben.map((info: unknown) => String(info).trim()).filter(Boolean)
        : [];
    const legacyZusatzinfos = Array.isArray(extractedData?.zusatzinfos)
        ? extractedData.zusatzinfos.map((info: unknown) => String(info).trim()).filter(Boolean)
        : [];
    if (patientenangaben.length > 0) {
        parts.push(`Patientenangabe: ${patientenangaben.join('; ')}.`);
    } else if (legacyZusatzinfos.length > 0) {
        parts.push(`Zusatzinfo: ${legacyZusatzinfos.join('; ')}.`);
    }

    return { content: parts.join(' '), evidenceRefs };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPOSE FUNCTION
// ═══════════════════════════════════════════════════════════════

export function composeOutput(
    templateId: string,
    engineResult: ProcessingResult,
    activeChips: ChipDefinition[],
    extractedData: Record<string, any>,
    insuranceType: 'GKV' | 'PKV',
    options: ComposeOptions
): ComposedOutput {
    const template = loadTemplate(templateId);
    const disclosureFile = loadDisclosures();
    const findingMap = loadFindingMap(templateId);

    if (!template || !disclosureFile) {
        return {
            sections: [],
            fullText: '',
            billingCodes: engineResult.billingCodes,
            warnings: engineResult.warnings,
            _evidenceTrace: { allRefs: [], chipIds: [], ruleIds: [], disclosureIds: [], mappingKeys: [] }
        };
    }

    const disclosures = disclosureFile.disclosures;
    const textLengthKey = options.textLength || 'mittel';
    const policy = template.textLengthPolicy?.[textLengthKey];
    const snippetKey = policy?.snippetKey || 'mittel';
    const skipSections = policy?.skipSections || [];
    const disclosureOverrideSet = options.disclosureIds
        ? new Set(options.disclosureIds)
        : null;

    // Dedupe chips
    const dedupedChips = dedupeChips(activeChips, template.dedupeRules);

    // ═══════════════════════════════════════════════════════════════
    // DERIVE FLAGS FROM CHIPS (Option B: no UI flags, only chip-based)
    // ═══════════════════════════════════════════════════════════════
    const derived: DerivedFlags = {
        hasAnesthesia: activeChips.some(c => c.phase === 'anaesthesie')
    };

    // Deterministic seed
    const seed = parseInt(extractedData.tooth || '36') || 36;

    // Collect all evidence
    const allRefs: EvidenceRef[] = [];
    const sections: ComposedSection[] = [];

    const resolveDisclosureIds = (sectionDef: TemplateSection): string[] | undefined => {
        if (!disclosureOverrideSet) {
            return sectionDef.disclosureIds;
        }
        const overrideIds = disclosures
            .filter(d => disclosureOverrideSet.has(d.id) && d.context === sectionDef.id)
            .map(d => d.id);
        return overrideIds;
    };

    for (const sectionDef of template.sections) {
        if (skipSections.includes(sectionDef.id)) continue;

        const overrideDisclosureIds = resolveDisclosureIds(sectionDef);
        const section = overrideDisclosureIds
            ? { ...sectionDef, disclosureIds: overrideDisclosureIds }
            : sectionDef;

        let sectionResult: { content: string; evidenceRefs: EvidenceRef[] } = { content: '', evidenceRefs: [] };

        switch (section.id) {
            case 'header':
                // Use treatment-specific label (SSOT: TREATMENT_LABELS)
                const behandlungLabel = TREATMENT_LABELS[templateId] ?? templateId;
                sectionResult = renderHeader(section, {
                    ...extractedData,
                    behandlung: behandlungLabel,
                    quadrant: getQuadrantName(extractedData.tooth)
                });
                break;

            case 'befund':
                if (findingMap) {
                    const befundResult = renderBefundFromMapping(findingMap, extractedData);
                    sectionResult = { content: befundResult.content, evidenceRefs: befundResult.evidenceRefs };
                    // Add warnings for missing required fields
                    for (let i = 0; i < befundResult.missingRequired.length; i++) {
                        const missing = befundResult.missingRequired[i];
                        const existingWarning = engineResult.warnings.find(w => w.description === missing);
                        if (!existingWarning) {
                            engineResult.warnings.push({ id: `befund-missing-${i}`, type: 'warning', title: 'Fehlende Angabe', description: missing, affectedCodes: [] });
                        }
                    }
                }
                break;

            case 'aufklaerung':
                // Pass activeChips and extracted for SSOT-safe clause evaluation
                const activeChipIds = dedupedChips.map(c => c.id);
                sectionResult = renderAufklaerung(section, disclosures, insuranceType, options, derived, activeChipIds, extractedData);
                break;

            case 'behandlung':
                sectionResult = renderBehandlung(
                    section,
                    dedupedChips,
                    template.phrasebank?.behandlung,
                    snippetKey,
                    seed,
                    extractedData,
                    options
                );
                break;

            case 'leistungen':
                sectionResult = renderLeistungen(
                    section,
                    dedupedChips,
                    snippetKey,
                    section.maxBullets,
                    extractedData,
                    options
                );
                break;

            case 'abrechnung':
                sectionResult = renderAbrechnung(section, engineResult.billingDetails, insuranceType, options.hasMKV, disclosures, options);
                break;

            case 'hinweise':
                sectionResult = renderHinweise(section, disclosures, options, derived, extractedData);
                break;
        }

        if (sectionResult.content?.trim()) {
            // Split content into lines for line-level evidence
            const lines = sectionResult.content.trim().split('\n').filter(l => l.trim());

            // Build evidence by line index (each line inherits section's evidence)
            // For more precise tracking, individual renderers could return per-line evidence
            const evidenceByLineIndex: EvidenceRef[][] = lines.map(() => [...sectionResult.evidenceRefs]);

            sections.push({
                id: section.id,
                label: section.label,
                content: sectionResult.content.trim(),
                lines,
                evidenceByLineIndex,
                format: section.format,
                evidenceRefs: sectionResult.evidenceRefs
            });
            allRefs.push(...sectionResult.evidenceRefs);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ENDO STEP SECTION INJECTION (MVP)
    // ═══════════════════════════════════════════════════════════════
    // For endo treatment, prepend ENDO-SCHRITT section if step is determined
    if (templateId === 'endo') {
        const endoStep = (extractedData as any)?.mentioned?.endo_step ||
            (extractedData as any)?.endo_step;

        if (endoStep) {
            // Import labels inline to avoid circular deps
            const ENDO_STEP_LABELS: Record<string, string> = {
                endo_start: 'Trepanation/Eröffnung',
                endo_interim: 'Zwischensitzung',
                endo_complete: 'Wurzelfüllung/Abschluss',
            };

            const stepLabel = ENDO_STEP_LABELS[endoStep] || endoStep;
            const content = `ENDO-SCHRITT: ${stepLabel}`;

            // Prepend to sections array (appears first in UI and clipboard)
            sections.unshift({
                id: 'endo_schritt',
                label: 'ENDO-SCHRITT',
                content,
                lines: [content],
                evidenceByLineIndex: [[{ type: 'mapping', id: 'endo_step', source: endoStep }]],
                format: 'inline',
                evidenceRefs: [{ type: 'mapping', id: 'endo_step', source: endoStep }]
            });

            allRefs.push({ type: 'mapping', id: 'endo_step', source: endoStep });
        }
    }

    const sortedSections = sortSectionsByCanonicalOrder(sections);

    // Build full text (exclude billing section to avoid raw codes)
    const fullTextSections = sortedSections.filter(section => section.id !== 'abrechnung');
    const fullText = fullTextSections.map(s => `[${s.label}]\n${s.content}`).join('\n\n');

    // Build evidence trace
    const _evidenceTrace = {
        allRefs,
        chipIds: [...new Set(allRefs.filter(r => r.type === 'chip').map(r => r.id))],
        ruleIds: [...new Set(allRefs.filter(r => r.type === 'rule').map(r => r.id))],
        disclosureIds: [...new Set(allRefs.filter(r => r.type === 'disclosure').map(r => r.id))],
        mappingKeys: [...new Set(allRefs.filter(r => r.type === 'mapping').map(r => r.id))]
    };

    // Compute billingReason when billing is empty (diagnostic)
    let billingReason: BillingReasonCode | undefined;
    if (engineResult.billingCodes.length === 0) {
        if (activeChips.length === 0) {
            billingReason = 'ENGINE_RETURNED_EMPTY';
        } else {
            billingReason = 'NO_CHIPS_WITH_BILLING_REF';
        }
    }

    return {
        sections: sortedSections,
        fullText,
        billingCodes: engineResult.billingCodes,
        warnings: engineResult.warnings,
        billingReason,
        _evidenceTrace
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getQuadrantName(tooth: string | undefined): string {
    if (!tooth) return '';
    const num = parseInt(tooth);
    if (isNaN(num)) return '';

    const quadrant = Math.floor(num / 10);
    switch (quadrant) {
        case 1: return 'OK rechts';
        case 2: return 'OK links';
        case 3: return 'UK links';
        case 4: return 'UK rechts';
        default: return '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// P12.5: BILLING-REFERENCED COMPOSE (ComposedDocumentV1)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
    BillingRef,
    BillingSystem,
    ComposedBlock,
    ComposedDocumentV1,
    ComposedDocumentV1Metadata,
    CombinabilityResult
} from '../../../../contracts/compose';

import {
    normalizeCanonicalKey,
    dedupeBillingRefs,
    deriveCopyTextFromBlocks
} from '../../../../contracts/compose';

import { checkCombinability } from '../../combinability/billingCombinabilityChecker';
import type { BillingInferenceResult } from './billingRegistry';

/** Unmapped billing code warning (for GATE testing) */
export interface UnmappedCodeWarning {
    code: string;
    reason: string;
}

/**
 * Map a billing code string to a BillingRef.
 * Codes should be in format 'BEMA_13a' or 'GOZ_2060'.
 */
function mapCodeToBillingRef(code: string, reason: string): BillingRef | null {
    // Parse system from code prefix
    const match = code.match(/^(BEMA|GOZ|BEL|GOAE|LAB)_(.+)$/i);
    if (!match) {
        // Try to infer system from code pattern
        if (code.startsWith('BEMA') || /^\d{1,2}[a-d]?$/i.test(code)) {
            return {
                system: 'BEMA',
                code: code.replace(/^BEMA_?/i, ''),
                canonicalKey: normalizeCanonicalKey('BEMA', code),
                reason
            };
        }
        if (code.startsWith('GOZ') || /^\d{4}[a-z]?$/i.test(code)) {
            return {
                system: 'GOZ',
                code: code.replace(/^GOZ_?/i, ''),
                canonicalKey: normalizeCanonicalKey('GOZ', code),
                reason
            };
        }
        return null;  // Cannot map
    }

    return {
        system: match[1].toUpperCase() as BillingSystem,
        code: match[2],
        canonicalKey: normalizeCanonicalKey(match[1].toUpperCase() as BillingSystem, match[2]),
        reason
    };
}

/**
 * Build ComposedBlocks with billing refs from ComposedSections.
 */
function buildBlocksWithRefs(
    sections: ComposedSection[],
    billingResult: BillingInferenceResult,
    treatmentId: string
): { blocks: ComposedBlock[]; unmappedCodes: UnmappedCodeWarning[] } {
    const blocks: ComposedBlock[] = [];
    const unmappedCodes: UnmappedCodeWarning[] = [];

    // Build a set of billing codes for this treatment
    const billingCodeSet = new Set(billingResult.billingCodes);

    for (const section of sections) {
        const refs: BillingRef[] = [];

        // For billing-related sections, extract refs from evidenceRefs
        if (section.id === 'abrechnung' || section.id === 'billing' || section.id === 'leistungen') {
            // Map billing codes to refs
            for (const code of billingResult.billingCodes) {
                const ref = mapCodeToBillingRef(code, `${treatmentId}.billing`);
                if (ref) {
                    refs.push(ref);
                } else {
                    unmappedCodes.push({ code, reason: 'Could not parse code format' });
                }
            }
        } else {
            // For non-billing sections, extract refs from evidence if chip-based
            for (const evidence of section.evidenceRefs) {
                if (evidence.type === 'chip' && evidence.source === 'billingDetails') {
                    const ref = mapCodeToBillingRef(evidence.id, `${treatmentId}.${section.id}`);
                    if (ref) refs.push(ref);
                }
            }
        }

        blocks.push({
            sourceSectionId: section.id,
            text: section.content,
            refs
        });
    }

    // Check for unmapped codes
    const mappedCodes = new Set(blocks.flatMap(b => b.refs.map(r => r.canonicalKey)));
    for (const code of billingResult.billingCodes) {
        const normalized = mapCodeToBillingRef(code, '')?.canonicalKey;
        if (normalized && !mappedCodes.has(normalized)) {
            // Code exists but wasn't placed in any block
            unmappedCodes.push({ code, reason: 'Not assigned to any section block' });
        }
    }

    return { blocks, unmappedCodes };
}

/** Input for composeDocumentV1 */
export interface ComposeDocumentV1Input {
    templateId: string;
    engineResult: ProcessingResult;
    activeChips: ChipDefinition[];
    extractedData: Record<string, unknown>;
    insuranceType: 'GKV' | 'PKV';
    options: ComposeOptions;
    billingResult: BillingInferenceResult;
    docMode?: 'fast' | 'balanced' | 'forensic';
}

/** Result from composeDocumentV1 */
export interface ComposeDocumentV1Result {
    document: ComposedDocumentV1;
    combinability: CombinabilityResult;
    unmappedCodes: UnmappedCodeWarning[];
}

/**
 * P12.5: Compose a billing-referenced document.
 *
 * PURE function: no timestamps, no IO, no randomness.
 * copyText is EXACTLY derived from blocks.
 */
export function composeDocumentV1(input: ComposeDocumentV1Input): ComposeDocumentV1Result {
    const {
        templateId,
        engineResult,
        activeChips,
        extractedData,
        insuranceType,
        options,
        billingResult,
        docMode = 'balanced'
    } = input;

    // Step 1: Call existing composeOutput for sections
    const composed = composeOutput(
        templateId,
        engineResult,
        activeChips,
        extractedData as Record<string, any>,
        insuranceType,
        options
    );

    // Step 2: Build blocks with billing refs
    const { blocks, unmappedCodes } = buildBlocksWithRefs(
        composed.sections,
        billingResult,
        templateId  // treatmentId = templateId
    );

    // Step 3: Derive copyText EXACTLY from blocks
    const copyText = deriveCopyTextFromBlocks(blocks);

    // Step 4: Deduplicate billing refs
    const allRefs = blocks.flatMap(b => b.refs);
    const billingRefs = dedupeBillingRefs(allRefs);

    // Step 5: Build metadata (NO TIMESTAMP)
    const metadata: ComposedDocumentV1Metadata = {
        treatmentId: templateId,
        insuranceType,
        docMode,
        hasMKV: options.hasMKV
    };

    // Step 6: Check combinability
    const combinability = checkCombinability(
        billingResult.billingCodes,
        templateId,
        insuranceType
    );

    // Log unmapped codes as warning (for debugging, not blocking)
    if (unmappedCodes.length > 0) {
        console.warn('[OutputComposer] Unmapped billing codes:', unmappedCodes);
    }

    return {
        document: {
            copyText,
            blocks,
            billingRefs,
            metadata
        },
        combinability,
        unmappedCodes
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P12.6: MULTI-TREATMENT COMPOSE
// ═══════════════════════════════════════════════════════════════════════════════

/** Multi-treatment document with aggregated output */
export interface MultiComposedDocumentV1 {
    /** Individual treatment documents */
    treatmentDocuments: ComposedDocumentV1[];

    /** Aggregated copy text (deterministic join) */
    aggregatedCopyText: string;

    /** Aggregated billing refs (deduplicated) */
    aggregatedBillingRefs: BillingRef[];

    /** Aggregated combinability result */
    aggregatedCombinability: {
        verdict: 'PASS' | 'WARN' | 'BLOCK';
        withinTreatment: CombinabilityResult[];
        crossTreatment: CombinabilityResult;
    };
}

/** Input for multi-treatment compose */
export interface MultiComposeInput {
    treatments: ComposeDocumentV1Input[];
}

/** Separator for multi-treatment aggregation (deterministic) */
const MULTI_TREATMENT_SEPARATOR = '\n\n---\n\n';

/**
 * P12.6: Compose multiple treatment documents into a unified output.
 *
 * PURE function: deterministic aggregation.
 */
export function composeMultiDocumentV1(input: MultiComposeInput): MultiComposedDocumentV1 {
    const { treatments } = input;

    // Step 1: Compose each treatment
    const results = treatments.map(t => composeDocumentV1(t));
    const treatmentDocuments = results.map(r => r.document);

    // Step 2: Aggregate copy text (deterministic order)
    const aggregatedCopyText = treatmentDocuments
        .map(d => d.copyText)
        .filter(t => t.trim())
        .join(MULTI_TREATMENT_SEPARATOR);

    // Step 3: Aggregate billing refs (deduplicated)
    const allRefs = treatmentDocuments.flatMap(d => d.billingRefs);
    const aggregatedBillingRefs = dedupeBillingRefs(allRefs);

    // Step 4: Aggregate combinability
    const withinTreatment = results.map(r => r.combinability);

    // Step 5: Cross-treatment combinability (default PASS unless explicit rules)
    // Combine all billing codes and check
    const allCodes = treatments.flatMap(t => t.billingResult.billingCodes);
    const crossTreatment = checkCombinability(
        allCodes,
        'multi',  // Special treatment ID for cross-treatment checks
        treatments[0]?.insuranceType || 'GKV'
    );

    // Determine overall verdict
    const allVerdicts = [...withinTreatment.map(c => c.verdict), crossTreatment.verdict];
    let overallVerdict: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    if (allVerdicts.includes('BLOCK')) overallVerdict = 'BLOCK';
    else if (allVerdicts.includes('WARN')) overallVerdict = 'WARN';

    return {
        treatmentDocuments,
        aggregatedCopyText,
        aggregatedBillingRefs,
        aggregatedCombinability: {
            verdict: overallVerdict,
            withinTreatment,
            crossTreatment
        }
    };
}

export default {
    composeOutput,
    composeDocumentV1,
    composeMultiDocumentV1,
    buildProse,
    dedupeChips
};
