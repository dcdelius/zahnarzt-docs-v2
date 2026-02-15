/**
 * Endo Treatment → Facts Mapping
 *
 * Maps extracted data from Endo dictations into TreatmentFacts.
 * Endo has its own clinical decision tree (pulpitis, vitality, etc.).
 */

import type { TreatmentFacts } from '../../types';
import type { ExtractedDataLike } from '../index';
import {
    normalizeToken,
    hasAny,
} from './shared.v1';

// ═══════════════════════════════════════════════════════════════
// ENDO-SPECIFIC TOKEN TABLES
// ═══════════════════════════════════════════════════════════════

/**
 * Diagnosis / indication tokens
 */
export const ENDO_DIAGNOSIS_TOKENS = {
    pulpitis: [
        'pulpitis',
        'pulpitisch',
        'irreversible pulpitis',
        'irreversibel',
        'pulp_inflamed',
    ],
    necrosis: [
        'nekrose',
        'necrotic',
        'nekrotisch',
        'devital',
        'avital',
        'gangraen',
        'gangran',
        'pulpatod',
    ],
    apical_periodontitis: [
        'apikale parodontitis',
        'apikale aufhellung',
        'pa',  // Parodontitis apicalis
        'periapikale lasion',
        'periapical lesion',
        'apikale ostitis',
        'apikalostitis',
        'granulom',
    ],
    trauma: [
        'trauma',
        'fraktur',
        'kronenfraktur',
        'wurzelfraktur',
        'pulpabeteiligung',
    ],
    revision: [
        'revision',
        'revisionsbehandlung',
        'rezidiv',
        'reendo',
        're-endo',
        'nachbehandlung',
    ],
};

/**
 * Procedure / step tokens
 */
export const ENDO_PROCEDURE_TOKENS = {
    trepanation: [
        'trepanation',
        'trepaniert',
        'eroffnung',
        'zugang gelegt',
        'zugangskavitat',
        'pulpakammer eroffnet',
    ],
    working_length: [
        'arbeitslange',
        'wl',
        'wl bestimmt',
        'langenbestimmung',
        'langenmessung',  // without ä
        'langenmessung',
        'apex lokator',
        'apexlokator',
        'endometrie',
        'wurzellange',
        'elektronische langenbestimmung',
        'elektronische langenmessung',
        'rontgenologische langenmessung',
    ],
    preparation: [
        'aufbereitung',
        'aufbereitet',
        'kanalaufbereitung',
        'maschinelle aufbereitung',
        'manuelle aufbereitung',
        'feilen',
        'instrumente',
        'pathfinder',
        'protaper',
        'wave one',
        'waveone',
        'reciproc',
        'mtwo',
        'm-two',
        'k-feilen',
        'k-files',
    ],
    irrigation: [
        'spulung',
        'gespult',
        'irrigation',
        'naocl',
        'natriumhypochlorit',
        'edta',
        'chlorhexidin',
        'chx',
        'spulprotokoll',
        'schallaktiviert',
        'ultraschallaktiviert',
    ],
    medication: [
        'einlage',
        'medikamentose einlage',
        'calciumhydroxid',
        'caoh',
        'ca(oh)2',
        'ledermix',
        'temporar gefüllt',
        'provisorischer verschluss',
    ],
    obturation: [
        'obturation',
        'wurzelfullung',
        'guttapercha',
        'sealer',
        'wurzelkanalfüllung',
        'warmfülltechnik',
        'lateralkondensation',
        'single-cone',
        'single cone',
        'ah plus',
    ],
    isolation: [
        'kofferdam',
        'cofferdam',
        'rubber dam',
        'rubberdam',
        'absolute trockenlegung',
    ],
};

/**
 * Anatomy / canal tokens
 */
export const ENDO_ANATOMY_TOKENS = {
    canal_count: [
        'einkanaler',
        'zweikanaler',
        'dreikanaler',
        'vierkanaler',
        '1 kanal',
        '2 kanale',
        '3 kanale',
        '4 kanale',
        '1k',
        '2k',
        '3k',
        '4k',
    ],
    canal_names: [
        'mb',  // mesio-buccal
        'ml',  // mesio-lingual
        'db',  // disto-buccal
        'dl',  // disto-lingual
        'mesial',
        'distal',
        'palatinal',
        'bukkal',
    ],
    apex: [
        'apex',
        'foramen',
        'apikale konstriktion',
        'apikalstop',
    ],
    curvature: [
        'krummung',
        'gekrummt',
        'abknickung',
        'curvature',
    ],
};

/**
 * Complications / special tokens
 */
export const ENDO_COMPLICATION_TOKENS = {
    perforation: [
        'perforation',
        'perforiert',
    ],
    instrument_fracture: [
        'instrumentenfraktur',
        'abgebrochene feile',
        'frakturfragment',
        'separated instrument',
    ],
    ledge: [
        'stufe',
        'ledge',
    ],
    blockage: [
        'blockade',
        'blockiert',
        'obstruiert',
    ],
};

// ═══════════════════════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════

export type EndoDiagnosis = 'pulpitis' | 'necrosis' | 'apical_periodontitis' | 'trauma' | 'revision' | 'unknown';
export type EndoStep = 'trepanation' | 'working_length' | 'preparation' | 'irrigation' | 'medication' | 'obturation' | 'unknown';

/**
 * Detect endo diagnosis from text
 */
export function detectEndoDiagnosis(text: string): EndoDiagnosis {
    const normalized = normalizeToken(text);

    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.necrosis)) {
        return 'necrosis';
    }
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.pulpitis)) {
        return 'pulpitis';
    }
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.apical_periodontitis)) {
        return 'apical_periodontitis';
    }
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.revision)) {
        return 'revision';
    }
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.trauma)) {
        return 'trauma';
    }

    return 'unknown';
}

/**
 * Detect which endo step is being documented
 */
export function detectEndoStep(text: string): EndoStep {
    const normalized = normalizeToken(text);

    // Check from most specific to least
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.obturation)) {
        return 'obturation';
    }
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.medication)) {
        return 'medication';
    }
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.irrigation)) {
        return 'irrigation';
    }
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.preparation)) {
        return 'preparation';
    }
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.working_length)) {
        return 'working_length';
    }
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.trepanation)) {
        return 'trepanation';
    }

    return 'unknown';
}

interface EndoDetections {
    kofferdam: boolean;
    workingLengthMethodElectronic: boolean;
    workingLengthMethodXray: boolean;
    irrigationWithNaOCl: boolean;
    irrigationWithEDTA: boolean;
    medicationCalciumHydroxide: boolean;
    guttapercha: boolean;
    sealer: boolean;
    // M23: New detection fields
    anesthesiaLeitung: boolean;
    anesthesiaInfiltration: boolean;
    wfTechniqueWarm: boolean;
    wfTechniqueEinzel: boolean;
    diagnosticXray: boolean;
    postEndoAufbau: boolean;
}

/**
 * Detect specific procedure details
 */
export function detectEndoProcedureDetails(text: string): EndoDetections {
    const normalized = normalizeToken(text);

    return {
        kofferdam: hasAny(normalized, ENDO_PROCEDURE_TOKENS.isolation),
        workingLengthMethodElectronic: hasAny(normalized, ['apex lokator', 'apexlokator', 'endometrie', 'elektronisch']),
        workingLengthMethodXray: hasAny(normalized, ['rontgen', 'lippe film', 'messaufnahme']),
        irrigationWithNaOCl: hasAny(normalized, ['naocl', 'natriumhypochlorit']),
        irrigationWithEDTA: hasAny(normalized, ['edta']),
        medicationCalciumHydroxide: hasAny(normalized, ['calciumhydroxid', 'caoh', 'ca(oh)2']),
        guttapercha: hasAny(normalized, ['guttapercha']),
        sealer: hasAny(normalized, ['sealer', 'ah plus']),
        // M23: Anesthesia detection
        anesthesiaLeitung: hasAny(normalized, ['leitungsanasthesie', 'leitung', 'n. alv. inf', 'mandibular']),
        anesthesiaInfiltration: hasAny(normalized, ['infiltrationsanasthesie', 'infiltration', 'la infiltr']),
        // M23: WF technique detection
        wfTechniqueWarm: hasAny(normalized, ['warm', 'warmvertikal', 'thermoplast', 'downpack', 'backfill', 'continuous wave']),
        wfTechniqueEinzel: hasAny(normalized, ['einzelstift', 'single cone', 'single-cone', 'einzelkegel', 'mastercone']),
        // M23: Diagnostic X-ray (before treatment, separate from control)
        diagnosticXray: hasAny(normalized, ['rontgendiagnostik', 'diagnostischer rontgen', 'einzelzahnfilm', 'befundbild', 'ausgangsbild']),
        // M23: Post-endo buildup
        postEndoAufbau: hasAny(normalized, ['aufbau', 'core build', 'postendodontisch', 'adhasiver aufbau', 'definitiver aufbau']),
    };
}

/**
 * Detect canal count
 */
export function detectCanalCount(text: string): number | undefined {
    const normalized = normalizeToken(text);

    if (hasAny(normalized, ['vierkanaler', '4 kanale', '4k'])) return 4;
    if (hasAny(normalized, ['dreikanaler', '3 kanale', '3k'])) return 3;
    if (hasAny(normalized, ['zweikanaler', '2 kanale', '2k'])) return 2;
    if (hasAny(normalized, ['einkanaler', '1 kanal', '1k'])) return 1;

    return undefined;
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build TreatmentFacts from extracted data for Endo treatment
 */
export function buildEndoFacts(
    extracted: ExtractedDataLike,
    instanceScope?: { tooth?: string }
): TreatmentFacts {
    // Collect all text sources for analysis
    const textSources: string[] = [];

    if (extracted.diagnosis) {
        textSources.push(extracted.diagnosis);
    }
    if (extracted.rawDictation) {
        textSources.push(extracted.rawDictation);
    }
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }

    const combinedText = textSources.join(' ');

    // Detect endo-specific facts
    const diagnosis = detectEndoDiagnosis(combinedText);
    const step = detectEndoStep(combinedText);
    const details = detectEndoProcedureDetails(combinedText);
    const canalCount = detectCanalCount(combinedText);

    // Build endo facts
    const facts: TreatmentFacts = {
        treatmentId: 'endo',
        // Endo doesn't use cariesDepth, but keep for interface compatibility
        cariesDepth: 'unknown',
        capping: {
            performed: 'unknown', // Not relevant for endo
        },
        counseling: {
            pulpitisRisk: 'unknown', // Already in endo
        },
        // Endo-specific extensions (via mentioned flags)
        endo: {
            diagnosis,
            step,
            canalCount,
            kofferdam: details.kofferdam,
            workingLengthMethod: details.workingLengthMethodElectronic
                ? 'electronic'
                : details.workingLengthMethodXray
                    ? 'xray'
                    : undefined,
            irrigationSolutions: [
                ...(details.irrigationWithNaOCl ? ['NaOCl'] : []),
                ...(details.irrigationWithEDTA ? ['EDTA'] : []),
            ],
            medication: details.medicationCalciumHydroxide ? 'Ca(OH)2' : undefined,
            obturated: details.guttapercha || details.sealer,
            // M23: New facts for allowlist elimination
            anesthesiaType: details.anesthesiaLeitung
                ? 'leitung'
                : details.anesthesiaInfiltration
                    ? 'infiltration'
                    : undefined,
            wfTechnique: details.wfTechniqueWarm
                ? 'warm'
                : details.wfTechniqueEinzel
                    ? 'einzel'
                    : undefined,
            diagnosticXray: details.diagnosticXray,
            postEndoAufbau: details.postEndoAufbau,
        },
    };

    return facts;
}
