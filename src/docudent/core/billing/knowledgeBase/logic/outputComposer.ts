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
    warnings: string[];
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
}

// Internal derived flags — computed inside composeOutput from activeChips
interface DerivedFlags {
    hasAnesthesia: boolean;
}

// ═══════════════════════════════════════════════════════════════
// LOADERS
// ═══════════════════════════════════════════════════════════════

function loadTemplate(templateId: string): OutputTemplate | null {
    try {
        if (templateId === 'fuellung') {
            return require('../templates/fuellung_template.json');
        }
        return null;
    } catch {
        console.error(`Template not found: ${templateId}`);
        return null;
    }
}

function loadDisclosures(): DisclosureFile | null {
    try {
        return require('../disclosures/standard_disclosures.json');
    } catch {
        console.error('Disclosures file not found');
        return null;
    }
}

function loadFindingMap(treatmentId: string): FindingMap | null {
    try {
        if (treatmentId === 'fuellung') {
            return require('../mappings/fuellung_finding_map.json');
        }
        return null;
    } catch {
        console.error(`Finding map not found: ${treatmentId}`);
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
    seed: number
): { content: string; evidenceRefs: EvidenceRef[] } {
    // Filter chips by phase (SSOT: chip.phase)
    const filtered = chips.filter(chip => {
        if (!section.slotRule?.phases) return true;
        return section.slotRule.phases.includes(chip.phase || '');
    });

    // Get snippets from SSOT (chip.textSnippets)
    const snippets: Array<{ text: string; chipId: string }> = [];
    for (const chip of filtered) {
        const snippet = chip.textSnippets?.[textLength] || chip.textSnippets?.mittel;
        if (snippet?.trim()) {
            snippets.push({ text: snippet, chipId: chip.id });
        }
    }

    const { text, usedChipIds } = buildProse(snippets, phrasebank, seed);

    return {
        content: text,
        evidenceRefs: usedChipIds.map(id => ({ type: 'chip' as const, id }))
    };
}

function renderLeistungen(
    section: TemplateSection,
    chips: ChipDefinition[],
    textLength: string,
    maxBullets: number = 8
): { content: string; evidenceRefs: EvidenceRef[] } {
    const filtered = chips.filter(chip => {
        if (section.slotRule?.hasBilling && !chip.billingRef) return false;
        if (section.slotRule?.phases) {
            return section.slotRule.phases.includes(chip.phase || '');
        }
        return true;
    });

    const bullets: string[] = [];
    const evidenceRefs: EvidenceRef[] = [];

    for (const chip of filtered.slice(0, maxBullets)) {
        // SSOT: chip.textSnippets.kurz or chip.label
        const snippet = chip.textSnippets?.kurz || chip.label;
        if (snippet) {
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
    disclosures: Disclosure[]
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

    if (hasMKV && section.includeDisclosure) {
        const mkvHinweis = disclosures.find(d => d.id === section.includeDisclosure);
        if (mkvHinweis) {
            lines.push('');
            lines.push(mkvHinweis.text);
            evidenceRefs.push({ type: 'disclosure', id: section.includeDisclosure });
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
                    for (const missing of befundResult.missingRequired) {
                        if (!engineResult.warnings.includes(missing)) {
                            engineResult.warnings.push(missing);
                        }
                    }
                }
                break;

            case 'aufklaerung':
                sectionResult = renderAufklaerung(sectionDef, disclosures, insuranceType, options, derived);
                break;

            case 'behandlung':
                sectionResult = renderBehandlung(sectionDef, dedupedChips, template.phrasebank.behandlung, snippetKey, seed);
                break;

            case 'leistungen':
                sectionResult = renderLeistungen(sectionDef, dedupedChips, snippetKey, sectionDef.maxBullets);
                break;

            case 'abrechnung':
                sectionResult = renderAbrechnung(sectionDef, engineResult.billingDetails, insuranceType, options.hasMKV, disclosures);
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
