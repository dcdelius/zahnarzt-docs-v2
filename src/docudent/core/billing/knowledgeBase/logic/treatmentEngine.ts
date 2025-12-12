/**
 * Treatment Engine - ZENTRALE Verarbeitung
 * 
 * Diese Engine ist die EINZIGE Stelle die Chips zu Billing-Codes und Text mappt.
 * Liest aus:
 * - behandlungen/*.json (Chips, TextSnippets, billingRefs)
 * - kataloge/bema.json, goz.json (Code-Details, Punkte, Beträge)
 * - regeln/kombinationen.json (Ausschlussregeln)
 * 
 * KEINE HARDCODIERTEN WERTE!
 */

import type { InsuranceType } from './billingRegistry';

// ESM JSON imports for browser compatibility (no require()!)
import fuellungUnified from '../behandlungen/fuellung_unified.json';
import bemaKatalog from '../kataloge/bema.json';
import gozKatalog from '../kataloge/goz.json';
import kombinationenRegeln from '../regeln/kombinationen.json';
import fuellungRegeln from '../regeln/fuellung_regeln.json';


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChipDefinition {
    id: string;
    label: string;
    phase: string;
    category: 'befund' | 'leistung';
    textSnippets: {
        kurz: string;
        mittel: string;
        lang: string;
    };
    billingRef: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    } | null;
    variablen?: Record<string, {
        required?: boolean;
        default?: string;
        options?: string[];
    }>;
    dataPatches?: { field: string; value: any }[];
    mutuallyExclusiveWith?: string[];
    defaultActive?: boolean;
    showInQuickView?: boolean;
    dokumentation_required?: string;
    hinweis?: string;
    conditionHint?: string;
    konflikt_regel?: string;
    // NEW: Rule-driven architecture fields
    requiredFields?: string[];
    ruleRefs?: string[];
    forensicNotes?: string[];
    upsellCandidate?: boolean;
    upsellNotes?: string[];
    questionKey?: string; // NEW: SSOT key for QuestionBank
}

// Rule definition from regeln/*.json
export interface RuleDefinition {
    id: string;
    appliesTo: string[];
    shortSummary: string;
    triggerField?: string;
    triggerValue?: string;
    riskLevel: 'hoch' | 'mittel' | 'niedrig';
    regressRisk?: boolean;
    questionTrigger?: boolean;
    questionText?: string;
    auditWarning?: string;
    auditOptimization?: string;
    insuranceCondition?: string;
    condition?: string;
    source: string;
}


export interface TreatmentJSON {
    _meta: {
        id: string;
        version: string;
        label: string;
    };
    chips: ChipDefinition[];
    surface_mapping: Record<string, { GKV: string; PKV: string }>;
    phasen_reihenfolge: string[];
    consent_texts: { kurz: string; mittel: string; lang: string };
    dismissal_texts: { kurz: string; mittel: string; lang: string };
    ausschluesse: string[];
    dokumentation_erforderlich: string[];
    regressfallen: string[];
    optimierung_tipps: string[];
}

export interface ExtractedData {
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    material?: string;
    [key: string]: any;
}

export interface ProcessingResult {
    billingCodes: string[];
    textLines: string[];
    warnings: string[];
    optimierungen: string[];
    billingDetails: {
        code: string;
        bezeichnung: string;
        punkte?: number;
        betrag?: number;
    }[];
}

export type TextLength = 'kurz' | 'mittel' | 'lang';

// ═══════════════════════════════════════════════════════════════
// TREATMENT LOADER (aus JSON)
// ═══════════════════════════════════════════════════════════════

let _treatmentCache: Map<string, TreatmentJSON> = new Map();

export function loadTreatmentJSON(treatmentId: string): TreatmentJSON | null {
    if (_treatmentCache.has(treatmentId)) {
        return _treatmentCache.get(treatmentId)!;
    }

    // ESM static imports - switch based on treatmentId
    let json: TreatmentJSON;
    switch (treatmentId) {
        case 'fuellung':
            json = fuellungUnified as unknown as TreatmentJSON;
            break;
        // Weitere Behandlungen hier hinzufügen
        default:
            console.warn(`[TreatmentEngine] Unbekannte Behandlung: ${treatmentId}`);
            return null;
    }
    _treatmentCache.set(treatmentId, json);
    return json;
}

// ═══════════════════════════════════════════════════════════════
// BILLING CODE LOOKUP (aus Katalogen)
// ═══════════════════════════════════════════════════════════════

let _bemaCache: Record<string, any> | null = null;
let _gozCache: Record<string, any> | null = null;

function loadBemaCatalog(): Record<string, any> {
    if (!_bemaCache) {
        _bemaCache = bemaKatalog as Record<string, any>;
    }
    return _bemaCache;
}

function loadGozCatalog(): Record<string, any> {
    if (!_gozCache) {
        _gozCache = gozKatalog as Record<string, any>;
    }
    return _gozCache;
}

export function lookupBillingCode(codeId: string): {
    code: string;
    bezeichnung: string;
    punkte?: number;
    betrag_23?: number;
    dokumentation_erforderlich?: string[];
    regressfalle?: string;
} | null {
    if (codeId.startsWith('BEMA_')) {
        const catalog = loadBemaCatalog();
        const entry = catalog[codeId];
        if (entry) {
            return {
                code: entry.nummer || codeId.replace('BEMA_', ''),
                bezeichnung: entry.bezeichnung || entry.kurzform || '',
                punkte: entry.punkte,
                dokumentation_erforderlich: entry.dokumentation_erforderlich,
                regressfalle: entry.regressfalle
            };
        }
    } else if (codeId.startsWith('GOZ_')) {
        const catalog = loadGozCatalog();
        const entry = catalog[codeId];
        if (entry) {
            // GOZ catalog uses honorar.standard for 2.3x factor
            const betrag = entry.honorar?.standard || entry.betrag_23;
            return {
                code: entry.nummer || codeId.replace('GOZ_', ''),
                bezeichnung: entry.bezeichnung || '',
                betrag_23: betrag,
                dokumentation_erforderlich: entry.dokumentation_erforderlich
            };
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// KOMBINATIONSREGELN (aus regeln/kombinationen.json)
// ═══════════════════════════════════════════════════════════════

let _kombinationenCache: any[] | null = null;

function loadKombinationen(): any[] {
    if (!_kombinationenCache) {
        const data = kombinationenRegeln as any;
        _kombinationenCache = data.regeln || data;
    }
    return _kombinationenCache;
}

export function checkCombinationConflicts(codes: string[]): {
    regelId: string;
    titel: string;
    message: string;
    affectedCodes: string[];
    severity: 'blocker' | 'warnung';
}[] {
    const regeln = loadKombinationen();
    const violations: any[] = [];

    for (const regel of regeln) {
        if (regel.typ === 'ausschluss') {
            // Prüfe ob betroffene Codes alle vorhanden sind
            const betroffen = regel.betrifft || [];
            const matching = betroffen.filter((c: string) => codes.includes(c));

            if (matching.length >= 2) {
                violations.push({
                    regelId: regel.id,
                    titel: regel.titel,
                    message: regel.beschreibung,
                    affectedCodes: matching,
                    severity: regel.schweregrad === 'regress' ? 'blocker' : 'warnung'
                });
            }
        }
    }

    return violations;
}

// ═══════════════════════════════════════════════════════════════
// ZENTRALE VERARBEITUNG
// ═══════════════════════════════════════════════════════════════

export function processChipsToBilling(
    treatmentId: string,
    activeChipIds: string[],
    insuranceType: InsuranceType,
    hasMKV: boolean,
    extractedData: ExtractedData,
    textLength: TextLength = 'mittel',
    variablenValues: Record<string, string> = {}
): ProcessingResult {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) {
        return {
            billingCodes: [],
            textLines: [],
            warnings: [`Behandlung "${treatmentId}" nicht gefunden`],
            optimierungen: [],
            billingDetails: []
        };
    }

    const billingCodes: string[] = [];
    const textLines: string[] = [];
    const warnings: string[] = [];
    const billingDetails: ProcessingResult['billingDetails'] = [];

    // Sortiere Chips nach Phasen-Reihenfolge
    const orderedChipIds = [...activeChipIds].sort((a, b) => {
        const chipA = treatment.chips.find(c => c.id === a);
        const chipB = treatment.chips.find(c => c.id === b);
        const phaseA = chipA ? treatment.phasen_reihenfolge.indexOf(chipA.phase) : 999;
        const phaseB = chipB ? treatment.phasen_reihenfolge.indexOf(chipB.phase) : 999;
        return phaseA - phaseB;
    });

    // ═══════════════════════════════════════════════════════════
    // 1. Für jeden Chip: Code + Text aus JSON holen
    // ═══════════════════════════════════════════════════════════
    for (const chipId of orderedChipIds) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip) continue;

        // Billing Code aus billingRef holen (basierend auf Versicherung)
        let codeId: string | null = null;
        if (chip.billingRef) {
            if (hasMKV && chip.billingRef.MKV) {
                // MKV-Code (Zuzahlung bei GKV)
                codeId = chip.billingRef.MKV;
            } else if (insuranceType === 'GKV' && chip.billingRef.GKV) {
                codeId = chip.billingRef.GKV;
            } else if (insuranceType === 'PKV' && chip.billingRef.PKV) {
                codeId = chip.billingRef.PKV;
            }
        }

        if (codeId) {
            // Lookup in Katalog
            const codeDetail = lookupBillingCode(codeId);
            if (codeDetail) {
                billingCodes.push(codeId);
                billingDetails.push({
                    code: codeId,
                    bezeichnung: codeDetail.bezeichnung,
                    punkte: codeDetail.punkte,
                    betrag: codeDetail.betrag_23
                });

                // Dokumentationsanforderung prüfen
                if (chip.dokumentation_required) {
                    warnings.push(`⚠️ ${chip.dokumentation_required}`);
                }
            }
        }

        // Text generieren (mit Variablen-Substitution)
        let text = chip.textSnippets[textLength] || chip.textSnippets.mittel;
        if (chip.variablen) {
            for (const [key, config] of Object.entries(chip.variablen)) {
                const value = variablenValues[key] || config.default || '';
                text = text.replace(`{${key}}`, value);
            }
        }
        if (text && text.trim()) {
            textLines.push(text);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Flächen-basierter F-Code (aus surface_mapping)
    // ═══════════════════════════════════════════════════════════
    if (extractedData.surfaces && extractedData.surfaces.length > 0) {
        const surfaceCount = extractedData.surfaces.length;
        const key = surfaceCount >= 4 ? '4+' : String(surfaceCount);
        const surfaceMapping = treatment.surface_mapping[key];

        if (surfaceMapping) {
            const fCodeId = insuranceType === 'GKV' ? surfaceMapping.GKV : surfaceMapping.PKV;
            if (fCodeId && !billingCodes.includes(fCodeId)) {
                const fCodeDetail = lookupBillingCode(fCodeId);
                if (fCodeDetail) {
                    billingCodes.push(fCodeId);
                    billingDetails.push({
                        code: fCodeId,
                        bezeichnung: fCodeDetail.bezeichnung,
                        punkte: fCodeDetail.punkte,
                        betrag: fCodeDetail.betrag_23
                    });
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Kombinationsregeln prüfen & anwenden
    // ═══════════════════════════════════════════════════════════
    const conflicts = checkCombinationConflicts(billingCodes);
    for (const conflict of conflicts) {
        if (conflict.severity === 'blocker') {
            // Entferne den konfliktierenden Code (außer dem ersten)
            const codesToRemove = conflict.affectedCodes.slice(1);
            for (const removeCode of codesToRemove) {
                const idx = billingCodes.indexOf(removeCode);
                if (idx > -1) {
                    billingCodes.splice(idx, 1);
                    const detailIdx = billingDetails.findIndex(d => d.code === removeCode);
                    if (detailIdx > -1) billingDetails.splice(detailIdx, 1);
                }
            }
            warnings.push(`🔴 REGRESS: ${conflict.titel} - Code automatisch entfernt`);
        } else {
            warnings.push(`⚠️ ${conflict.titel}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Forensische Warnungen regelgetrieben prüfen (SSOT)
    // ═══════════════════════════════════════════════════════════

    // Warnungen kommen aus Regeln, nicht hardcoded
    const auditResult = generateAuditNotes(
        treatmentId,
        activeChipIds,
        insuranceType,
        extractedData
    );
    warnings.push(...auditResult.warnings);

    // ═══════════════════════════════════════════════════════════
    // 5. Optimierungstipps prüfen
    // ═══════════════════════════════════════════════════════════
    const optimierungen: string[] = [];
    for (const tip of (treatment.optimierung_tipps || [])) {
        // Prüfe ob Tipp relevant ist
        if (tip.includes('GOZ 0080') && insuranceType === 'PKV' && !billingCodes.includes('GOZ_0080')) {
            optimierungen.push(`💡 ${tip}`);
        }
        if (tip.includes('Unterfüllung') && !billingCodes.includes('GOZ_2050') && insuranceType === 'PKV') {
            // Nur wenn tiefe Karies erkannt
            const hasCp = activeChipIds.includes('cp') || activeChipIds.includes('p');
            if (hasCp) {
                optimierungen.push(`💡 ${tip}`);
            }
        }
    }

    return {
        billingCodes,
        textLines,
        warnings,
        optimierungen,
        billingDetails
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get all chips for a treatment
// ═══════════════════════════════════════════════════════════════

export function getTreatmentChips(treatmentId: string): ChipDefinition[] {
    const treatment = loadTreatmentJSON(treatmentId);
    return treatment?.chips || [];
}

export function getDefaultActiveChipsFromJSON(treatmentId: string): string[] {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return [];
    return treatment.chips.filter(c => c.defaultActive).map(c => c.id);
}

// ═══════════════════════════════════════════════════════════════
// CHIP STATE RESOLUTION (migriert von engine.ts)
// ═══════════════════════════════════════════════════════════════

export type ChipSource = 'default' | 'dictation' | 'user' | 'settings';

export interface ChipState {
    id: string;
    active: boolean;
    source: ChipSource;
    confidence: number;
    needsConfirmation: boolean;
}

/**
 * INFER CHIPS FROM DICTATION
 * 
 * Maps dictation keywords to chip IDs.
 * This is the critical bridge: Dictation → Chips → Billing
 */
export function inferChipsFromDictation(
    dictation: string,
    treatmentId: string = 'fuellung',
    extracted?: Record<string, any>
): string[] {
    const chips: string[] = [];
    const lower = dictation.toLowerCase();

    // ════════════════════════════════════════════════════════════════
    // ANÄSTHESIE - Smart Detection based on Tooth Position!
    // UK Molaren (36-48) → Leitung, OK/UK Front → Infiltration
    // ════════════════════════════════════════════════════════════════
    const tooth = extracted?.tooth;
    const hasAnesthesiaKeyword = lower.includes('anästhesie') || lower.includes('betäub') ||
        lower.includes(' la ') || lower.includes('spritze');

    // Explizit Leitungsanästhesie erwähnt
    if (lower.includes('leitungs') || lower.includes('leitung') ||
        lower.includes('n. alv') || lower.includes('mandibular')) {
        chips.push('la_leitung');
    }
    // Explizit Infiltration erwähnt
    else if (lower.includes('infiltr') || lower.includes('injektion')) {
        chips.push('la_infiltr');
    }
    // Explizit keine Anästhesie
    else if (lower.includes('ohne anästhesie') || lower.includes('ohne la') ||
        lower.includes('keine anästhesie')) {
        chips.push('ohne_la');
    }
    // Nur "Anästhesie" oder "mit Spritze" → Automatisch basierend auf Zahnposition
    else if (hasAnesthesiaKeyword && tooth) {
        // UK Molaren (36-38, 46-48) → Leitung!
        const toothNum = parseInt(tooth.replace(/\D/g, ''), 10);
        const isUKMolar = (toothNum >= 35 && toothNum <= 38) || (toothNum >= 45 && toothNum <= 48);
        if (isUKMolar) {
            chips.push('la_leitung');
        } else {
            chips.push('la_infiltr');
        }
    }
    // General "anästhesie" ohne Zahn → Default Infiltration
    else if (hasAnesthesiaKeyword) {
        chips.push('la_infiltr');
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
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('mehrschicht') || lower.includes('schichttechnik') ||
        lower.includes('schichtweise') || lower.includes('inkrement')) {
        chips.push('mehrschicht');
    } else if (lower.includes('komposit') || lower.includes('adhäsiv') ||
        lower.includes('ätz') || lower.includes('bond')) {
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
    // FINISHING
    // ════════════════════════════════════════════════════════════════
    if (lower.includes('politur') || lower.includes('okklusion') ||
        lower.includes('einschleifen') || lower.includes('finish')) {
        chips.push('finishing');
    }

    // ════════════════════════════════════════════════════════════════
    // BEFUND (from extracted data)
    // ════════════════════════════════════════════════════════════════
    if (extracted?.vitality === '+' || (lower.includes('vital') && !lower.includes('devital'))) {
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

/**
 * Resolves chip states with priority: user > dictation > settings > default
 */
export function resolveChipStates(
    treatmentId: string,
    extractedChips: string[],
    userOverrides: Map<string, boolean> = new Map(),
    chipVisibility: Record<string, string> = {}
): ChipState[] {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return [];

    const states = new Map<string, ChipState>();

    // 1. SETTINGS: Process locked_on and locked_off FIRST
    for (const chip of treatment.chips) {
        const visibility = chipVisibility[chip.id] || 'visible'; // Default: visible

        if (visibility === 'locked_on') {
            states.set(chip.id, {
                id: chip.id,
                active: true,
                source: 'settings',
                confidence: 1.0,
                needsConfirmation: false
            });
            continue;
        }

        if (visibility === 'locked_off') {
            states.set(chip.id, {
                id: chip.id,
                active: false,
                source: 'settings',
                confidence: 1.0,
                needsConfirmation: false
            });
            continue;
        }

        if (visibility === 'hidden') {
            continue;
        }

        // VISIBLE chips: Do NOT auto-activate based on defaultActive!
        // Chips should only be active if:
        // 1. Explicitly dictated (handled in step 2)
        // 2. Toggled on by user (handled in step 3)
        // 3. locked_on in settings (handled above)
        // 
        // This prevents "hallucinated" output from chips that weren't mentioned!
    }

    // 2. DICTATION überschreibt Defaults
    for (const chipId of extractedChips) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip) continue;

        const visibility = chipVisibility[chipId];
        if (visibility === 'locked_on' || visibility === 'locked_off' || visibility === 'hidden') continue;

        states.set(chipId, {
            id: chipId,
            active: true,
            source: 'dictation',
            confidence: 0.85,
            needsConfirmation: false
        });

        // MUTUAL EXCLUSIVITY
        for (const excludedId of chip.mutuallyExclusiveWith || []) {
            const current = states.get(excludedId);
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

    // 3. USER OVERRIDES haben höchste Priorität
    for (const [chipId, active] of userOverrides) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip) continue;

        const visibility = chipVisibility[chipId];
        if (visibility === 'locked_on' || visibility === 'locked_off') continue;

        states.set(chipId, {
            id: chipId,
            active,
            source: 'user',
            confidence: 1.0,
            needsConfirmation: false
        });

        if (active) {
            for (const excludedId of chip.mutuallyExclusiveWith || []) {
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
 */
export function getActiveChipIds(chipStates: ChipState[]): string[] {
    return chipStates
        .filter(cs => cs.active)
        .map(cs => cs.id);
}

// ═══════════════════════════════════════════════════════════════
// FINAL DOCUMENTATION (verwendet processChipsToBilling)
// ═══════════════════════════════════════════════════════════════

export interface FinalDocumentation {
    uebersicht: {
        header: string;
        befund: string;
        leistungen: string[];
        codes: string[];
        kosten: string | number | null;
    };
    fliesstext: string;
    zusatzinfos: string[];
}

export interface ExtractedDataWithExtras extends ExtractedData {
    tooth?: string;
    anamnese?: string[];
    komplikationen?: string[];
    zusatzinfos?: string[];
    hinweise?: string[];
    costs?: string | number;
    kosten?: string | number;
    shade?: string;
}

/**
 * Generate final documentation using the centralized processChipsToBilling
 */
export function generateFinalDocumentation(
    treatmentId: string,
    insuranceType: InsuranceType,
    activeChips: string[],
    extractedData: ExtractedDataWithExtras,
    hasMKV: boolean = false,
    textLength: TextLength = 'mittel'
): FinalDocumentation {
    // 1. Use central billing processor
    const result = processChipsToBilling(
        treatmentId,
        activeChips,
        insuranceType,
        hasMKV,
        extractedData,
        textLength
    );

    const treatment = loadTreatmentJSON(treatmentId);

    // 2. Surfaces String bauen
    const surfacesStr = (extractedData.surfaces || []).map(s => s.toUpperCase()).join('/');

    // 3. Fließtext zusammenbauen
    let prose = treatment?.consent_texts?.[textLength] || '';

    if (extractedData.anamnese?.length) {
        prose += ' Anamnese: ' + extractedData.anamnese.join('; ') + '.';
    }

    prose += ' ' + result.textLines.filter(s => s).join(' ');

    if (extractedData.komplikationen?.length) {
        prose += ' Komplikation: ' + extractedData.komplikationen.join('; ') + '.';
    }

    if (extractedData.zusatzinfos?.length) {
        prose += ' Zusätzlich: ' + extractedData.zusatzinfos.join('; ') + '.';
    }

    if (extractedData.hinweise?.length) {
        prose += ' Hinweis: ' + extractedData.hinweise.join('; ') + '.';
    }

    prose += ' ' + (treatment?.dismissal_texts?.[textLength] || '');
    prose = prose.replace(/\s+/g, ' ').trim();

    // 4. Alle Zusatzinfos sammeln
    const alleZusatzinfos = [
        ...(extractedData.anamnese || []),
        ...(extractedData.komplikationen || []),
        ...(extractedData.zusatzinfos || []),
        ...(extractedData.hinweise || [])
    ];

    // 5. Header bauen
    let header = `Zahn: ${extractedData.tooth || '?'} (${surfacesStr || '?'})`;
    if (extractedData.diagnosis) {
        header += ` | ${extractedData.diagnosis}`;
    }
    if (extractedData.costs || extractedData.kosten) {
        header += ` | Kosten: ${extractedData.costs || extractedData.kosten} €`;
    }

    // 6. Befund-Zeile aus aktiven Befund-Chips
    const befundParts: string[] = [];
    if (activeChips.includes('vipr_pos')) befundParts.push('ViPr +');
    else if (activeChips.includes('vipr_neg')) befundParts.push('ViPr −');
    if (activeChips.includes('perk_pos')) befundParts.push('Perk +');
    else if (activeChips.includes('perk_neg')) befundParts.push('Perk −');
    if (activeChips.includes('spont_pos')) befundParts.push('Spontanschmerz +');
    else if (activeChips.includes('spont_neg')) befundParts.push('Spontanschmerz −');

    const befundLine = befundParts.length > 0 ? `Befund: ${befundParts.join(' / ')}` : '';

    return {
        uebersicht: {
            header,
            befund: befundLine,
            leistungen: result.textLines.filter(l => l.length > 0),
            codes: result.billingCodes,
            kosten: extractedData.costs || extractedData.kosten || null
        },
        fliesstext: prose,
        zusatzinfos: alleZusatzinfos
    };
}

// ═══════════════════════════════════════════════════════════════
// CHIP BILLING LOOKUP (SSOT-konform!)
// ═══════════════════════════════════════════════════════════════

export interface ChipBillingInfo {
    code: string | null;
    price: number;
    label: string;
}

/**
 * Get billing code and price for a chip by ID and insurance type
 * This is the SSOT-compliant way to check for chip billing codes!
 * 
 * @param treatmentId - e.g. 'fuellung'
 * @param chipId - e.g. 'kofferdam'
 * @param insuranceType - 'GKV' | 'PKV'
 * @returns ChipBillingInfo with code, price, and display label
 */
export function getChipBillingInfo(
    treatmentId: string,
    chipId: string,
    insuranceType: InsuranceType
): ChipBillingInfo {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) {
        return { code: null, price: 0, label: '' };
    }

    const chip = treatment.chips.find(c => c.id === chipId);
    if (!chip || !chip.billingRef) {
        return { code: null, price: 0, label: chip?.label || '' };
    }

    // Get code based on insurance type
    const codeId = insuranceType === 'GKV'
        ? chip.billingRef.GKV
        : chip.billingRef.PKV;

    if (!codeId) {
        return { code: null, price: 0, label: chip.label };
    }

    // Lookup price from catalog
    const codeDetail = lookupBillingCode(codeId);
    let price = 0;
    if (codeDetail) {
        if (codeId.startsWith('GOZ_')) {
            price = codeDetail.betrag_23 || 0;
        } else if (codeId.startsWith('BEMA_')) {
            // BEMA: punkte * Punktwert (1.0375 für 2025)
            price = (codeDetail.punkte || 0) * 1.0375;
        }
    }

    return {
        code: codeId,
        price,
        label: chip.label
    };
}

/**
 * Check if any billing codes in the list match a chip's billing codes
 * SSOT-compliant replacement for hardcoded code checks like codes.includes('GOZ_2040')
 * 
 * @param treatmentId - e.g. 'fuellung'
 * @param chipId - e.g. 'kofferdam'
 * @param codes - List of billing codes to check
 * @returns true if any of the chip's billing codes are in the list
 */
export function hasChipBillingCode(
    treatmentId: string,
    chipId: string,
    codes: string[]
): boolean {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return false;

    const chip = treatment.chips.find(c => c.id === chipId);
    if (!chip || !chip.billingRef) return false;

    // Check all possible billing codes for this chip
    const chipCodes = [
        chip.billingRef.GKV,
        chip.billingRef.PKV,
        chip.billingRef.MKV
    ].filter(Boolean) as string[];

    return codes.some(code => chipCodes.includes(code));
}

/**
 * Get display label for a chip's billing codes (e.g., "GOZ 2040 / BEMA 12")
 * SSOT-compliant replacement for hardcoded labels in UI
 */
export function getChipBillingLabel(
    treatmentId: string,
    chipId: string
): string {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return '';

    const chip = treatment.chips.find(c => c.id === chipId);
    if (!chip || !chip.billingRef) return '';

    const parts: string[] = [];
    if (chip.billingRef.PKV) {
        // Format: GOZ_2040 → GOZ 2040
        parts.push(chip.billingRef.PKV.replace('_', ' '));
    }
    if (chip.billingRef.GKV) {
        parts.push(chip.billingRef.GKV.replace('_', ' '));
    }

    return parts.join(' / ');
}

// ═══════════════════════════════════════════════════════════════
// RULE-DRIVEN ARCHITECTURE FUNCTIONS
// "Database = Brain" - Questions arise from rules, not templates
// ═══════════════════════════════════════════════════════════════

let _rulesCache: Map<string, RuleDefinition[]> = new Map();

/**
 * Load rules for a treatment from regeln/*.json
 */
export function loadRules(treatmentId: string): RuleDefinition[] {
    if (_rulesCache.has(treatmentId)) {
        return _rulesCache.get(treatmentId)!;
    }

    let rules: RuleDefinition[] = [];
    switch (treatmentId) {
        case 'fuellung':
            rules = (fuellungRegeln as any).rules || [];
            break;
        // Add more treatments here
        default:
            console.warn(`[TreatmentEngine] No rules found for: ${treatmentId}`);
    }

    _rulesCache.set(treatmentId, rules);
    return rules;
}

/**
 * Get missing required fields for active chips
 * Used to generate forensic questions
 */
export function getMissingRequiredFields(
    treatmentId: string,
    activeChipIds: string[],
    extractedData: Record<string, any>
): { field: string; chip: ChipDefinition; rule?: RuleDefinition }[] {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return [];

    const missing: { field: string; chip: ChipDefinition; rule?: RuleDefinition }[] = [];
    const rules = loadRules(treatmentId);

    // Check global required fields
    const globalRequired = (treatment as any).requiredFieldsGlobal || [];
    for (const field of globalRequired) {
        if (!extractedData[field]) {
            const globalChip: ChipDefinition = {
                id: `_global_${field}`,
                label: field,
                phase: 'global',
                category: 'befund',
                textSnippets: { kurz: '', mittel: '', lang: '' },
                billingRef: null
            };
            missing.push({ field, chip: globalChip });
        }
    }

    // Check per-chip required fields
    for (const chipId of activeChipIds) {
        const chip = treatment.chips.find(c => c.id === chipId);
        if (!chip || !chip.requiredFields) continue;

        for (const field of chip.requiredFields) {
            if (!extractedData[field]) {
                // Find associated rule
                const rule = rules.find(r =>
                    r.appliesTo.includes(chipId) &&
                    r.triggerField === field
                );
                missing.push({ field, chip, rule });
            }
        }
    }

    // Dedupe by field name
    const seen = new Set<string>();
    return missing.filter(m => {
        if (seen.has(m.field)) return false;
        seen.add(m.field);
        return true;
    });
}

/**
 * Get rules that apply to active chips
 */
export function getApplicableRules(
    treatmentId: string,
    activeChipIds: string[],
    insuranceType: InsuranceType,
    extractedData: Record<string, any> = {}
): RuleDefinition[] {
    const rules = loadRules(treatmentId);
    const applicable: RuleDefinition[] = [];

    for (const rule of rules) {
        // Check if rule applies to any active chip
        const applies = rule.appliesTo.some(chipId => activeChipIds.includes(chipId));
        if (!applies) continue;

        // Check insurance condition
        if (rule.insuranceCondition) {
            if (rule.insuranceCondition === 'PKV' && insuranceType !== 'PKV') continue;
            if (rule.insuranceCondition === 'GKV' && insuranceType !== 'GKV') continue;
            if (rule.insuranceCondition === 'MKV' && insuranceType !== 'GKV') continue;
        }

        // Check trigger value condition
        if (rule.triggerField && rule.triggerValue) {
            const actualValue = extractedData[rule.triggerField];
            if (actualValue !== rule.triggerValue) continue;
        }

        applicable.push(rule);
    }

    return applicable;
}

/**
 * Get chips marked as upsell candidates
 */
export function getUpsellChips(
    treatmentId: string,
    insuranceType: InsuranceType,
    hasMKV: boolean
): ChipDefinition[] {
    const treatment = loadTreatmentJSON(treatmentId);
    if (!treatment) return [];

    return treatment.chips.filter(chip => {
        if (!chip.upsellCandidate) return false;

        // Check if chip has billing for this insurance mode
        if (hasMKV && chip.billingRef?.MKV) return true;
        if (insuranceType === 'PKV' && chip.billingRef?.PKV) return true;
        if (insuranceType === 'GKV' && chip.billingRef?.GKV) return true;

        return false;
    });
}

/**
 * Generate audit notes (warnings + optimizations) from rules
 */
export function generateAuditNotes(
    treatmentId: string,
    activeChipIds: string[],
    insuranceType: InsuranceType,
    extractedData: Record<string, any>
): { warnings: string[]; optimizations: string[] } {
    const rules = getApplicableRules(treatmentId, activeChipIds, insuranceType, extractedData);
    const warnings: string[] = [];
    const optimizations: string[] = [];

    for (const rule of rules) {
        if (rule.auditWarning) {
            // Check if warning condition is met
            let conditionMet = false;

            // Check triggerField + triggerValue match
            if (rule.triggerField && rule.triggerValue) {
                // Rule requires specific value (e.g., vitality = "-")
                conditionMet = extractedData[rule.triggerField] === rule.triggerValue;
            } else if (rule.triggerField && !extractedData[rule.triggerField]) {
                // Rule triggers when field is missing
                conditionMet = true;
            } else if (rule.regressRisk) {
                // High-risk rules always show warning
                conditionMet = true;
            }

            if (conditionMet) {
                warnings.push(rule.auditWarning);
            }
        }

        if (rule.auditOptimization) {
            optimizations.push(rule.auditOptimization);
        }
    }

    // Add forensic notes from chips
    const treatment = loadTreatmentJSON(treatmentId);
    if (treatment) {
        for (const chipId of activeChipIds) {
            const chip = treatment.chips.find(c => c.id === chipId);
            if (chip?.forensicNotes?.length) {
                for (const note of chip.forensicNotes) {
                    if (note.includes('REGRESS') || note.includes('MUSS')) {
                        warnings.push(note);
                    }
                }
            }
        }
    }

    return {
        warnings: [...new Set(warnings)],
        optimizations: [...new Set(optimizations)]
    };
}

/**
 * Check if a question should be asked based on rules
 */
export function shouldAskQuestion(
    treatmentId: string,
    field: string,
    activeChipIds: string[],
    insuranceType: InsuranceType
): boolean {
    const rules = loadRules(treatmentId);

    // Check if any rule triggers a question for this field
    for (const rule of rules) {
        if (!rule.questionTrigger) continue;
        if (rule.triggerField !== field) continue;
        if (!rule.appliesTo.some(id => activeChipIds.includes(id))) continue;

        // Check insurance condition
        if (rule.insuranceCondition) {
            if (rule.insuranceCondition === 'PKV' && insuranceType !== 'PKV') continue;
            if (rule.insuranceCondition === 'GKV' && insuranceType !== 'GKV') continue;
        }

        return true;
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const TreatmentEngine = {
    loadTreatmentJSON,
    lookupBillingCode,
    processChipsToBilling,
    checkCombinationConflicts,
    getTreatmentChips,
    getDefaultActiveChipsFromJSON,
    // Migrierte Funktionen
    inferChipsFromDictation,
    resolveChipStates,
    getActiveChipIds,
    generateFinalDocumentation,
    // SSOT-konforme Chip-Billing-Lookups
    getChipBillingInfo,
    hasChipBillingCode,
    getChipBillingLabel,
    // NEU: Rule-Driven Architecture
    loadRules,
    getMissingRequiredFields,
    getApplicableRules,
    getUpsellChips,
    generateAuditNotes,
    shouldAskQuestion
};

export default TreatmentEngine;

