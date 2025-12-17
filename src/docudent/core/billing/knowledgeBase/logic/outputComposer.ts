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

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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
    text: string;
    condition?: string;
    variables?: string[];
}

interface DisclosureFile {
    disclosures: Disclosure[];
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
    _evidenceTrace: {  // Internal, not for UI
        allRefs: EvidenceRef[];
        chipIds: string[];
        ruleIds: string[];
        disclosureIds: string[];
        mappingKeys: string[];
    };
}

export interface ComposeOptions {
    textLength: 'kurz' | 'mittel' | 'lang';
    hasMKV: boolean;
    // hasAnesthesia REMOVED (Option B) — derived internally from activeChips
    mkvBetrag?: number;
    // Material for capping placeholder substitution
    cappingMaterial?: 'mta' | 'caoh' | 'biodentine' | string;
    // Educational context for 'why this matters' notes
    educationalContext?: EducationalContext;
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
    phrasebank: { start: string[]; middle: string[]; end: string[] },
    seed: number = 0
): { text: string; usedChipIds: string[] } {
    if (snippets.length === 0) return { text: '', usedChipIds: [] };

    const result: string[] = [];
    const usedChipIds: string[] = [];

    for (let i = 0; i < snippets.length; i++) {
        const { text: snippet, chipId } = snippets[i];
        if (!snippet?.trim()) continue;

        usedChipIds.push(chipId);

        // Deterministic connector selection
        let connector = '';
        if (i === 0) {
            connector = phrasebank.start[(seed + i) % phrasebank.start.length];
        } else if (i === snippets.length - 1 && snippets.length > 2) {
            connector = phrasebank.end[(seed + i) % phrasebank.end.length];
        } else {
            connector = phrasebank.middle[(seed + i) % phrasebank.middle.length];
        }

        const fullSentence = i === 0
            ? `${connector} ${lowercaseFirst(snippet.trim())}.`
            : ` ${connector} ${lowercaseFirst(snippet.trim())}.`;

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

    for (const fieldKey of findingMap.sectionOrder) {
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
        content: parts.join(findingMap.rendering.separator),
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
    derived: DerivedFlags
): { content: string; evidenceRefs: EvidenceRef[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const discId of section.disclosureIds || []) {
        const disclosure = disclosures.find(d => d.id === discId);
        if (!disclosure) continue;

        // Check insurance type
        const insuranceMatch = disclosure.insuranceTypes.includes(insuranceType) ||
            (insuranceType === 'GKV' && options.hasMKV && disclosure.insuranceTypes.includes('MKV'));
        if (!insuranceMatch) continue;

        // Check condition
        if (disclosure.condition === 'hasMKV' && !options.hasMKV) continue;
        if (disclosure.condition === 'hasAnesthesia' && !derived.hasAnesthesia) continue;

        // Variable substitution
        let text = disclosure.text;
        if (disclosure.variables?.includes('mkvBetrag') && options.mkvBetrag) {
            text = text.replace('{mkvBetrag}', `${options.mkvBetrag} €`);
        }

        parts.push(text);
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
    options?: ComposeOptions
): { content: string; evidenceRefs: EvidenceRef[] } {
    // Filter chips by phase (SSOT: chip.phase)
    const filtered = chips.filter(chip => {
        if (!section.slotRule?.phases) return true;
        return section.slotRule.phases.includes(chip.phase || '');
    });

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
    for (const chip of filtered) {
        let snippet = chip.textSnippets?.[textLength] || chip.textSnippets?.mittel;
        if (snippet?.trim()) {
            // Substitute {material} placeholder
            snippet = snippet.replace(/\{material\}/gi, materialName);
            snippets.push({ text: snippet, chipId: chip.id });
        }
    }

    const { text, usedChipIds } = buildProse(snippets, phrasebank, seed);

    // Build educational context notes (if context provided)
    const notes = buildEducationalNotes(options?.educationalContext);
    const contentWithNotes = notes ? `${text}\n\n${notes}` : text;

    return {
        content: contentWithNotes,
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
    options?: ComposeOptions
): { content: string; evidenceRefs: EvidenceRef[] } {
    const filtered = chips.filter(chip => {
        if (section.slotRule?.hasBilling && !chip.billingRef) return false;
        if (section.slotRule?.phases) {
            return section.slotRule.phases.includes(chip.phase || '');
        }
        return true;
    });

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

    for (const chip of filtered.slice(0, maxBullets)) {
        // SSOT: chip.textSnippets.kurz or chip.label
        let snippet = chip.textSnippets?.kurz || chip.label;
        if (snippet) {
            // Substitute {material} placeholder
            snippet = snippet.replace(/\{material\}/gi, materialName);
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

        // MKV disclosure
        if (section.includeDisclosure) {
            const mkvHinweis = disclosures.find(d => d.id === section.includeDisclosure);
            if (mkvHinweis) {
                let text = mkvHinweis.text;
                if (options?.mkvBetrag) {
                    text = text.replace('{mkvBetrag}', `${options.mkvBetrag} €`);
                }
                lines.push('');
                lines.push(text);
                evidenceRefs.push({ type: 'disclosure', id: section.includeDisclosure });
            }
        }
    }

    return { content: lines.join('\n'), evidenceRefs };
}

function renderHinweise(
    section: TemplateSection,
    disclosures: Disclosure[],
    options: ComposeOptions,
    derived: DerivedFlags
): { content: string; evidenceRefs: EvidenceRef[] } {
    const parts: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const discId of section.disclosureIds || []) {
        const disclosure = disclosures.find(d => d.id === discId);
        if (!disclosure) continue;

        if (disclosure.condition === 'hasAnesthesia' && !derived.hasAnesthesia) continue;

        parts.push(disclosure.text);
        evidenceRefs.push({ type: 'disclosure', id: discId });
    }

    if (derived.hasAnesthesia) {
        const laHinweis = disclosures.find(d => d.id === 'postop_la');
        if (laHinweis && !parts.includes(laHinweis.text)) {
            parts.push(laHinweis.text);
            evidenceRefs.push({ type: 'disclosure', id: 'postop_la' });
        }
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
    const policy = template.textLengthPolicy[textLengthKey];
    const snippetKey = policy?.snippetKey || 'mittel';
    const skipSections = policy?.skipSections || [];

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

    for (const sectionDef of template.sections) {
        if (skipSections.includes(sectionDef.id)) continue;

        let sectionResult: { content: string; evidenceRefs: EvidenceRef[] } = { content: '', evidenceRefs: [] };

        switch (sectionDef.id) {
            case 'header':
                sectionResult = renderHeader(sectionDef, {
                    ...extractedData,
                    behandlung: 'Kompositfüllung',
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
                sectionResult = renderAufklaerung(sectionDef, disclosures, insuranceType, options, derived);
                break;

            case 'behandlung':
                sectionResult = renderBehandlung(sectionDef, dedupedChips, template.phrasebank.behandlung, snippetKey, seed, options);
                break;

            case 'leistungen':
                sectionResult = renderLeistungen(sectionDef, dedupedChips, snippetKey, sectionDef.maxBullets, options);
                break;

            case 'abrechnung':
                sectionResult = renderAbrechnung(sectionDef, engineResult.billingDetails, insuranceType, options.hasMKV, disclosures, options);
                break;

            case 'hinweise':
                sectionResult = renderHinweise(sectionDef, disclosures, options, derived);
                break;
        }

        if (sectionResult.content?.trim()) {
            // Split content into lines for line-level evidence
            const lines = sectionResult.content.trim().split('\n').filter(l => l.trim());

            // Build evidence by line index (each line inherits section's evidence)
            // For more precise tracking, individual renderers could return per-line evidence
            const evidenceByLineIndex: EvidenceRef[][] = lines.map(() => [...sectionResult.evidenceRefs]);

            sections.push({
                id: sectionDef.id,
                label: sectionDef.label,
                content: sectionResult.content.trim(),
                lines,
                evidenceByLineIndex,
                format: sectionDef.format,
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


    // Build full text
    const fullText = sections.map(s => `[${s.label}]\n${s.content}`).join('\n\n');

    // Build evidence trace
    const _evidenceTrace = {
        allRefs,
        chipIds: [...new Set(allRefs.filter(r => r.type === 'chip').map(r => r.id))],
        ruleIds: [...new Set(allRefs.filter(r => r.type === 'rule').map(r => r.id))],
        disclosureIds: [...new Set(allRefs.filter(r => r.type === 'disclosure').map(r => r.id))],
        mappingKeys: [...new Set(allRefs.filter(r => r.type === 'mapping').map(r => r.id))]
    };

    return {
        sections,
        fullText,
        billingCodes: engineResult.billingCodes,
        warnings: engineResult.warnings,
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

export default {
    composeOutput,
    buildProse,
    dedupeChips
};
