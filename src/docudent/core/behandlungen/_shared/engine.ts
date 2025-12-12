/**
 * @deprecated DIESE DATEI IST OBSOLET!
 * 
 * Verwende stattdessen: processChipsToBilling() aus treatmentEngine.ts
 * Diese Datei wird in einer zukünftigen Version gelöscht.
 * 
 * Grund: Neue zentrale Engine in:
 * - src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts
 */

/**
 * TREATMENT ENGINE (DEPRECATED)
 * 
 * Processes a TreatmentDefinition and generates output.
 * Pure, deterministic logic - no LLM needed.
 */

import {
    TreatmentDefinition,
    TreatmentContext,
    TreatmentOutput,
    InsuranceType,
    BillingRef,
    TextLength,
    TextSnippets,
    ChipState,
    Source
} from './types';
import { FEE_CATALOG } from './feeCatalog';

/**
 * Get snippet for specific text length
 * Falls back: textSnippets[length] → textSnippets.mittel → textSnippet (legacy)
 */
function getSnippetForLength(
    snippets: TextSnippets | undefined,
    legacySnippet: string | undefined,
    length: TextLength
): string {
    // Prefer new textSnippets object
    if (snippets) {
        return snippets[length] || snippets.mittel || '';
    }
    // Fall back to legacy single snippet
    return legacySnippet || '';
}

/**
 * Resolve billing code for insurance type
 * Returns primary code (GKV/PKV)
 */
function resolveBillingCode(refs: BillingRef | undefined, insuranceType: InsuranceType): string | null {
    if (!refs) return null;
    const key = insuranceType === 'GKV' ? refs.GKV : refs.PKV;
    if (!key) return null;
    const fee = FEE_CATALOG[key];
    return fee ? fee.code : null;
}

/**
 * Resolve MKV (Mehrkosten/Zuzahlung) code for GKV patients
 * These are GOZ positions charged additionally to the patient
 */
function resolveMKVCode(refs: BillingRef | undefined): string | null {
    if (!refs || !refs.MKV) return null;
    const fee = FEE_CATALOG[refs.MKV];
    return fee ? fee.code : null;
}


/**
 * Get value from nested object path (e.g. "surfaces.length")
 */
function getValueByPath(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
        if (value === undefined || value === null) return undefined;
        value = value[part];
    }
    return value;
}

/**
 * Process treatment and generate output
 */
export function processTreatment(context: TreatmentContext): TreatmentOutput {
    const { treatment, insuranceType, activeChips, extractedData, acceptedUpsells, textLength = 'mittel' } = context;

    const textLines: string[] = [];
    const procedureSnippets: string[] = [];
    const billingCodes: string[] = [];
    const dataPatches: Record<string, any> = { ...treatment.defaults, ...extractedData };

    // ========================================
    // 1. REQUIRED OUTPUTS - collect but add at end
    // (Final steps like Okklusionskontrolle, Politur, etc.)
    // ========================================
    const requiredTextLines: string[] = [];
    const requiredSnippets: string[] = [];

    for (const req of treatment.requiredOutputs) {
        requiredTextLines.push(req.textLine);
        const snippet = getSnippetForLength(req.textSnippets, req.textSnippet, textLength);
        if (snippet) {
            requiredSnippets.push(snippet);
        }

        // Apply billing if defined
        const code = resolveBillingCode(req.billingRefs, insuranceType);
        if (code && !billingCodes.includes(code)) {
            billingCodes.push(code);
        }

        // Apply data patches
        if (req.dataPatches) {
            for (const patch of req.dataPatches) {
                dataPatches[patch.field] = patch.value;
            }
        }
    }

    // ========================================
    // 2. ACTIVE CHIPS
    // ========================================
    for (const chip of treatment.chips) {
        if (!activeChips.includes(chip.id)) continue;

        // Befund chips only contribute data patches, not text lines
        if (chip.category !== 'befund') {
            // Only add non-empty text lines
            if (chip.textLine && chip.textLine.length > 0) {
                textLines.push(chip.textLine);
            }
            const snippet = getSnippetForLength(chip.textSnippets, chip.textSnippet, textLength);
            if (snippet && snippet.length > 0) {
                procedureSnippets.push(snippet);
            }
        }

        // Apply billing (for all chips, including befund if they have billing)
        const code = resolveBillingCode(chip.billingRefs, insuranceType);
        if (code && !billingCodes.includes(code)) {
            billingCodes.push(code);
        }

        // Also collect MKV codes for GKV patients (Mehrkostenvereinbarung/Zuzahlung)
        if (insuranceType === 'GKV') {
            const mkvCode = resolveMKVCode(chip.billingRefs);
            if (mkvCode && !billingCodes.includes(mkvCode)) {
                billingCodes.push(mkvCode + ' (Zuzahlung)');
            }
        }

        // Apply data patches (for all chips)
        if (chip.dataPatches) {
            for (const patch of chip.dataPatches) {
                dataPatches[patch.field] = patch.value;
            }
        }
    }

    // ========================================
    // 3. BILLING RULES (automatic)
    // ========================================
    for (const rule of treatment.billingRules) {
        const triggerValue = getValueByPath(dataPatches, rule.trigger);
        if (triggerValue === undefined) continue;

        // Find matching logic entry
        let billingRef = rule.logic[triggerValue];

        // Handle 4+ case (any value >= 4)
        if (!billingRef && typeof triggerValue === 'number' && triggerValue >= 4) {
            billingRef = rule.logic[4] || rule.logic['4+'];
        }

        if (billingRef) {
            const code = resolveBillingCode(billingRef, insuranceType);
            if (code && !billingCodes.includes(code)) {
                // F-code should be first
                billingCodes.unshift(code);
            }
        }
    }

    // ========================================
    // 4. ACCEPTED UPSELLS
    // ========================================
    for (const upsell of treatment.upsells) {
        if (!acceptedUpsells.includes(upsell.id)) continue;

        textLines.push(upsell.textLine);
        procedureSnippets.push(upsell.textSnippet);

        // Apply billing
        const code = resolveBillingCode(upsell.billingRefs, insuranceType);
        if (code && !billingCodes.includes(code)) {
            billingCodes.push(code);
        }

        // Apply data patches
        if (upsell.dataPatches) {
            for (const patch of upsell.dataPatches) {
                dataPatches[patch.field] = patch.value;
            }
        }
    }

    // ========================================
    // 5. ADD REQUIRED OUTPUTS AT END
    // ========================================
    textLines.push(...requiredTextLines);
    procedureSnippets.push(...requiredSnippets);

    return {
        textLines,
        procedureSnippets,
        billingCodes,
        dataPatches
    };
}

/**
 * Check if upsell should be shown
 */
export function shouldShowUpsell(
    upsell: TreatmentDefinition['upsells'][0],
    data: Record<string, any>
): boolean {
    const { showWhen } = upsell;

    // Check "missing" condition
    if (showWhen.missing) {
        const value = data[showWhen.missing];
        if (value !== undefined && value !== null && value !== '') {
            return false; // Field exists, don't show
        }
    }

    // Check "fieldContains" condition (single value)
    if (showWhen.fieldContains) {
        const { field, value } = showWhen.fieldContains;
        const fieldValue = data[field];
        if (!fieldValue || !String(fieldValue).toLowerCase().includes(value.toLowerCase())) {
            return false; // Field doesn't contain value, don't show
        }
    }

    // Check "fieldContainsAny" condition (multiple values, match any)
    if (showWhen.fieldContainsAny) {
        const { field, values } = showWhen.fieldContainsAny;
        const fieldValue = data[field];
        if (!fieldValue) {
            return false; // Field missing, don't show
        }
        const lowerFieldValue = String(fieldValue).toLowerCase();
        const matchesAny = values.some(v => lowerFieldValue.includes(v.toLowerCase()));
        if (!matchesAny) {
            return false; // No match found, don't show
        }
    }

    return true;
}

/**
 * Get active upsells for display
 * Filters out upsells for chips that are:
 * - locked_on (always active, no need to ask)
 * - hidden (not used)
 * - visible AND active (already toggled on)
 */
export function getActiveUpsells(
    treatment: TreatmentDefinition,
    data: Record<string, any>,
    chipVisibility?: Record<string, string>,
    inactiveStandards?: string[]
): TreatmentDefinition['upsells'] {
    return treatment.upsells.filter(u => {
        // First check showWhen conditions
        if (!shouldShowUpsell(u, data)) return false;

        // If no visibility info, show the upsell
        if (!chipVisibility) return true;

        // Get related chip ID
        const chipId = u.relatedChipId || u.id.replace(/^upsell_/, '');
        const visibility = chipVisibility[chipId];

        // Don't show for locked_on chips - they're always active
        if (visibility === 'locked_on') return false;
        // Don't show for hidden chips
        if (visibility === 'hidden') return false;
        // Don't show for visible chips that are currently active
        if (visibility === 'visible' && inactiveStandards && !inactiveStandards.includes(chipId)) {
            return false;
        }

        return true;
    });
}

/**
 * Get default active chips
 */
export function getDefaultActiveChips(treatment: TreatmentDefinition): string[] {
    return treatment.chips
        .filter(c => c.defaultActive)
        .map(c => c.id);
}

/**
 * INFER CHIPS FROM DICTATION
 * 
 * Maps dictation keywords to chip IDs.
 * This is the critical bridge: Dictation → Chips → Billing
 * 
 * Each chip can be activated by specific keywords in the dictation.
 */
export function inferChipsFromDictation(
    dictation: string,
    treatment: TreatmentDefinition,
    extracted?: Record<string, any>
): string[] {
    const chips: string[] = [];
    const lower = dictation.toLowerCase();

    // ════════════════════════════════════════════════════════════════
    // ANÄSTHESIE
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('leitungs') || lower.includes('leitung') ||
        lower.includes('n. alv') || lower.includes('mandibular')) {
        chips.push('la_leitung');
    } else if (lower.includes('infiltr') || lower.includes('injektion') ||
        (lower.includes('anästhesie') && !lower.includes('ohne'))) {
        chips.push('la_infiltr');
    } else if (lower.includes('ohne anästhesie') || lower.includes('ohne la') ||
        lower.includes('keine anästhesie')) {
        chips.push('ohne_la');
    }

    // ════════════════════════════════════════════════════════════════
    // TROCKENLEGUNG
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('kofferdam') || lower.includes('absolut')) {
        chips.push('kofferdam');
    } else if (lower.includes('relativ') || lower.includes('watteroll') ||
        lower.includes('speichel')) {
        chips.push('rel_trocken');
    }

    // ════════════════════════════════════════════════════════════════
    // EXKAVATION
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('exkav') || lower.includes('sondenhart') ||
        lower.includes('karies') || lower.includes('kariös')) {
        chips.push('exkavation');
    }

    if (lower.includes('kariesdetektor') || lower.includes('anfärb') ||
        lower.includes('karies detektor')) {
        chips.push('kariesdetektor');
    }

    // ════════════════════════════════════════════════════════════════
    // ÜBERKAPPUNG (Cp/P) - WICHTIG: indirekte VOR direkte prüfen!
    // "indirekte überkappung" enthält "direkte überkappung" als Substring!
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('indirekte überkappung') || lower.includes('indirekt überkapp') ||
        lower.includes('calxyl') || lower.includes('calcium') ||
        lower.includes('ca(oh)') || lower.includes(', cp') || lower.includes(' cp ') ||
        (lower.includes('pulpanah') && !lower.includes('pulpaeröffnung'))) {
        chips.push('cp');
    } else if (lower.includes('direkte überkappung') || lower.includes('direkt überkapp') ||
        lower.includes(' p ') || lower.includes('mta') || lower.includes('pulpaeröffnung')) {
        chips.push('p');
    } else if (lower.includes('keine pulpa') || lower.includes('cp nicht') ||
        lower.includes('keine überkappung') || lower.includes('überkappung nicht')) {
        chips.push('cp_not_required');
    }

    // ════════════════════════════════════════════════════════════════
    // MATRIZE
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('matrize') || lower.includes('teilmatrize') ||
        lower.includes('keil') || lower.includes('sektional')) {
        chips.push('matrize');
    }

    // ════════════════════════════════════════════════════════════════
    // KOMPOSIT / ADHÄSIV
    // Bei GKV: "Mehrschicht/Schicht" = Zuzahlung (GOZ 2197)
    // Ohne Schicht-Keyword: Standard GKV (nur BEMA)
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('mehrschicht') || lower.includes('schichttechnik') ||
        lower.includes('schichtweise') || lower.includes('inkrement')) {
        // Explizit Mehrschicht erwähnt = Zuzahlung Chip
        chips.push('mehrschicht');
    } else if (lower.includes('komposit') || lower.includes('adhäsiv') ||
        lower.includes('ätz') || lower.includes('bond')) {
        // Komposit ohne explizite Mehrschicht = GKV Standard
        chips.push('komposit_basic');
    }

    // ════════════════════════════════════════════════════════════════
    // UNTERFÜLLUNG
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('unterfüllung') || lower.includes('liner') ||
        lower.includes('dentinschutz')) {
        chips.push('unterfuellung');
    }

    // ════════════════════════════════════════════════════════════════
    // BLUTSTILLUNG
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('blutstillung') || lower.includes('blutung') ||
        lower.includes('hämostat')) {
        chips.push('blutstillung');
    }

    // ════════════════════════════════════════════════════════════════
    // FLUORIDIERUNG
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('fluorid') || lower.includes('fluor')) {
        chips.push('fluor');
    }

    // ════════════════════════════════════════════════════════════════
    // RÖNTGEN
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('röntgen') || lower.includes('rö-kontrolle') ||
        lower.includes('rö kontrolle') || lower.includes('zahnfilm')) {
        chips.push('rö_kontrolle');
    }

    // ════════════════════════════════════════════════════════════════
    // FINISHING (usually always done)
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('politur') || lower.includes('okklusion') ||
        lower.includes('einschleifen') || lower.includes('finish')) {
        chips.push('finishing');
    }

    // ════════════════════════════════════════════════════════════════
    // BEFUND (from extracted data if available)
    // ════════════════════════════════════════════════════════════════
    if (extracted?.vitality === '+' || lower.includes('vital') && !lower.includes('devital')) {
        chips.push('vipr_pos');
    } else if (extracted?.vitality === '-' || lower.includes('devital') || lower.includes('avital')) {
        chips.push('vipr_neg');
    }

    if (lower.includes('perk neg') || lower.includes('perk -') || lower.includes('perkussionsnegativ')) {
        chips.push('perk_neg');
    } else if (lower.includes('perk pos') || lower.includes('perk +') || lower.includes('perkussionspositiv')) {
        chips.push('perk_pos');
    }

    // Dedupe
    return [...new Set(chips)];
}

// ========================================
// CHIP STATE RESOLUTION (Override Logic)
// ========================================


/**
 * Resolves chip states with priority: user > dictation > settings > default
 * 
 * @param treatment - Treatment definition
 * @param extractedChips - Chips erkannt aus Diktat
 * @param userOverrides - Map von ChipId zu expliziter User-Entscheidung (true/false)
 *                        Nur Chips die der User wirklich angefasst hat!
 * @param chipVisibility - User's visibility settings per chip (locked_on, visible, locked_off, hidden)
 * @returns Array von ChipState mit source/confidence tracking
 */
export function resolveChipStates(
    treatment: TreatmentDefinition,
    extractedChips: string[],
    userOverrides: Map<string, boolean> = new Map(),
    chipVisibility: Record<string, string> = {}  // NEW: User's visibility settings
): ChipState[] {
    const states = new Map<string, ChipState>();

    // 1. SETTINGS: Process locked_on and locked_off FIRST (highest implicit priority)
    for (const chip of treatment.chips) {
        // Default to 'hidden' - chips only appear if explicitly configured
        const visibility = chipVisibility[chip.id] || 'hidden';

        // LOCKED_ON: Always active, no confirmation needed
        if (visibility === 'locked_on') {
            states.set(chip.id, {
                id: chip.id,
                active: true,
                source: 'settings' as Source,
                confidence: 1.0,
                needsConfirmation: false
            });
            continue;
        }

        // LOCKED_OFF: Always inactive, documented as "nicht durchgeführt"
        if (visibility === 'locked_off') {
            states.set(chip.id, {
                id: chip.id,
                active: false,
                source: 'settings' as Source,
                confidence: 1.0,
                needsConfirmation: false
            });
            continue;
        }

        // HIDDEN: Completely ignored, don't add to states
        if (visibility === 'hidden') {
            // Skip entirely - chip won't appear in output
            continue;
        }

        // VISIBLE: Use defaultActive as baseline (will be overridden by dictation/user below)
        if (visibility === 'visible' && chip.defaultActive) {
            const isBefund = chip.category === 'befund';
            states.set(chip.id, {
                id: chip.id,
                active: true,
                source: 'default',
                confidence: 0.5,
                needsConfirmation: isBefund
            });

            // MUTUAL EXCLUSIVITY: Mark conflicting chips as inactive
            for (const excludedId of chip.mutuallyExclusiveWith || []) {
                const excludedVis = chipVisibility[excludedId];
                if (excludedVis === 'locked_on' || excludedVis === 'locked_off') continue;
                if (!states.has(excludedId)) {
                    states.set(excludedId, {
                        id: excludedId,
                        active: false,
                        source: 'default',
                        confidence: 0.5,
                        needsConfirmation: false
                    });
                }
            }
        }
    }

    // 2. DICTATION überschreibt Defaults (but not locked_on/locked_off)
    // Process in order - chips with defaultActive have priority
    const sortedExtractedChips = [...extractedChips].sort((a, b) => {
        const chipA = treatment.chips.find(c => c.id === a);
        const chipB = treatment.chips.find(c => c.id === b);
        // Chips with defaultActive come first (priority)
        return (chipB?.defaultActive ? 1 : 0) - (chipA?.defaultActive ? 1 : 0);
    });

    for (const chipId of sortedExtractedChips) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip) continue;

        // Don't override settings-locked chips
        const visibility = chipVisibility[chipId];
        if (visibility === 'locked_on' || visibility === 'locked_off') continue;
        // Don't activate hidden chips
        if (visibility === 'hidden') continue;

        // DICTATION ALWAYS OVERRIDES DEFAULTS
        // No priority blocking - the mutual exclusivity below will handle conflicts

        // Aktiviere den erkannten Chip
        states.set(chipId, {
            id: chipId,
            active: true,
            source: 'dictation',
            confidence: 0.85,
            needsConfirmation: false
        });

        // MUTUAL EXCLUSIVITY: Deaktiviere konfliktierende Chips
        for (const excludedId of chip.mutuallyExclusiveWith || []) {
            const excludedVis = chipVisibility[excludedId];
            // Don't override locked chips
            if (excludedVis === 'locked_on' || excludedVis === 'locked_off') continue;

            const current = states.get(excludedId);
            // Nur überschreiben wenn noch nicht user-gesetzt
            if (!current || current.source !== 'user') {
                states.set(excludedId, {
                    id: excludedId,
                    active: false,
                    source: 'dictation',
                    confidence: 0.85,
                    needsConfirmation: false
                });
            }
        }
    }

    // 3. USER OVERRIDES haben höchste Priorität (runtime clicks)
    for (const [chipId, active] of userOverrides) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip) continue;

        // Don't override settings-locked chips
        const visibility = chipVisibility[chipId];
        if (visibility === 'locked_on' || visibility === 'locked_off') continue;

        // User-Entscheidung = volle Confidence, keine Bestätigung nötig
        states.set(chipId, {
            id: chipId,
            active,
            source: 'user',
            confidence: 1.0,
            needsConfirmation: false
        });

        // MUTUAL EXCLUSIVITY auch bei User-Klick erzwingen
        if (active) {
            for (const excludedId of chip.mutuallyExclusiveWith || []) {
                const excludedVis = chipVisibility[excludedId];
                if (excludedVis === 'locked_on' || excludedVis === 'locked_off') continue;

                const current = states.get(excludedId);
                if (current && current.active) {
                    states.set(excludedId, {
                        id: excludedId,
                        active: false,
                        source: 'user',
                        confidence: 1.0,
                        needsConfirmation: false
                    });
                }
            }
        }
    }

    return Array.from(states.values());
}

/**
 * Konvertiert ChipState[] zu einfachem string[] für aktive Chips
 * (Für Backwards-Compatibility mit existierendem Code)
 */
export function getActiveChipIds(chipStates: ChipState[]): string[] {
    return chipStates
        .filter(cs => cs.active)
        .map(cs => cs.id);
}

/**
 * Prüft ob ein Befund/Chip Bestätigung braucht
 */
export function chipNeedsConfirmation(chipId: string, chipStates: ChipState[]): boolean {
    const state = chipStates.find(cs => cs.id === chipId);
    return state?.needsConfirmation ?? false;
}
// FINAL DOCUMENTATION GENERATOR
// ========================================

import { ExtractedDataWithExtras, FinalDocumentation } from './types';

/**
 * Generate final documentation with all zusatzinfos
 * Combines engine output with extracted extras - nothing is lost!
 */
export function generateFinalDocumentation(
    treatment: TreatmentDefinition,
    insuranceType: InsuranceType,
    activeChips: string[],
    extractedData: ExtractedDataWithExtras,
    acceptedUpsells: string[] = [],
    textLength: TextLength = 'mittel'  // NEW: Text length parameter
): FinalDocumentation {

    // 1. Engine verarbeitet Standard-Output
    const context: TreatmentContext = {
        treatment,
        insuranceType,
        activeChips,
        extractedData: {
            surfaces: extractedData.surfaces,
            diagnosis: extractedData.diagnosis,
            material: extractedData.material,
            shade: extractedData.shade
        },
        acceptedUpsells,
        textLength  // Pass to engine for snippet resolution
    };

    const engineResult = processTreatment(context);

    // 2. Surfaces String bauen
    const surfacesStr = (extractedData.surfaces || []).map(s => s.toUpperCase()).join('/');

    // 3. Fließtext zusammenbauen - use 3-tier text if available
    const consentText = getSnippetForLength(treatment.consentTexts, treatment.consentText, textLength);
    let prose = consentText || '';

    // Anamnese zuerst (wenn vorhanden)
    if (extractedData.anamnese?.length) {
        prose += ' Anamnese: ' + extractedData.anamnese.join('; ') + '.';
    }

    // Standard-Snippets
    prose += ' ' + engineResult.procedureSnippets.filter(s => s).join(' ');

    // Komplikationen einfügen (wenn vorhanden)
    if (extractedData.komplikationen?.length) {
        prose += ' Komplikation: ' + extractedData.komplikationen.join('; ') + '.';
    }

    // Zusatzinfos anhängen
    if (extractedData.zusatzinfos?.length) {
        prose += ' Zusätzlich: ' + extractedData.zusatzinfos.join('; ') + '.';
    }

    // Hinweise am Ende
    if (extractedData.hinweise?.length) {
        prose += ' Hinweis: ' + extractedData.hinweise.join('; ') + '.';
    }

    // Dismissal-Text - use 3-tier text if available
    const dismissalText = getSnippetForLength(treatment.dismissalTexts, treatment.dismissalText, textLength);
    prose += ' ' + (dismissalText || '');

    // Whitespace normalisieren
    prose = prose.replace(/\s+/g, ' ').trim();

    // 4. Alle Zusatzinfos sammeln
    const alleZusatzinfos = [
        ...(extractedData.anamnese || []),
        ...(extractedData.komplikationen || []),
        ...(extractedData.zusatzinfos || []),
        ...(extractedData.hinweise || [])
    ];

    // 5. Build header with costs if present
    let header = `Zahn: ${extractedData.tooth || '?'} (${surfacesStr || '?'})`;
    if (extractedData.diagnosis) {
        header += ` | ${extractedData.diagnosis}`;
    }
    if (extractedData.costs || extractedData.kosten) {
        header += ` | Kosten: ${extractedData.costs || extractedData.kosten} €`;
    }

    // 6. Build Befund line only from active befund chips
    const befundParts: string[] = [];
    if (activeChips.includes('vipr_pos')) {
        befundParts.push('ViPr +');
    } else if (activeChips.includes('vipr_neg')) {
        befundParts.push('ViPr −');
    }
    if (activeChips.includes('perk_pos')) {
        befundParts.push('Perk +');
    } else if (activeChips.includes('perk_neg')) {
        befundParts.push('Perk −');
    }
    // Add other befund chips if present
    if (activeChips.includes('spontan_pos')) {
        befundParts.push('Spontanschmerz +');
    }
    if (activeChips.includes('spontan_neg')) {
        befundParts.push('Spontanschmerz −');
    }

    const befundLine = befundParts.length > 0
        ? `Befund: ${befundParts.join(' / ')}`
        : '';

    return {
        uebersicht: {
            header,
            befund: befundLine,
            leistungen: engineResult.textLines.filter(l => l.length > 0),
            codes: engineResult.billingCodes,
            kosten: extractedData.costs || extractedData.kosten || null
        },
        fliesstext: prose,
        zusatzinfos: alleZusatzinfos
    };
}

