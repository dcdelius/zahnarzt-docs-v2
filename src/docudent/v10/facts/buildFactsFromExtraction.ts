/**
 * V10 Facts — buildFactsFromExtraction
 * 
 * Builds TreatmentFacts from extraction result.
 * This is the V10 canonical location for facts building.
 */

import type {
    TreatmentFacts,
    ExtractedDataLike,
    BuildFactsParams,
    CariesDepth,
    YesNoUnknown,
    FillMaterial,
    Polarity,
} from './types';

import {
    normalizeSurfaces as normalizeSurfacesModule,
    type CanonicalSurface,
} from '../extraction/surfaces';
import { buildDocumentationContextFromExtraction } from '../extraction/context/documentationContext';
import { clampCanalCountToTooth } from './endoToothAnatomy';

// ═══════════════════════════════════════════════════════════════
// TOKEN NORMALIZATION + SYNONYMS (ported from V7)
// ═══════════════════════════════════════════════════════════════

function normalizeToken(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 'ss')
        .trim();
}

function hasAny(haystack: string, needles: string[]): boolean {
    const normalized = normalizeToken(haystack);
    return needles.some(needle => normalized.includes(normalizeToken(needle)));
}

const DEEP_CARIES_TOKENS = {
    profunda: [
        'profunda',
        'caries profunda',
        'karies profunda',
        'sehr tief',
        'sehr tiefe',
        'deep caries',
    ],
    pulp_near: [
        'pulpanah',
        'pulpannah',
        'pulpa nah',
        'pulpa-nah',
        'nahe pulpa',
        'near pulp',
        'pulp near',
        'tief',
        'tiefe karies',
        'tiefe kavitat',
        'deep',
    ],
};

const NORMAL_CARIES_TOKENS = [
    'media',
    'caries media',
    'karies media',
    'normal',
    'superficialis',
    'oberflachlich',
];

const BLEEDING_TOKENS = {
    detected: ['blutung', 'blutet', 'blutend', 'bleeding', 'blutig'],
    heavy: [
        'starke blutung',
        'stark blutend',
        'heavy bleeding',
        'massive blutung',
        'deutliche blutung',
        'persistierende blutung',
    ],
    hemostasis: [
        'blutstillung',
        'hamostase',
        'haemostase',
        'hemostasis',
        'gestillt',
        'alcl3',
        'alaun',
        'gelatamp',
        'koagulation',
        'druck',
        'tamponade',
    ],
};

const SENSITIVITY_TOKENS = {
    detected: [
        'empfindlich',
        'sensibel',
        'sensitivity',
        'sensitive',
        'hypersensibel',
        'hypersensitiv',
        'hypersensitivity',
        'uberempfindlich',
        'uberempfindlichkeit',
    ],
    high: [
        'stark empfindlich',
        'sehr empfindlich',
        'ausgepragte empfindlichkeit',
        'high sensitivity',
        'deutlich empfindlich',
    ],
    cold: [
        'kalt empfindlich',
        'kalteempfindlich',
        'cold sensitive',
        'kaltereiz',
    ],
    postop: ['postop', 'postoperativ', 'nach behandlung', 'nach fullung'],
    desensitizer: ['duraphat', 'fluorid', 'desensibilisierung', 'desensitizer', 'elmex'],
};

const ISOLATION_TOKENS = {
    detected: ['isolation', 'isolierung', 'trockenlegung', 'trockenes feld', 'dry field'],
    absolute: [
        'kofferdam',
        'cofferdam',
        'rubberdam',
        'rubber dam',
        'spanngummi',
        'absolute trockenlegung',
        'absolute isolation',
    ],
    relative: [
        'relative',
        'relative isolation',
        'relative trockenlegung',
        'watterollen',
        'wattetamponade',
        'speichelabsaugung',
        'sauger',
    ],
};

const ENDO_DIAGNOSIS_TOKENS = {
    pulpitis: ['pulpitis', 'pulpitisch', 'irreversible pulpitis', 'irreversibel', 'pulp_inflamed'],
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
        'pa',
        'periapikale lasion',
        'periapical lesion',
        'apikale ostitis',
        'apikalostitis',
        'granulom',
    ],
    trauma: ['trauma', 'fraktur', 'kronenfraktur', 'wurzelfraktur', 'pulpabeteiligung'],
    revision: ['revision', 'revisionsbehandlung', 'rezidiv', 'reendo', 're-endo', 'nachbehandlung'],
};

const ENDO_PROCEDURE_TOKENS = {
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
        'temporar gefullt',
        'provisorischer verschluss',
    ],
    obturation: [
        'obturation',
        'wurzelfullung',
        'guttapercha',
        'sealer',
        'wurzelkanalfullung',
        'warmfulltechnik',
        'lateralkondensation',
        'single-cone',
        'single cone',
        'ah plus',
    ],
    isolation: ['kofferdam', 'cofferdam', 'rubber dam', 'rubberdam', 'absolute trockenlegung'],
};

const ENDO_ANATOMY_TOKENS = {
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
};

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

export function detectCariesDepth(extracted: ExtractedDataLike): CariesDepth {
    const explicitDepth = (extracted as Record<string, unknown>).cariesDepth;
    if (explicitDepth) {
        const depth = String(explicitDepth).toLowerCase();
        if (depth.includes('profunda')) return 'profunda';
        if (depth.includes('pulp') || depth.includes('pulpa') || depth.includes('tief')) return 'pulp_near';
        if (depth.includes('normal') || depth.includes('media')) return 'normal';
    }

    const diagnosis = extracted.diagnosis?.toLowerCase() ?? '';
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    if (diagnosis.includes('profunda') || mentioned['caries_profunda'] || rawDictation.includes('profunda')) {
        return 'profunda';
    }
    if (diagnosis.includes('pulpanah') || diagnosis.includes('tief') || diagnosis.includes('tiefe') || mentioned['pulp_near']) {
        return 'pulp_near';
    }
    if (diagnosis.includes('media') || mentioned['caries_media']) {
        return 'normal';
    }

    // V7: normalized token detection (more robust)
    if (hasAny(rawDictation, DEEP_CARIES_TOKENS.profunda)) {
        return 'profunda';
    }
    if (hasAny(rawDictation, DEEP_CARIES_TOKENS.pulp_near)) {
        return 'pulp_near';
    }
    if (hasAny(rawDictation, NORMAL_CARIES_TOKENS)) {
        return 'normal';
    }

    return 'unknown';
}

export function detectBleeding(extracted: ExtractedDataLike): YesNoUnknown {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    if (mentioned['bleeding'] === true || mentioned['blutung'] === true) return 'yes';
    if (mentioned['bleeding'] === false || mentioned['blutung'] === false) return 'no';

    if (hasAny(rawDictation, BLEEDING_TOKENS.detected) || hasAny(rawDictation, BLEEDING_TOKENS.heavy)) {
        return 'yes';
    }
    return 'unknown';
}

export function detectSensitivity(extracted: ExtractedDataLike): YesNoUnknown {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    if (mentioned['sensitivity'] === true || mentioned['empfindlichkeit'] === true) return 'yes';
    if (mentioned['sensitivity'] === false || mentioned['empfindlichkeit'] === false) return 'no';

    if (hasAny(rawDictation, SENSITIVITY_TOKENS.detected) ||
        hasAny(rawDictation, SENSITIVITY_TOKENS.high) ||
        hasAny(rawDictation, SENSITIVITY_TOKENS.cold)) {
        return 'yes';
    }
    return 'unknown';
}

function detectBleedingDetails(extracted: ExtractedDataLike): { heavy?: boolean; hemostasisMentioned?: boolean } {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const heavy = hasAny(rawDictation, BLEEDING_TOKENS.heavy);
    const hemostasisMentioned = hasAny(rawDictation, BLEEDING_TOKENS.hemostasis);

    return {
        heavy: heavy ? true : undefined,
        hemostasisMentioned: hemostasisMentioned ? true : undefined,
    };
}

function detectSensitivityDetails(extracted: ExtractedDataLike): { level?: 'low' | 'medium' | 'high'; desensitizerMentioned?: boolean } {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const detected = hasAny(rawDictation, SENSITIVITY_TOKENS.detected) ||
        hasAny(rawDictation, SENSITIVITY_TOKENS.high) ||
        hasAny(rawDictation, SENSITIVITY_TOKENS.cold);

    let level: 'low' | 'medium' | 'high' | undefined;
    if (hasAny(rawDictation, SENSITIVITY_TOKENS.high)) {
        level = 'high';
    } else if (detected) {
        level = 'medium';
    }

    const desensitizerMentioned = hasAny(rawDictation, SENSITIVITY_TOKENS.desensitizer);

    return {
        level,
        desensitizerMentioned: desensitizerMentioned ? true : undefined,
    };
}

function detectIsolationMentioned(extracted: ExtractedDataLike): 'rubberDam' | 'relative' | 'unknown' {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const explicitKofferdam = (extracted as Record<string, unknown>).kofferdamUsed;
    if (explicitKofferdam === true) return 'rubberDam';
    if (explicitKofferdam === false) return 'unknown';
    const negationPatterns = [
        'kein kofferdam',
        'ohne kofferdam',
        'kein koffer dam',
        'ohne koffer dam',
    ];
    if (negationPatterns.some(pattern => rawDictation.includes(pattern))) {
        return 'unknown';
    }
    if (hasAny(rawDictation, ISOLATION_TOKENS.absolute)) return 'rubberDam';
    if (hasAny(rawDictation, ISOLATION_TOKENS.relative)) return 'relative';
    if (hasAny(rawDictation, ISOLATION_TOKENS.detected)) return 'unknown';
    return 'unknown';
}

type EndoDiagnosis = 'pulpitis' | 'necrosis' | 'apical_periodontitis' | 'trauma' | 'revision' | 'unknown';
type EndoStep = 'trepanation' | 'working_length' | 'preparation' | 'irrigation' | 'medication' | 'obturation' | 'unknown';

function detectEndoDiagnosis(text: string): EndoDiagnosis {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.necrosis)) return 'necrosis';
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.pulpitis)) return 'pulpitis';
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.apical_periodontitis)) return 'apical_periodontitis';
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.revision)) return 'revision';
    if (hasAny(normalized, ENDO_DIAGNOSIS_TOKENS.trauma)) return 'trauma';
    return 'unknown';
}

function detectEndoStep(text: string): EndoStep {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.obturation)) return 'obturation';
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.medication)) return 'medication';
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.irrigation)) return 'irrigation';
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.preparation)) return 'preparation';
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.working_length)) return 'working_length';
    if (hasAny(normalized, ENDO_PROCEDURE_TOKENS.trepanation)) return 'trepanation';
    return 'unknown';
}

function detectEndoStepFlags(text: string): {
    trepanation: boolean;
    obturation: boolean;
} {
    const normalized = normalizeToken(text);
    return {
        trepanation: hasAny(normalized, ENDO_PROCEDURE_TOKENS.trepanation),
        obturation: hasAny(normalized, ENDO_PROCEDURE_TOKENS.obturation),
    };
}

function detectEndoProcedureDetails(text: string) {
    const normalized = normalizeToken(text);
    const xrayNegated = hasAny(normalized, ['kein rontgen', 'ohne rontgen', 'kein roentgen', 'ohne roentgen']);
    const kofferdamNegated = hasAny(normalized, [
        'kein kofferdam',
        'ohne kofferdam',
        'kofferdam nicht moglich',
        'kofferdam nicht möglich',
        'kein kofferdam moglich',
        'kein kofferdam möglich',
    ]);
    return {
        kofferdam: !kofferdamNegated && hasAny(normalized, ENDO_PROCEDURE_TOKENS.isolation),
        workingLengthMethodElectronic: hasAny(normalized, ['apex lokator', 'apexlokator', 'endometrie', 'elektronisch']),
        workingLengthMethodXray: !xrayNegated && hasAny(normalized, ['rontgen', 'lippe film', 'messaufnahme']),
        irrigationWithNaOCl: hasAny(normalized, ['naocl', 'natriumhypochlorit']),
        irrigationWithEDTA: hasAny(normalized, ['edta']),
        medicationCalciumHydroxide: hasAny(normalized, ['calciumhydroxid', 'caoh', 'ca(oh)2']),
        medicationLedermix: hasAny(normalized, ['ledermix']),
        guttapercha: hasAny(normalized, ['guttapercha']),
        sealer: hasAny(normalized, ['sealer', 'ah plus']),
        instrumentationRotary: hasAny(normalized, ['rotierend', 'maschinell', 'reciproc', 'protaper', 'waveone', 'mtwo', 'niti']),
        instrumentationManual: hasAny(normalized, ['manuell', 'handfeile', 'handfeilen', 'k-feile', 'kfeile', 'hedstrom']),
        anesthesiaLeitung: hasAny(normalized, ['leitungsanasthesie', 'leitung', 'n. alv. inf', 'mandibular']),
        anesthesiaInfiltration: hasAny(normalized, ['infiltrationsanasthesie', 'infiltration', 'la infiltr']),
        wfTechniqueWarm: hasAny(normalized, ['warm', 'warmvertikal', 'thermoplast', 'downpack', 'backfill', 'continuous wave']),
        wfTechniqueEinzel: hasAny(normalized, ['einzelstift', 'single cone', 'single-cone', 'einzelkegel', 'mastercone']),
        wfTechniqueKalt: hasAny(normalized, ['kaltlateral', 'kalt lateral', 'laterale kondensation', 'lateral condensation', 'cold lateral']),
        diagnosticXray: !xrayNegated && hasAny(normalized, ['rontgendiagnostik', 'diagnostischer rontgen', 'einzelzahnfilm', 'befundbild', 'ausgangsbild']),
        postEndoAufbau: hasAny(normalized, ['aufbau', 'core build', 'postendodontisch', 'adhasiver aufbau', 'definitiver aufbau']),
    };
}

function detectCanalCount(text: string): number | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['vierkanaler', '4 kanale', '4k'])) return 4;
    if (hasAny(normalized, ['dreikanaler', '3 kanale', '3k'])) return 3;
    if (hasAny(normalized, ['zweikanaler', '2 kanale', '2k'])) return 2;
    if (hasAny(normalized, ['einkanaler', '1 kanal', '1k'])) return 1;
    return undefined;
}

function normalizeEndoStepFromMentioned(value: unknown): EndoStep | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = normalizeToken(value);
    if (!normalized) return undefined;
    if (normalized.includes('trepan')) return 'trepanation';
    if (normalized.includes('working_length') || normalized.includes('arbeitslange') || normalized.includes('langenmess')) return 'working_length';
    if (normalized.includes('prep') || normalized.includes('aufbereitung') || normalized.includes('instrument')) return 'preparation';
    if (normalized.includes('irrig') || normalized.includes('spul')) return 'irrigation';
    if (normalized.includes('medication') || normalized.includes('einlage') || normalized.includes('caoh') || normalized.includes('ledermix')) return 'medication';
    if (normalized.includes('obturation') || normalized.includes('wurzelfull') || normalized.includes('wf')) return 'obturation';
    if (normalized.includes('unknown')) return 'unknown';
    return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = normalizeToken(value);
        if (['true', 'ja', 'yes', '1'].includes(normalized)) return true;
        if (['false', 'nein', 'no', '0'].includes(normalized)) return false;
    }
    return undefined;
}

function normalizeWorkingLengthMethod(value: unknown): 'electronic' | 'xray' | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = normalizeToken(value);
    if (!normalized) return undefined;
    if (normalized.includes('elektr') || normalized.includes('electronic') || normalized.includes('apex') || normalized.includes('endo')) return 'electronic';
    if (normalized.includes('rontgen') || normalized.includes('roentgen') || normalized.includes('xray') || normalized.includes('messaufnahme')) return 'xray';
    return undefined;
}

function normalizeWfTechnique(value: unknown): 'warm' | 'einzel' | 'kalt' | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = normalizeToken(value);
    if (!normalized) return undefined;
    if (normalized.includes('warm') || normalized.includes('thermo')) return 'warm';
    if (normalized.includes('einzel') || normalized.includes('single') || normalized.includes('cone')) return 'einzel';
    if (normalized.includes('kalt') || normalized.includes('lateral')) return 'kalt';
    return undefined;
}

function normalizeMedication(value: unknown): 'Ledermix' | 'Ca(OH)2' | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = normalizeToken(value);
    if (!normalized) return undefined;
    if (normalized.includes('ledermix')) return 'Ledermix';
    if (normalized.includes('calcium') || normalized.includes('caoh') || normalized.includes('ca(oh)2')) return 'Ca(OH)2';
    return undefined;
}

function normalizeIrrigationSolutions(value: unknown): string[] | undefined {
    const tokens = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(/[;,/|]/g)
            : [];
    if (tokens.length === 0) return undefined;
    const set = new Set<string>();
    tokens.forEach((token) => {
        const normalized = normalizeToken(String(token));
        if (!normalized) return;
        if (normalized.includes('naocl') || normalized.includes('natriumhypochlorit') || normalized.includes('hypochlorit')) {
            set.add('NaOCl');
        } else if (normalized.includes('edta')) {
            set.add('EDTA');
        } else if (normalized.includes('chx') || normalized.includes('chlorhex')) {
            set.add('CHX');
        }
    });
    return set.size > 0 ? Array.from(set) : undefined;
}

function detectCrownPrepSignals(text: string): {
    preparation?: boolean;
    impression?: boolean;
    provisional?: boolean;
} {
    const normalized = normalizeToken(text);
    const prepNegated = hasAny(normalized, ['keine praparation', 'keine praeparation', 'ohne praparation', 'ohne praeparation']);
    const impressionNegated = hasAny(normalized, ['keine abformung', 'ohne abformung', 'kein abdruck', 'ohne abdruck']);
    const provisionalNegated = hasAny(normalized, ['kein provisorium', 'ohne provisorium', 'kein provis', 'ohne provis']);
    const preparationMentioned = hasAny(normalized, [
        'kronenpraparation',
        'kronenpraeparation',
        'praparation',
        'praeparation',
        'prap',
        'praep',
        'prep',
        'preparation',
        'kronenpraep',
        'krone prap',
        'krone praep',
    ]);
    const impressionMentioned = hasAny(normalized, [
        'abformung',
        'abdruck',
        'silikonabdruck',
        'doppelmisch',
        'situationsabformung',
        'scan',
        'intraoral',
        'ios',
    ]);
    const provisionalMentioned = hasAny(normalized, [
        'provisorium',
        'provisorisch',
        'prov',
        'provis',
        'tempkrone',
        'temporar',
        'temporär',
        'interim',
    ]);

    const preparation = prepNegated ? false : preparationMentioned ? true : undefined;
    const impression = impressionNegated ? false : impressionMentioned ? true : undefined;
    const provisional = provisionalNegated ? false : provisionalMentioned ? true : undefined;

    return {
        preparation,
        impression,
        provisional,
    };
}

function detectRadiologyIndication(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['therapieplanung', 'planung', 'planungsaufnahme', 'planung roentgen', 'planung rontgen'])) {
        return 'planung';
    }
    if (hasAny(normalized, ['kontrolle', 'verlaufskontrolle', 'kontrollaufnahme', 'postop kontrolle', 'postoperative kontrolle'])) {
        return 'kontrolle';
    }
    if (hasAny(normalized, ['diagnostik', 'abklarung', 'diagnose', 'befundung', 'initialbefund'])) {
        return 'diagnostik';
    }
    return undefined;
}

function detectRadiologyType(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['opg', 'orthopantomogramm', 'panorama', 'panoramaschichtaufnahme'])) {
        return 'opg';
    }
    if (hasAny(normalized, ['einzelzahnaufnahme', 'zahnfilm', 'bissflugel', 'bitewing', 'einzelaufnahme'])) {
        return 'einzelzahn';
    }
    return undefined;
}

function detectRadiologyTiming(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['praeoperativ', 'preoperativ', 'vor op', 'vor der op'])) return 'praeoperativ';
    if (hasAny(normalized, ['intraoperativ', 'waehrend der op', 'waehrend op'])) return 'intraoperativ';
    if (hasAny(normalized, ['postoperativ', 'nach op', 'post op'])) return 'postoperativ';
    return undefined;
}

function detectRadiologyFindings(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['apikale auffaelligkeit', 'apikale aufhellung', 'periapikale aufhellung', 'apikaler befund'])) {
        return 'apikale_auffaelligkeit';
    }
    if (hasAny(normalized, ['kariologische befunde', 'karies', 'dentinkaries', 'sekundarkaries'])) {
        return 'kariologische_befunde';
    }
    if (hasAny(normalized, ['unauffaellig', 'ohne auffaelligkeit', 'ohne pathologischen befund', 'regelrecht'])) {
        return 'unauffaellig';
    }
    return undefined;
}

function detectUntersuchungReason(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['kontrolluntersuchung', 'kontrolle', 'nachkontrolle', 'recall'])) return 'kontrolle';
    if (hasAny(normalized, ['beschwerden', 'schmerz', 'abklarung', 'akuttermin'])) return 'beschwerden';
    if (hasAny(normalized, ['vorsorge', 'prophylaxecheck', 'routineuntersuchung', 'check-up', 'checkup'])) return 'vorsorge';
    return undefined;
}

function detectUntersuchungFindings(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['unauffaellig', 'ohne auffaelligkeit', 'regelrechter befund'])) return 'unauffaellig';
    if (hasAny(normalized, ['kariesverdacht', 'kariologisch', 'kariesverdaechtig'])) return 'kariesverdacht';
    if (hasAny(normalized, ['parodontal', 'parodontale auffaelligkeit', 'parozeichen', 'blutung auf sondieren'])) return 'parozeichen';
    return undefined;
}

function detectUntersuchungAssessment(text: string): string | undefined {
    const normalized = normalizeToken(text);
    const negatedNeedPatterns = [
        /\bkein(?:e|er|en|em)?\s+(?:akut(?:e|er|en|em)?\s+|derzeit(?:ig)?\s+|momentan\s+|aktuell\s+)?(?:therapiebedarf|behandlungsbedarf|sanierungsbedarf)\b/,
        /\bohne\s+(?:akut(?:e|er|en|em)?\s+)?(?:therapiebedarf|behandlungsbedarf|sanierungsbedarf)\b/,
    ];
    if (negatedNeedPatterns.some(pattern => pattern.test(normalized))) {
        return 'ohne_therapiebedarf';
    }
    if (hasAny(normalized, ['therapiebedarf', 'behandlungsbedarf', 'sanierungsbedarf'])) {
        return 'therapiebedarf';
    }
    return undefined;
}

function detectFissurenIndikation(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['erhoehte kariesaktivitaet', 'hohes kariesrisiko', 'kariesaktiv'])) {
        return 'erhoehte_kariesaktivitaet';
    }
    if (hasAny(normalized, ['kariesprophylaxe', 'prophylaxe', 'praevention', 'pravention'])) {
        return 'kariesprophylaxe';
    }
    return undefined;
}

function detectFissurenMaterial(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['giz', 'glasionomer', 'glass ionomer', 'provisorisch'])) {
        return 'giz_provisorisch';
    }
    if (hasAny(normalized, ['kunststoff', 'komposit', 'versiegler'])) {
        return 'kunststoff';
    }
    return undefined;
}

function detectParodontologiePhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['antiinfektios', 'antiinfektioes', 'ait', 'geschlossenes debridement', 'subgingivale instrumentierung'])) {
        return 'ait';
    }
    if (hasAny(normalized, ['upt', 'unterstutzende parodontitistherapie', 'unterstuetzende parodontitistherapie', 'paro recall'])) {
        return 'upt';
    }
    if (hasAny(normalized, ['parodontalstatus', 'paro-status', 'psi', 'screening', 'befunderhebung'])) {
        return 'status';
    }
    return undefined;
}

function detectParodontologieUptGrade(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (/\bupt\s*grad\s*c\b/.test(normalized) || /\bgrad\s*c\b/.test(normalized)) return 'c';
    if (/\bupt\s*grad\s*b\b/.test(normalized) || /\bgrad\s*b\b/.test(normalized)) return 'b';
    if (/\bupt\s*grad\s*a\b/.test(normalized) || /\bgrad\s*a\b/.test(normalized)) return 'a';
    return undefined;
}

function detectUptGrade(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (/\bupt\s*grad\s*c\b/.test(normalized) || /\bgrad\s*c\b/.test(normalized)) return 'c';
    if (/\bupt\s*grad\s*b\b/.test(normalized) || /\bgrad\s*b\b/.test(normalized)) return 'b';
    if (/\bupt\s*grad\s*a\b/.test(normalized) || /\bgrad\s*a\b/.test(normalized)) return 'a';
    return undefined;
}

function detectUptIntervall(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['3-4 monate', '3 bis 4 monate', 'quartal', 'vierteljahr', '3 monate', '4 monate'])) {
        return '3-4_monate';
    }
    if (hasAny(normalized, ['6 monate', 'halbjahr', 'halbjaehrlich', 'halbjährlich'])) {
        return '6_monate';
    }
    if (hasAny(normalized, ['12 monate', 'jaehrlich', 'jährlich', '1 jahr', 'ein jahr'])) {
        return '12_monate';
    }
    return undefined;
}

function detectWsrZugang(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['osteotomie', 'knochenfenster', 'buccale osteotomie'])) {
        return 'osteotomie';
    }
    if (hasAny(normalized, ['trepaniert', 'am eroffneten zahn', 'am eroeffneten zahn', 'eroffneter zahn', 'eroeffneter zahn'])) {
        return 'trepaniert';
    }
    return undefined;
}

function detectWsrLokalisation(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['molar', 'molarenbereich', 'seitenzahnbereich'])) {
        return 'molar';
    }
    if (hasAny(normalized, ['frontzahn', 'praumolar', 'praemolar', 'front- praemolar', 'front praemolar'])) {
        return 'front_praemolar';
    }
    return undefined;
}

function detectTraumaArt(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['luxation', 'subluxation', 'intrusion', 'extrusion'])) {
        return 'luxation';
    }
    if (hasAny(normalized, ['fraktur', 'kronenfraktur', 'wurzelfraktur', 'schmelz-dentin-fraktur'])) {
        return 'fraktur';
    }
    if (hasAny(normalized, ['avulsion', 'avulsiert', 'ausgeschlagen', 'replantation'])) {
        return 'avulsion';
    }
    return undefined;
}

function detectTraumaSchienung(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['keine schienung', 'ohne schienung'])) return 'nein';
    if (hasAny(normalized, ['semipermanent', 'schienung', 'splint', 'draht-komposit-schiene', 'draht komposit schiene'])) {
        return 'ja';
    }
    return undefined;
}

function detectTraumaKontrolle(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['keine kontrolle', 'ohne kontrolle', 'keine nachkontrolle'])) return 'nein';
    if (hasAny(normalized, ['kontrolle', 'nachkontrolle', 'verlaufskontrolle', 'recall', 'wiedervorstellung'])) {
        return 'ja';
    }
    return undefined;
}

function detectImplantPhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['freilegung', 'implantat freigelegt', 'zweiteingriff', 'healing abutment'])) {
        return 'freilegung';
    }
    if (hasAny(normalized, ['implantatinsertion', 'implantat gesetzt', 'implantation', 'implantat inseriert'])) {
        return 'insertion';
    }
    return undefined;
}

function detectImplantNachsorge(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['keine nachsorge', 'ohne nachsorge', 'keine kontrolle'])) return 'nein';
    if (hasAny(normalized, ['nachsorge', 'postoperativ', 'kontrolltermin', 'wiedervorstellung', 'recall'])) return 'ja';
    return undefined;
}

function detectSchieneTyp(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['protrusionsschiene', 'protrusions', 'unterkieferprotrusion'])) {
        return 'protrusionsschiene';
    }
    if (hasAny(normalized, ['okklusionsschiene', 'aufbissschiene', 'knirscherschiene'])) {
        return 'okklusionsschiene';
    }
    return undefined;
}

function detectSchienePhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['kontrolle', 'nachadjustierung', 'adjustiert', 'nachkontrolle'])) {
        return 'kontrolle';
    }
    if (hasAny(normalized, ['eingliederung', 'eingegliedert', 'eingesetzt', 'eingesetzt und angepasst'])) {
        return 'eingliederung';
    }
    return undefined;
}

function detectKroneArt(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['provisorische krone', 'provisorium', 'interimskrone', 'temporaere krone'])) {
        return 'provisorium';
    }
    if (hasAny(normalized, ['vollkrone'])) {
        return 'vollkrone';
    }
    return undefined;
}

function detectKroneEingliederung(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['definitiv', 'definitiv eingegliedert', 'final eingegliedert', 'zementiert'])) {
        return 'definitiv';
    }
    if (hasAny(normalized, ['provisorisch', 'provisorisch eingegliedert', 'temporar eingesetzt', 'eingesetzt'])) {
        return 'provisorisch';
    }
    return undefined;
}

function detectTeilkroneArt(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['provisorische teilkrone', 'teilkrone provisorisch', 'interim teilkrone'])) {
        return 'provisorium';
    }
    if (/\bteilkrone\b/.test(normalized)) {
        return 'teilkrone';
    }
    return undefined;
}

function detectTeilkroneEingliederung(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['definitiv', 'definitiv eingegliedert', 'final eingegliedert', 'zementiert'])) {
        return 'definitiv';
    }
    if (hasAny(normalized, ['provisorisch', 'provisorisch eingegliedert', 'temporar eingesetzt', 'eingesetzt'])) {
        return 'provisorisch';
    }
    return undefined;
}

function detectBrueckeTyp(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['provisorische bruecke', 'interimsbruecke', 'uebergangsbruecke'])) {
        return 'provisorisch';
    }
    if (hasAny(normalized, ['definitive bruecke', 'bruecke definitiv', 'definitiv'])) {
        return 'definitiv';
    }
    return undefined;
}

function detectBrueckePhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['kontrolle', 'nachjustierung', 'nachkontrolle', 'okklusionskontrolle'])) {
        return 'kontrolle';
    }
    if (hasAny(normalized, ['eingliederung', 'eingegliedert', 'eingesetzt', 'zementiert'])) {
        return 'eingliederung';
    }
    return undefined;
}

function detectTeilprotheseTyp(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['modellgussprothese', 'modellguss', 'klammerprothese'])) {
        return 'modellguss';
    }
    if (hasAny(normalized, ['interimsteilprothese', 'interimprothese', 'interimsprothese', 'interim'])) {
        return 'interim';
    }
    return undefined;
}

function detectTeilprothesePhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['kontrolle', 'nachjustierung', 'druckstellenkontrolle', 'nachkontrolle'])) {
        return 'kontrolle';
    }
    if (hasAny(normalized, ['eingliederung', 'eingegliedert', 'eingesetzt'])) {
        return 'eingliederung';
    }
    return undefined;
}

function detectTotalprotheseTyp(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['immediat-totalprothese', 'immediatprothese', 'immediat'])) {
        return 'immediat';
    }
    if (hasAny(normalized, ['konventionelle totalprothese', 'konventionell', 'vollprothese'])) {
        return 'konventionell';
    }
    return undefined;
}

function detectTotalprothesePhase(text: string): string | undefined {
    const normalized = normalizeToken(text);
    if (hasAny(normalized, ['kontrolle', 'nachjustierung', 'druckstellenkontrolle', 'nachkontrolle'])) {
        return 'kontrolle';
    }
    if (hasAny(normalized, ['eingliederung', 'eingegliedert', 'eingesetzt'])) {
        return 'eingliederung';
    }
    return undefined;
}

/**
 * Extract surfaces using SSOT normalizeSurfaces module.
 * NO GUESSING: Ambiguous terms result in empty surfaces.
 */
export function extractSurfacesFacts(extracted: ExtractedDataLike): {
    surfaces: CanonicalSurface[];
    surfaceSource: 'extraction' | 'dictation' | 'none';
    surfaceWarnings: string[];
    surfaceAmbiguous: boolean;
} {
    const result = normalizeSurfacesModule({
        extracted: extracted.surfaces as string | string[] | undefined,
        dictation: extracted.rawDictation ?? undefined,
    });

    return {
        surfaces: result.surfaces,
        surfaceSource: result.source,
        surfaceWarnings: result.warnings,
        surfaceAmbiguous: result.hasAmbiguity,
    };
}

function detectCavityExtentHint(surfaces: CanonicalSurface[]): 'small' | 'medium' | 'large' | undefined {
    const count = Array.isArray(surfaces) ? surfaces.length : 0;
    if (count <= 0) return undefined;
    if (count >= 3) return 'large';
    if (count === 2) return 'medium';
    return 'small';
}

// ═══════════════════════════════════════════════════════════════
// MVP FACT DETECTION HELPERS
// These detect facts that KB rules check for chip emission
// ═══════════════════════════════════════════════════════════════

/**
 * Detect material from extraction/dictation
 * KB rule: facts.materialMentioned
 */
export function detectMaterial(extracted: ExtractedDataLike): FillMaterial {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    // Check mentioned first (from LLM extraction)
    if (mentioned['material'] === 'komposit' || mentioned['komposit'] === true) return 'komposit';
    if (mentioned['material'] === 'giz' || mentioned['giz'] === true) return 'giz';
    if (mentioned['material'] === 'amalgam' || mentioned['amalgam'] === true) return 'amalgam';

    // Fallback to raw dictation keywords
    if (rawDictation.includes('komposit') || rawDictation.includes('composite')) return 'komposit';
    if (rawDictation.includes('giz') || rawDictation.includes('glasionomer') || rawDictation.includes('glass ionomer')) return 'giz';
    if (rawDictation.includes('amalgam')) return 'amalgam';

    return 'unknown';
}

/**
 * Detect adhesive technique from extraction/dictation
 * KB rule: facts.adhesiveTechnique
 */
export function detectAdhesiveTechnique(extracted: ExtractedDataLike): boolean | undefined {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    // Explicit mentions
    if (mentioned['adhesive'] === true || mentioned['adhäsiv'] === true) return true;
    if (mentioned['adhesive'] === false || mentioned['adhäsiv'] === false) return false;

    // Dictation keywords
    if (rawDictation.includes('adhäsiv') || rawDictation.includes('adhesive')) return true;
    if (rawDictation.includes('ohne adhäsiv') || rawDictation.includes('nicht adhäsiv')) return false;

    // Komposit implies adhesive technique
    const material = detectMaterial(extracted);
    if (material === 'komposit') return true;
    if (material === 'giz' || material === 'amalgam') return false;

    return undefined; // Unknown - needs askback
}

function detectAdhesiveMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['adhesive'] === true || mentioned['adhäsiv'] === true) return true;
    return /adhäsiv|adhesive|bond|bonding/i.test(rawDictation);
}

function detectEtchMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['etch'] === true || mentioned['aetz'] === true || mentioned['ätz'] === true) return true;
    return /ätz|aetz|phosphor|etch/i.test(rawDictation);
}

function detectMatrixMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['matrix'] === true || mentioned['matrize'] === true) return true;
    return /matrix|matrize|matrizen|tofflemire|sektional|sectional|strip/i.test(rawDictation);
}

function detectKeilMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['keil'] === true || mentioned['wedge'] === true) return true;
    return /keil|holzkeil|keile|wedge/i.test(rawDictation);
}

function detectKontaktpunktMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['kontaktpunkt'] === true || mentioned['contact_point'] === true) return true;
    return /kontaktpunkt|kontaktpunkte|kontakt\s*gepru?ft|kontakt\s*wiederhergestellt|approximaler\s*kontakt/i.test(rawDictation);
}

function detectFlowableMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['flowable'] === true) return true;
    return /flowable|flow|fließ|flies|fluss/i.test(rawDictation);
}

function detectBulkMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (mentioned['bulk'] === true || mentioned['bulkfill'] === true) return true;
    return /bulk|bulkfill|bulk-fill/i.test(rawDictation);
}

/**
 * Detect Kofferdam usage from extraction/dictation
 * KB rules: facts.kofferdamUsed, facts.kofferdamMentioned
 */
export function detectKofferdam(extracted: ExtractedDataLike): { used?: boolean; mentioned: boolean } {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const explicitUsed = (extracted as Record<string, unknown>).kofferdamUsed;

    // Check if kofferdam is mentioned at all
    const kofferdamMentioned =
        mentioned['kofferdam'] !== undefined ||
        rawDictation.includes('kofferdam') ||
        rawDictation.includes('rubber dam');

    // Detect usage value
    let used: boolean | undefined = undefined;

    if (typeof explicitUsed === 'boolean') used = explicitUsed;
    if (mentioned['kofferdam'] === true) used = true;
    if (mentioned['kofferdam'] === false) used = false;

    // Dictation negation detection
    const negated = rawDictation.includes('ohne kofferdam') || rawDictation.includes('kein kofferdam');
    if (negated) {
        used = false;
    } else if (rawDictation.includes('mit kofferdam') || rawDictation.includes('kofferdam angelegt')) {
        used = true;
    } else if (rawDictation.includes('kofferdam') && !rawDictation.includes('ohne')) {
        used = true;
    }

    // V7: relative isolation cues
    if (!negated) {
        if (hasAny(rawDictation, ISOLATION_TOKENS.relative)) {
            used = false;
        } else if (hasAny(rawDictation, ISOLATION_TOKENS.absolute)) {
            used = true;
        }
    }

    return { used, mentioned: kofferdamMentioned };
}

/**
 * Detect fluoridation after filling
 * KB rule: facts.fuellung.fluoridation
 */
export function detectFluoridation(extracted: ExtractedDataLike): boolean | undefined {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    const negated =
        rawDictation.includes('keine fluorid') ||
        rawDictation.includes('ohne fluorid') ||
        rawDictation.includes('keine fluoridierung') ||
        rawDictation.includes('ohne fluoridierung') ||
        rawDictation.includes('kein fluoridlack');

    if (negated) return false;
    if (mentioned['fluoridation'] === true || mentioned['fluor'] === true) return true;
    if (rawDictation.includes('fluorid') || rawDictation.includes('fluoridlack') || rawDictation.includes('duraphat')) return true;

    return undefined;
}

/**
 * Detect vitality (ViPr) from extraction/dictation
 */
export function detectVitality(extracted: ExtractedDataLike): Polarity {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    const mentionedValue = mentioned['vitality'];
    if (mentionedValue === '+' || mentionedValue === 'pos' || mentionedValue === 'positive') return 'pos';
    if (mentionedValue === '-' || mentionedValue === 'neg' || mentionedValue === 'negative') return 'neg';

    if (/vipr\s*\+/.test(rawDictation) || rawDictation.includes('vipr positiv') || rawDictation.includes('vital positiv')) return 'pos';
    if (/vipr\s*-/.test(rawDictation) || rawDictation.includes('vipr negativ') || rawDictation.includes('vital negativ')) return 'neg';

    return 'unknown';
}

/**
 * Detect percussion from extraction/dictation
 */
export function detectPercussion(extracted: ExtractedDataLike): Polarity {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    const mentionedValue = mentioned['percussion'];
    if (mentionedValue === '+' || mentionedValue === 'pos' || mentionedValue === 'positive') return 'pos';
    if (mentionedValue === '-' || mentionedValue === 'neg' || mentionedValue === 'negative') return 'neg';

    if (/perk\s*\+/.test(rawDictation) || rawDictation.includes('perk positiv') || rawDictation.includes('perkussion positiv')) return 'pos';
    if (/perk\s*-/.test(rawDictation) || rawDictation.includes('perk negativ') || rawDictation.includes('perkussion negativ')) return 'neg';

    return 'unknown';
}

/**
 * Detect caries excavation from dictation
 */
export function detectExkavation(extracted: ExtractedDataLike): boolean {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    return (
        rawDictation.includes('exkavation') ||
        rawDictation.includes('exkaviert') ||
        rawDictation.includes('kariesexkavation') ||
        rawDictation.includes('karies entfernt')
    );
}

/**
 * Detect finishing/polishing and occlusion check
 */
export function detectFinishing(extracted: ExtractedDataLike): boolean | undefined {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation ?? '';

    if (
        mentioned['finishing'] === true ||
        mentioned['politur'] === true ||
        mentioned['okklusion'] === true ||
        mentioned['bisskontrolle'] === true
    ) {
        return true;
    }
    if (
        mentioned['finishing'] === false ||
        mentioned['politur'] === false ||
        mentioned['okklusion'] === false ||
        mentioned['bisskontrolle'] === false
    ) {
        return false;
    }

    const negationPatterns = [
        'ohne politur',
        'keine politur',
        'politur nicht',
        'ohne okklusionskontrolle',
        'keine okklusionskontrolle',
        'bisskontrolle nicht',
        'ohne einschleifen',
        'nicht eingeschliffen',
    ];
    if (hasAny(rawDictation, negationPatterns)) {
        return false;
    }

    const positivePatterns = [
        'politur',
        'poliert',
        'hochglanzpolitur',
        'okklusion geprüft',
        'okklusionskontrolle',
        'okklusionsfolie',
        'artikulationsfolie',
        'artikulationspapier',
        'shimstock',
        'bisskontrolle',
        'biss geprüft',
        'eingeschliffen',
        'okklusal eingeschliffen',
    ];
    if (hasAny(rawDictation, positivePatterns)) {
        return true;
    }

    return undefined;
}

/**
 * Detect supragingival calculus removal (PZR)
 */
export function detectZahnsteinEntfernung(extracted: ExtractedDataLike): boolean | undefined {
    const rawDictation = String((extracted as any).rawDictation ?? '').toLowerCase();
    const mentioned = extracted.mentioned ?? {};
    const negated =
        rawDictation.includes('kein zahnstein') ||
        rawDictation.includes('keine zahnstein') ||
        rawDictation.includes('ohne zahnstein') ||
        rawDictation.includes('kein scaling') ||
        rawDictation.includes('keine depuration');

    if (negated) return false;
    if (mentioned['zahnstein'] === true) return true;
    if (rawDictation.includes('zahnstein')) return true;
    if (rawDictation.includes('ultraschall')) return true;
    if (rawDictation.includes('kürette') || rawDictation.includes('kuerette')) return true;
    if (rawDictation.includes('scaling') || rawDictation.includes('depuration')) return true;
    if (rawDictation.includes('supragingiv')) return true;
    return undefined;
}

/**
 * Detect surface anesthesia before injection
 */
export function detectSurfaceAnesthesia(extracted: ExtractedDataLike): boolean {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    return (
        rawDictation.includes('oberflächenanästhesie') ||
        rawDictation.includes('oberflaechenanaesthesie') ||
        rawDictation.includes('oberflächenanaesthesie') ||
        rawDictation.includes('topisch') ||
        rawDictation.includes('anästhesiegel') ||
        rawDictation.includes('anaesthesiegel')
    );
}

/**
 * Detect layering technique mention
 */
export function detectLayering(extracted: ExtractedDataLike): YesNoUnknown {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    if (rawDictation.includes('mehrschicht') || rawDictation.includes('schichttechnik')) return 'yes';
    return 'unknown';
}

/**
 * Detect capping material from dictation
 * Materials: Ca(OH)₂, MTA, Biodentine
 */
export function detectCappingMaterial(extracted: ExtractedDataLike): string | undefined {
    const explicitMaterial = (extracted as Record<string, unknown>).cappingMaterial;
    if (explicitMaterial) return String(explicitMaterial);
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    if (
        rawDictation.includes('ca(oh)2') ||
        rawDictation.includes('ca(oh)₂') ||
        rawDictation.includes('calciumhydroxid') ||
        rawDictation.includes('calciumhydroxyd')
    ) {
        return 'Ca(OH)₂';
    }
    if (rawDictation.includes('mta')) return 'MTA';
    if (rawDictation.includes('biodentine')) return 'Biodentine';

    return undefined;
}

/**
 * Detect MKV justification from dictation (SSOT hint)
 */
export function detectMkvJustification(extracted: ExtractedDataLike): string | undefined {
    const explicit = (extracted as Record<string, unknown>).mkvJustification
        ?? (extracted as Record<string, unknown>).mkv_justification;
    if (explicit) return String(explicit);
    return undefined;
}

/**
 * Detect MKV (Mehrkosten) from extraction
 * KB rule: facts.mkvPresent
 */
export function detectMkv(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    // Explicit rejection should override any MKV keyword matches
    const rejectionPatterns = [
        'nur kasse',
        'keine mehrkosten',
        'ohne mehrkosten',
        'kassenleistung',
        'regelversorgung',
    ];
    if (rejectionPatterns.some(pattern => rawDictation.includes(pattern))) return false;

    if (
        mentioned['mkv'] === true
        || mentioned['mehrkosten'] === true
        || mentioned['zuzahlung'] === true
        || mentioned['eigenanteil'] === true
        || mentioned['privatanteil'] === true
    ) return true;
    if (
        rawDictation.includes('mehrkosten')
        || rawDictation.includes('mehrkostenvereinbarung')
        || rawDictation.includes('mkv')
        || rawDictation.includes('zuzahlung')
        || rawDictation.includes('eigenanteil')
        || rawDictation.includes('privatanteil')
        || rawDictation.includes('privatrechnung')
    ) return true;

    return false;
}

/**
 * Detect explicit Mehrkosten keywords for two-channel billing
 * Only explicit MKV/Mehrkosten wording or explicit € amount.
 * If true, MKV addon billing is automatically enabled (no askback)
 */
export function detectMehrkostenMentioned(extracted: ExtractedDataLike): boolean {
    const mentioned = extracted.mentioned ?? {};
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    // Explicit negation or rejection of Mehrkosten
    const negationPatterns = [
        'keine mehrkosten',
        'ohne mehrkosten',
        'nur kasse',
        'nur kassenleistung',
        'kassenleistung',
        'regelversorgung',
    ];
    if (negationPatterns.some(pattern => rawDictation.includes(pattern))) return false;

    // Check mentioned flags from LLM (explicit MKV/Mehrkosten only)
    if (mentioned['mehrkosten'] === true) return true;
    if (mentioned['mkv'] === true) return true;
    if (mentioned['zuzahlung'] === true) return true;

    // Check raw dictation for keywords
    const keywords = [
        'mehrkosten',
        'mkv',
        'zuzahlung',
        'eigenanteil',
        'privatanteil',
        'mehrkostenvereinbarung',
        'privatrechnung',
    ];
    for (const kw of keywords) {
        if (rawDictation.includes(kw)) return true;
    }

    // MKV Amount Pattern: if an explicit amount is mentioned (e.g., "120€", "50 Euro"),
    // this implies a Mehrkostenvereinbarung was discussed → confirm MKV addon
    const amountPattern = /\d+\s*(?:€|euro|eur)\b/i;
    if (amountPattern.test(extracted.rawDictation ?? '')) return true;

    // Also check extracted costs field
    if (extracted.costs != null && extracted.costs > 0) return true;

    return false;
}

/**
 * Detect MKV amount (Mehrkostenbetrag) from extraction/dictation.
 * Used to suppress mkv_betrag askback when the amount is already known.
 */
export function detectMkvBetrag(extracted: ExtractedDataLike): number | undefined {
    const parseAmountValue = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            if (value > 0 && value < 10000) return value;
            return undefined;
        }
        if (typeof value === 'string') {
            const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
            const parsed = Number.parseFloat(normalized);
            if (!Number.isFinite(parsed)) return undefined;
            if (parsed <= 0 || parsed >= 10000) return undefined;
            return parsed;
        }
        return undefined;
    };

    const explicit =
        (extracted as Record<string, unknown>).mkvBetrag ??
        (extracted as Record<string, unknown>).mkv_betrag ??
        (extracted as Record<string, unknown>).mkvAmount ??
        (extracted as Record<string, unknown>).mkv_amount;

    const fromExplicit = parseAmountValue(explicit);
    if (fromExplicit !== undefined) return fromExplicit;

    const fromCosts = parseAmountValue(extracted.costs);
    if (fromCosts !== undefined) return fromCosts;

    const rawDictation = extracted.rawDictation ?? '';

    const patterns = [
        /(\d+(?:[.,]\d{2})?)\s*€/,              // 120€, 150,50€
        /(\d+(?:[.,]\d{2})?)\s*euro/i,          // 120 Euro
        /(\d+(?:[.,]\d{2})?)\s*,-\s*€/,         // 150,- €
        /mehrkosten[:\s]+(\d+(?:[.,]\d{2})?)/i, // Mehrkosten: 120
        /betrag[:\s]+(\d+(?:[.,]\d{2})?)/i,     // Betrag: 150
    ];

    for (const pattern of patterns) {
        const match = rawDictation.match(pattern);
        if (match) {
            const parsed = parseAmountValue(match[1]);
            if (parsed !== undefined) return parsed;
        }
    }

    return undefined;
}

/**
 * Detect explicit refusal of Mehrkosten ("nur Kasse", "keine Mehrkosten", etc.)
 * MKV Praxis-Default: If MKV and NOT nurKasse → mehrkostenConfirmed=true
 */
export function detectNurKasse(extracted: ExtractedDataLike): boolean {
    // First check if nurKasse is explicitly set in extraction (e.g., from forceExtraction or LLM)
    if ((extracted as Record<string, unknown>).nurKasse === true) {
        return true;
    }

    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';

    // Explicit rejection keywords
    const rejectionPatterns = [
        'nur kasse',
        'keine mehrkosten',
        'kassenfüllung',
        'kassenleistung',
        'ohne mehrkosten',
        'regelversorgung',
    ];

    for (const pattern of rejectionPatterns) {
        if (rawDictation.includes(pattern)) return true;
    }

    return false;
}

/**
 * Detect capping (Überkappung) from dictation
 * Keywords: cp, c.p., überkappung, pulpanah, direkte überkappung, indirekte überkappung
 * KB chip: cp (indirect) or p (direct)
 * BillingRefs: BEMA_25/26, GOZ_2330/2340
 */
export function detectCapping(extracted: ExtractedDataLike): YesNoUnknown {
    const explicitPerformed = (extracted as Record<string, unknown>).cappingPerformed;
    if (explicitPerformed === true) return 'yes';
    if (explicitPerformed === false) return 'no';
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const mentioned = extracted.mentioned ?? {};

    // Explicit negation
    const explicitNegation =
        rawDictation.includes('ohne cp') || rawDictation.includes('kein cp') ||
        rawDictation.includes('ohne überkappung') || rawDictation.includes('keine überkappung');
    if (explicitNegation) {
        return 'no';
    }

    // Check mentioned flags (LLM object or boolean fallback)
    const cappingMentioned = mentioned['capping'] || mentioned['cp'] || mentioned['ueberkappung'];

    if (cappingMentioned) {
        if (typeof cappingMentioned === 'object') {
            const capObj = cappingMentioned as Record<string, unknown>;
            if (capObj.type === 'cp' || capObj.type === 'p') {
                return 'yes';
            }
        }
        if (cappingMentioned === true) return 'yes';
        if (typeof cappingMentioned === 'string' && (cappingMentioned.includes('cp') || cappingMentioned.includes('p'))) return 'yes';
    }

    if (mentioned['capping'] === false || mentioned['cp'] === false) return 'unknown';

    const cappingAny = mentioned['capping'] as Record<string, unknown> | undefined;
    if (cappingAny?.type === 'none') return 'unknown';

    // CP patterns in dictation
    const cpPatterns = [
        'mit cp', ' cp ', 'cp.', 'c.p.', 'c. p.',
        'überkappung', 'ueberkappung', 'pulpaschutz',
        'direkte überkappung', 'indirekte überkappung',
        'pulpanah', 'pulpa-nah', 'pulpennah'
    ];
    for (const pattern of cpPatterns) {
        if (rawDictation.includes(pattern)) {
            return 'yes';
        }
    }

    // Deep caries often requires capping - but don't assume, return unknown
    return 'unknown';
}

/**
 * Detect anesthesia type from dictation
 * Maps to chips: la_infiltr, la_leitung
 * BillingRefs: BEMA_40/41 (GKV/MKV), GOZ_0090/0100 (PKV)
 */
export type AnesthesiaType = 'infiltr' | 'leitung' | 'ila' | 'none' | 'unknown';

function detectAnesthesiaAmbiguous(extracted: ExtractedDataLike): boolean {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const mentioned = extracted.mentioned ?? {};
    const explicit = (extracted as Record<string, unknown>).anesthesia;
    const explicitLaType = (extracted as Record<string, unknown>).la_type;

    if (typeof explicit === 'string' && explicit.trim() && explicit.toLowerCase() !== 'unknown') return false;
    if (typeof explicitLaType === 'string' && explicitLaType.trim() && explicitLaType.toLowerCase() !== 'unknown') return false;
    if (typeof mentioned['anesthesia'] === 'string' && mentioned['anesthesia'] && String(mentioned['anesthesia']).toLowerCase() !== 'unknown') return false;
    if (mentioned['la_leitung'] === true || mentioned['la_infiltr'] === true || mentioned['la_ila'] === true || mentioned['ohne_la'] === true) {
        return false;
    }

    const negationPatterns = [
        'ohne anästhesie', 'ohne an[äa]sthesie', 'ohne la', 'keine betäubung',
        'ohne betäubung', 'keine anästhesie', 'ohne lokalanästhesie'
    ];
    const leitungPatterns = [
        'leitungsanästhesie', 'leitungsan', 'leitung', 'la leitung',
        'nervblock', 'blockanästhesie', 'mandibularblock', 'n. alv. inf'
    ];
    const ilaPatterns = [
        'intraligament',
        'intraligamentar',
        'intraligamentaer',
        'ila',
        'desmodontal',
    ];
    const infiltrPatterns = [
        'infiltrationsanästhesie', 'infiltration', 'infiltr', 'la infiltr',
        'infil', 'lokalanästhesie infiltr'
    ];
    const impliedAnesthesiaPatterns = [
        'mit anästhesie',
        'mit anaesthesie',
        'mit lokalanästhesie',
        'unter anästhesie',
    ];
    const genericAnesthesiaPatterns = ['anästhesie', 'anaesthesie', 'anesthesie', 'betäubung', 'mit la', 'lokalanästhesie'];

    const hasExplicit =
        hasAny(rawDictation, negationPatterns)
        || hasAny(rawDictation, leitungPatterns)
        || hasAny(rawDictation, ilaPatterns)
        || hasAny(rawDictation, infiltrPatterns);

    const hasGeneric =
        hasAny(rawDictation, impliedAnesthesiaPatterns)
        || hasAny(rawDictation, genericAnesthesiaPatterns);

    return hasGeneric && !hasExplicit;
}

export function detectAnesthesia(extracted: ExtractedDataLike): AnesthesiaType {
    const rawDictation = extracted.rawDictation?.toLowerCase() ?? '';
    const mentioned = extracted.mentioned ?? {};
    const explicit = (extracted as Record<string, unknown>).anesthesia;
    if (typeof explicit === 'string') {
        const normalized = explicit.toLowerCase();
        if (normalized.includes('ila') || normalized.includes('intralig')) return 'ila';
        if (normalized.includes('leitung')) return 'leitung';
        if (normalized.includes('infiltr')) return 'infiltr';
        if (normalized.includes('none') || normalized.includes('keine')) return 'none';
    }
    const explicitLaType = (extracted as Record<string, unknown>).la_type;
    if (typeof explicitLaType === 'string') {
        const normalized = explicitLaType.toLowerCase();
        if (normalized.includes('ila') || normalized.includes('intralig')) return 'ila';
        if (normalized.includes('leitung')) return 'leitung';
        if (normalized.includes('infiltr')) return 'infiltr';
        if (normalized.includes('none') || normalized.includes('keine')) return 'none';
    }

    // Negation patterns - check first (absolute precedence)
    const negationPatterns = [
        'ohne anästhesie', 'ohne an[äa]sthesie', 'ohne la', 'keine betäubung',
        'ohne betäubung', 'keine anästhesie', 'ohne lokalanästhesie'
    ];
    for (const pattern of negationPatterns) {
        if (rawDictation.includes(pattern.replace('[äa]', 'ä')) ||
            rawDictation.includes(pattern.replace('[äa]', 'a'))) {
            return 'none';
        }
    }

    // Leitungsanästhesie patterns (more specific, check first)
    const leitungPatterns = [
        'leitungsanästhesie', 'leitungsan', 'leitung', 'la leitung',
        'nervblock', 'blockanästhesie', 'mandibularblock', 'n. alv. inf'
    ];
    for (const pattern of leitungPatterns) {
        if (rawDictation.includes(pattern)) {
            return 'leitung';
        }
    }

    // Intraligamentary patterns (UK molars often use this)
    const ilaPatterns = [
        'intraligament',
        'intraligamentar',
        'intraligamentaer',
        'ila',
        'desmodontal',
    ];
    for (const pattern of ilaPatterns) {
        if (rawDictation.includes(pattern)) {
            return 'ila';
        }
    }

    // Infiltrationsanästhesie patterns
    const infiltrPatterns = [
        'infiltrationsanästhesie', 'infiltration', 'infiltr', 'la infiltr',
        'infil', 'lokalanästhesie infiltr'
    ];
    for (const pattern of infiltrPatterns) {
        if (rawDictation.includes(pattern)) {
            return 'infiltr';
        }
    }

    // Check mentioned flags from extraction
    if (mentioned['anesthesia'] === 'leitung' || mentioned['la_leitung'] === true) return 'leitung';
    if (mentioned['anesthesia'] === 'infiltr' || mentioned['la_infiltr'] === true) return 'infiltr';
    if (mentioned['anesthesia'] === 'ila' || mentioned['la_ila'] === true) return 'ila';
    if (mentioned['anesthesia'] === 'none' || mentioned['ohne_la'] === true) return 'none';

    const impliedAnesthesiaPatterns = [
        'mit anästhesie',
        'mit anaesthesie',
        'mit lokalanästhesie',
        'unter anästhesie',
    ];
    if (hasAny(rawDictation, impliedAnesthesiaPatterns)) {
        return 'infiltr';
    }

    // GENERIC 'anästhesie' / 'betäubung' mentioned (no technique) → default to infiltration.
    const genericAnesthesiaPatterns = ['anästhesie', 'anaesthesie', 'anesthesie', 'betäubung', 'mit la', 'lokalanästhesie'];
    for (const pattern of genericAnesthesiaPatterns) {
        if (rawDictation.includes(pattern)) {
            return 'infiltr';
        }
    }

    return 'unknown';
}

/**
 * GP7: Detect pulpaOpened from extraction/dictation
 * Determines whether direkte Überkappung (P) or indirekte (Cp) was performed.
 * Priority: forceExtraction.pulpaOpened > mentioned > dictation patterns
 * KB rule: facts.pulpaOpened === true → emit P, else → emit Cp
 */
export function detectPulpaOpened(extracted: ExtractedDataLike): boolean | undefined {
    // First check if explicitly set in extraction (e.g., from forceExtraction)
    const explicit = (extracted as Record<string, unknown>).pulpaOpened;
    if (typeof explicit === 'boolean') {
        return explicit;
    }

    const rawDictation = extracted.rawDictation ?? '';
    const rawLower = rawDictation.toLowerCase();
    const normalizedDictation = normalizeToken(rawDictation);
    const mentioned = extracted.mentioned ?? {};
    const klinischeNotes = (extracted as { klinischeZusatzinfos?: string[] }).klinischeZusatzinfos ?? [];
    const klinischeLower = klinischeNotes.map(note => note.toLowerCase());

    // Explicit indirect capping phrasing should always suppress pulpa opening
    if (
        rawLower.includes('indirekte überkappung')
        || rawLower.includes('indirekt überkapp')
        || rawLower.includes('indirekte ueberkappung')
        || rawLower.includes('indirekt ueberkapp')
    ) {
        return false;
    }

    if (
        klinischeLower.some(note => note.includes('überkappung') || note.includes('ueberkappung'))
        && !klinischeLower.some(note => note.includes('direkt'))
    ) {
        return false;
    }

    // Explicit negation patterns (must run before positive matches)
    const negationPatterns = [
        'pulpa nicht eroffnet',
        'pulpa nicht eroeffnet',
        'keine pulpaeroffnung',
        'ohne pulpaeroffnung',
    ];
    if (hasAny(normalizedDictation, negationPatterns)) {
        return false;
    }

    // Generic "Überkappung" without explicit direct phrasing should default to indirect
    if (
        (rawLower.includes('überkappung') || rawLower.includes('ueberkappung'))
        && !rawLower.includes('direkt')
    ) {
        return false;
    }

    // Explicitly mentioned indirect capping in dictation should suppress direct inference
    const indirectCappingPatterns = [
        'indirekte uberkappung',
        'indirekt uberkappung',
        'uberkappung',
        'pulpaschutz',
        'cp',
        'c.p.'
    ];
    if (hasAny(normalizedDictation, indirectCappingPatterns)) {
        return false;
    }

    // Dictation patterns for direkte Überkappung (Pulpaeröffnung)
    const directCappingPatterns = [
        'pulpaeroffnung',
        'pulpaeroeffnung',
        'pulpaoeffnung',
        'pulpa eroffnung',
        'pulpa eroeffnung',
        'direkte uberkappung',
        'direkt uberkappung',
        'punktformige eroffnung',
        'punktfoermige eroeffnung',
        'pulpa eroffnet',
        'pulpa eroeffnet',
        'pulpa punktformig',
        'mit p',
        'p.'
    ];
    if (hasAny(normalizedDictation, directCappingPatterns)) {
        return true;
    }

    // Check mentioned flags from LLM
    // Also check capping.type === 'p' as explicit signal for direct capping
    if (mentioned['pulpaOpened'] === true || mentioned['pulpa_opened'] === true) return true;

    const cappingAny = mentioned['capping'] as Record<string, unknown> | undefined;
    if (cappingAny?.type === 'p') return true;

    if (mentioned['pulpaOpened'] === false || mentioned['pulpa_opened'] === false) return false;
    if (cappingAny?.type === 'cp') return false;

    // If capping was mentioned but no pulpaOpened pattern → false (indirekte)
    // But don't assume - return undefined to let KB rule handle default
    return undefined;
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT-SPECIFIC BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildFuellungFacts(
    extracted: ExtractedDataLike,
    instanceScope?: { tooth?: string }
): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const toothRegion = (() => {
        if (!tooth || !/^\d{2}$/.test(tooth)) return 'unknown';
        const position = parseInt(tooth[1], 10);
        if (!Number.isFinite(position)) return 'unknown';
        return position <= 3 ? 'front' : 'side';
    })();
    const kofferdam = detectKofferdam(extracted);
    const surfaceData = extractSurfacesFacts(extracted);
    const cavityExtentHint = detectCavityExtentHint(surfaceData.surfaces);
    const cappingPerformed = detectCapping(extracted);
    const cappingMaterial = detectCappingMaterial(extracted);
    const bleedingDetails = detectBleedingDetails(extracted);
    const sensitivityDetails = detectSensitivityDetails(extracted);
    const isolationMentioned = detectIsolationMentioned(extracted);

    // GIGAPROMPT 10: Detect signals for MKV clarity
    const materialMentioned = detectMaterial(extracted);
    const adhesiveTechnique = detectAdhesiveTechnique(extracted);
    const adhesiveMentioned = detectAdhesiveMentioned(extracted);
    const etchMentioned = detectEtchMentioned(extracted);
    const matrixMentioned = detectMatrixMentioned(extracted);
    const keilMentioned = detectKeilMentioned(extracted);
    const kontaktpunktMentioned = detectKontaktpunktMentioned(extracted);
    const flowableMentioned = detectFlowableMentioned(extracted);
    const bulkMentioned = detectBulkMentioned(extracted);
    const mehrkostenMentioned = detectMehrkostenMentioned(extracted);
    const nurKasse = detectNurKasse(extracted);

    // GIGAPROMPT 10: mehrkostenSignalsClear = true wenn:
    // - materialMentioned === 'komposit'
    // - adhesiveTechnique === true
    // - mehrkostenMentioned === true (inkl. €-Betrag)
    // - nurKasse === true (klar: keine MKV)
    const mehrkostenSignalsClear =
        materialMentioned === 'komposit' ||
        adhesiveTechnique === true ||
        mehrkostenMentioned === true ||
        nurKasse === true;

    // GP7: Detect pulpaOpened for direkte Überkappung (P) vs indirekte (Cp)
    // Priority: forceExtraction > dictation detection
    const pulpaOpened = detectPulpaOpened(extracted);
    const cappingType = (extracted.mentioned as Record<string, unknown> | undefined)?.capping as
        | Record<string, unknown>
        | undefined;
    const cappingTypeValue = typeof cappingType?.type === 'string' ? cappingType.type.toLowerCase() : '';
    const resolvedPulpaOpened =
        typeof pulpaOpened === 'boolean'
            ? pulpaOpened
            : cappingTypeValue === 'cp'
                ? false
                : cappingTypeValue === 'p'
                    ? true
                    : pulpaOpened;
    const anesthesiaDetected = detectAnesthesia(extracted);
    const anesthesiaAmbiguous = detectAnesthesiaAmbiguous(extracted);
    // Atlas policy: If LA is mentioned without a technique, default to infiltration to avoid askback loops.
    // We still detect ambiguity, but we do not block chip emission on it for Füllung.
    const resolvedAnesthesia = anesthesiaDetected;
    const resolvedAnesthesiaAmbiguous = false;

    const explicitMehrkostenConfirmed = (extracted as Record<string, unknown>).mehrkostenConfirmed;

    return {
        treatmentId: 'fuellung',
        tooth,
        toothRegion,
        cariesDepth: detectCariesDepth(extracted),
        capping: { performed: cappingPerformed, material: cappingMaterial },
        counseling: { pulpitisRisk: 'unknown' },
        bleeding: {
            detected: detectBleeding(extracted),
            heavy: bleedingDetails.heavy,
            hemostasisMentioned: bleedingDetails.hemostasisMentioned,
        },
        sensitivity: {
            reported: detectSensitivity(extracted),
            level: sensitivityDetails.level,
            desensitizerMentioned: sensitivityDetails.desensitizerMentioned,
        },

        // Surface data for F-code resolution (SSOT)
        surfaces: surfaceData.surfaces,
        surfaceSource: surfaceData.surfaceSource,
        surfaceWarnings: surfaceData.surfaceWarnings,
        surfaceAmbiguous: surfaceData.surfaceAmbiguous,
        cavityExtentHint,

        // MVP Facts for KB chip emission
        materialMentioned,
        material: materialMentioned,
        adhesiveTechnique,
        adhesiveMentioned,
        etchMentioned,
        matrixMentioned,
        keilMentioned,
        kontaktpunktMentioned,
        flowableMentioned,
        bulkMentioned,
        kofferdamUsed: kofferdam.used,
        kofferdamMentioned: kofferdam.mentioned,
        isolationMentioned,
        mkvPresent: detectMkv(extracted) && !nurKasse,

        // MKV Two-Channel: detect explicit Mehrkosten keywords
        mehrkostenMentioned,

        // MKV Praxis-Default: detect explicit rejection ("nur Kasse")
        nurKasse,

        // GIGAPROMPT 10: SSOT for KB askback trigger
        // If false AND insuranceType='MKV' → KB triggers require_askback
        mehrkostenSignalsClear,

        // MKV Praxis-Default: If signals clear AND NOT nurKasse → mehrkostenConfirmed=true
        // BUT: respect explicit value from forceExtraction if set
        mehrkostenConfirmed:
            explicitMehrkostenConfirmed !== undefined
                ? Boolean(explicitMehrkostenConfirmed)
                : undefined,

        // GIGAPROMPT 10: Placeholder for askback answer (set via factsUpdate)
        mkvJustification: detectMkvJustification(extracted),
        mkvBetrag: detectMkvBetrag(extracted),

        // Anesthesia detection for LA chip emission
        anesthesia: resolvedAnesthesia,
        anesthesiaAmbiguous: resolvedAnesthesiaAmbiguous,

        // ViPr / Percussion
        vitality: detectVitality(extracted),
        percussion: detectPercussion(extracted),

        // Surface anesthesia, excavation, finishing
        surfaceAnesthesia: detectSurfaceAnesthesia(extracted),
        exkavationPerformed: detectExkavation(extracted),
        finishingPerformed: detectFinishing(extracted),

        // Layering technique (Mehrschichttechnik)
        layeringMentioned: detectLayering(extracted),

        // GP7: Pulpaeröffnung for KB rule (cp vs p)
        pulpaOpened: resolvedPulpaOpened,

        // Fluoridation (nested for medical_kb rule compatibility)
        fuellung: {
            fluoridation: detectFluoridation(extracted),
            anesthesiaType:
                resolvedAnesthesia === 'infiltr'
                    ? 'infiltration'
                    : resolvedAnesthesia === 'leitung'
                        ? 'leitung'
                        : resolvedAnesthesia === 'ila'
                            ? 'ila'
                        : undefined,
        },
    };
}

function buildEndoFacts(
    extracted: ExtractedDataLike,
    instanceScope?: { tooth?: string }
): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const toothRegion = (() => {
        if (!tooth || !/^\d{2}$/.test(tooth)) return 'unknown';
        const position = parseInt(tooth[1], 10);
        if (!Number.isFinite(position)) return 'unknown';
        return position <= 3 ? 'front' : 'side';
    })();
    const mentioned = extracted.mentioned ?? {};

    const textSources: string[] = [];
    if (extracted.diagnosis) textSources.push(extracted.diagnosis);
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }

    const combinedText = textSources.join(' ');
    const isolationMentioned = detectIsolationMentioned(extracted);
    const kofferdam = detectKofferdam(extracted);
    const diagnosis = detectEndoDiagnosis(combinedText);
    const stepFromMentioned = normalizeEndoStepFromMentioned(mentioned['endo_step'] ?? mentioned['step']);
    const step = stepFromMentioned ?? detectEndoStep(combinedText);
    const stepFlags = detectEndoStepFlags(combinedText);
    const details = detectEndoProcedureDetails(combinedText);
    const tempClosureNegated = hasAny(combinedText, [
        'kein provisorischer verschluss',
        'ohne provisorischen verschluss',
        'kein temporärer verschluss',
        'ohne temporären verschluss',
    ]);
    const tempClosureMentioned = hasAny(combinedText, [
        'provisorischer verschluss',
        'provisorisch verschlossen',
        'temporärer verschluss',
        'temporaerer verschluss',
        'temporär verschlossen',
        'temporar verschlossen',
        'temporär gefüllt',
        'temporar gefullt',
        'provisorisch gefüllt',
        'provisorisch gefullt',
    ]);
    const tempClosure = tempClosureMentioned && !tempClosureNegated
        ? true
        : tempClosureNegated
            ? false
            : undefined;
    const explicitCanalCount = toOptionalNumber(mentioned['root_canals'] ?? mentioned['canal_count']);
    const canalCount = clampCanalCountToTooth(tooth, explicitCanalCount ?? detectCanalCount(combinedText));
    const explicitWlMethod =
        (extracted as Record<string, unknown>).wl_method
        ?? mentioned['wl_method']
        ?? mentioned['working_length_method'];
    const workingLengthMethod =
        normalizeWorkingLengthMethod(explicitWlMethod)
            ? normalizeWorkingLengthMethod(explicitWlMethod)
            : details.workingLengthMethodElectronic
                ? 'electronic'
                : details.workingLengthMethodXray
                    ? 'xray'
                    : undefined;
    const explicitIrrigationSolutions = normalizeIrrigationSolutions(
        mentioned['irrigation_solutions'] ?? mentioned['endo_irrigation_solutions']
    );
    const explicitMedication = normalizeMedication(
        mentioned['endo_medication'] ?? mentioned['medication']
    );
    const explicitWfTechnique = normalizeWfTechnique(mentioned['wf_technique']);
    const explicitTempClosure = toOptionalBoolean(mentioned['temp_closure']);
    const explicitRootCanals = toOptionalNumber(mentioned['root_canals']);

    return {
        treatmentId: 'endo',
        tooth,
        toothRegion,
        cariesDepth: detectCariesDepth(extracted),
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        kofferdamUsed: kofferdam.used,
        kofferdamMentioned: kofferdam.mentioned,
        isolationMentioned,
        rootCanals: explicitRootCanals,
        workingLength: typeof mentioned['working_length'] === 'string' ? mentioned['working_length'] : undefined,
        endo: {
            diagnosis,
            step,
            trepanation: stepFlags.trepanation || step === 'trepanation' ? true : undefined,
            obturationMentioned: stepFlags.obturation || step === 'obturation' ? true : undefined,
            instrumentationMode: details.instrumentationRotary
                ? 'rotary'
                : details.instrumentationManual
                    ? 'manual'
                    : undefined,
            canalCount,
            kofferdam: kofferdam.used === false
                ? false
                : details.kofferdam || isolationMentioned === 'rubberDam'
                    ? true
                    : undefined,
            workingLengthMethod,
            irrigationSolutions: explicitIrrigationSolutions ?? [
                ...(details.irrigationWithNaOCl ? ['NaOCl'] : []),
                ...(details.irrigationWithEDTA ? ['EDTA'] : []),
            ],
            medication: explicitMedication
                ?? (details.medicationLedermix
                    ? 'Ledermix'
                    : details.medicationCalciumHydroxide
                        ? 'Ca(OH)2'
                        : undefined),
            sealerMentioned: details.sealer ? true : undefined,
            obturated: details.guttapercha || details.sealer || step === 'obturation',
            anesthesiaType: details.anesthesiaLeitung
                ? 'leitung'
                : details.anesthesiaInfiltration
                    ? 'infiltration'
                    : undefined,
            wfTechnique: explicitWfTechnique
                ?? (details.wfTechniqueWarm
                    ? 'warm'
                    : details.wfTechniqueEinzel
                        ? 'einzel'
                        : details.wfTechniqueKalt
                            ? 'kalt'
                            : undefined),
            diagnosticXray: details.diagnosticXray,
            postEndoAufbau: details.postEndoAufbau,
            tempClosure: explicitTempClosure ?? tempClosure,
        },
    };
}

function buildPzrFacts(extracted: ExtractedDataLike): TreatmentFacts {
    const anesthesiaDetected = detectAnesthesia(extracted);
    const anesthesiaAmbiguous = detectAnesthesiaAmbiguous(extracted);
    const anesthesia = anesthesiaAmbiguous ? 'unknown' : anesthesiaDetected;
    return {
        treatmentId: 'pzr',
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        anesthesia,
        anesthesiaAmbiguous,
        surfaceAnesthesia: detectSurfaceAnesthesia(extracted),
        pzr: {
            zahnsteinEntfernung: detectZahnsteinEntfernung(extracted),
            fluoridation: detectFluoridation(extracted),
        },
    };
}

function buildCrownPrepFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const crownPrepSignals = detectCrownPrepSignals(combinedText);
    const anesthesiaDetected = detectAnesthesia(extracted);
    const anesthesiaAmbiguous = detectAnesthesiaAmbiguous(extracted);
    const anesthesia = anesthesiaAmbiguous ? 'unknown' : anesthesiaDetected;

    return {
        treatmentId: 'crown_prep',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        anesthesia,
        anesthesiaAmbiguous,
        surfaceAnesthesia: detectSurfaceAnesthesia(extracted),
        crownPrep: {
            preparation: crownPrepSignals.preparation,
            impression: crownPrepSignals.impression,
            provisional: crownPrepSignals.provisional,
        },
    };
}

function buildRoentgenFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const indication = detectRadiologyIndication(combinedText);
    const type = detectRadiologyType(combinedText);
    const timing = detectRadiologyTiming(combinedText);
    const findings = detectRadiologyFindings(combinedText);

    return {
        treatmentId: 'roentgen',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        radiology: {
            ...(indication ? { indication } : {}),
            ...(type ? { type } : {}),
            ...(timing ? { timing } : {}),
            ...(findings ? { findings } : {}),
        },
    };
}

function buildUntersuchungFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const reason = detectUntersuchungReason(combinedText);
    const findings = detectUntersuchungFindings(combinedText);
    const assessment = detectUntersuchungAssessment(combinedText);

    return {
        treatmentId: 'untersuchung',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        untersuchung: {
            ...(reason ? { reason } : {}),
            ...(findings ? { findings } : {}),
            ...(assessment ? { assessment } : {}),
        },
    };
}

function buildFissurenversiegelungFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const indication = detectFissurenIndikation(combinedText);
    const material = detectFissurenMaterial(combinedText);

    return {
        treatmentId: 'fissurenversiegelung',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        fissurenversiegelung: {
            ...(indication ? { indication } : {}),
            ...(material ? { material } : {}),
        },
    };
}

function buildUeberkappungFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const cappingPerformed = detectCapping(extracted);
    const cappingMaterial = detectCappingMaterial(extracted);
    const pulpaOpened = detectPulpaOpened(extracted);
    const anesthesiaDetected = detectAnesthesia(extracted);
    const anesthesiaAmbiguous = detectAnesthesiaAmbiguous(extracted);
    const anesthesia = anesthesiaAmbiguous ? 'unknown' : anesthesiaDetected;

    return {
        treatmentId: 'ueberkappung',
        tooth,
        cariesDepth: detectCariesDepth(extracted),
        capping: {
            performed: cappingPerformed,
            ...(cappingMaterial ? { material: cappingMaterial } : {}),
        },
        counseling: { pulpitisRisk: 'unknown' },
        pulpaOpened,
        anesthesia,
        anesthesiaAmbiguous,
        surfaceAnesthesia: detectSurfaceAnesthesia(extracted),
    };
}

function buildParodontologieFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const phase = detectParodontologiePhase(combinedText);
    const uptGrade = detectParodontologieUptGrade(combinedText);

    return {
        treatmentId: 'parodontologie',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        parodontologie: {
            ...(phase ? { phase } : {}),
            ...(uptGrade ? { uptGrade } : {}),
        },
    };
}

function buildUptFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const grade = detectUptGrade(combinedText);
    const interval = detectUptIntervall(combinedText);

    return {
        treatmentId: 'upt',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        upt: {
            ...(grade ? { grade } : {}),
            ...(interval ? { interval } : {}),
        },
    };
}

function buildWsrFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const zugang = detectWsrZugang(combinedText);
    const lokalisation = detectWsrLokalisation(combinedText);

    return {
        treatmentId: 'wsr',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        wsr: {
            ...(zugang ? { zugang } : {}),
            ...(lokalisation ? { lokalisation } : {}),
        },
    };
}

function buildTraumaFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const art = detectTraumaArt(combinedText);
    const schienung = detectTraumaSchienung(combinedText);
    const kontrolle = detectTraumaKontrolle(combinedText);

    return {
        treatmentId: 'trauma',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        trauma: {
            ...(art ? { art } : {}),
            ...(schienung ? { schienung } : {}),
            ...(kontrolle ? { kontrolle } : {}),
        },
    };
}

function buildImplantFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const phase = detectImplantPhase(combinedText);
    const nachsorge = detectImplantNachsorge(combinedText);

    return {
        treatmentId: 'implant',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        implant: {
            ...(phase ? { phase } : {}),
            ...(nachsorge ? { nachsorge } : {}),
        },
    };
}

function buildSchieneFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectSchieneTyp(combinedText);
    const phase = detectSchienePhase(combinedText);

    return {
        treatmentId: 'schiene',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        schiene: {
            ...(type ? { type } : {}),
            ...(phase ? { phase } : {}),
        },
    };
}

function buildKroneFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectKroneArt(combinedText);
    const placement = detectKroneEingliederung(combinedText);

    return {
        treatmentId: 'krone',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        krone: {
            ...(type ? { type } : {}),
            ...(placement ? { placement } : {}),
        },
    };
}

function buildTeilkroneFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectTeilkroneArt(combinedText);
    const placement = detectTeilkroneEingliederung(combinedText);

    return {
        treatmentId: 'teilkrone',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        teilkrone: {
            ...(type ? { type } : {}),
            ...(placement ? { placement } : {}),
        },
    };
}

function buildBrueckeFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectBrueckeTyp(combinedText);
    const phase = detectBrueckePhase(combinedText);

    return {
        treatmentId: 'bruecke',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        bruecke: {
            ...(type ? { type } : {}),
            ...(phase ? { phase } : {}),
        },
    };
}

function buildTeilprotheseFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectTeilprotheseTyp(combinedText);
    const phase = detectTeilprothesePhase(combinedText);

    return {
        treatmentId: 'teilprothese',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        teilprothese: {
            ...(type ? { type } : {}),
            ...(phase ? { phase } : {}),
        },
    };
}

function buildTotalprotheseFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const toothValue = instanceScope?.tooth ?? (extracted as Record<string, unknown>).tooth;
    const tooth = toothValue !== undefined && toothValue !== null ? String(toothValue) : undefined;
    const textSources: string[] = [];
    if (extracted.rawDictation) textSources.push(extracted.rawDictation);
    if (instanceScope?.tooth && extracted.teeth) {
        const toothData = extracted.teeth.find(t => t.tooth === instanceScope.tooth);
        if (toothData?.notes) {
            textSources.push(...toothData.notes);
        }
    }
    const combinedText = textSources.join(' ');
    const type = detectTotalprotheseTyp(combinedText);
    const phase = detectTotalprothesePhase(combinedText);

    return {
        treatmentId: 'totalprothese',
        tooth,
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        totalprothese: {
            ...(type ? { type } : {}),
            ...(phase ? { phase } : {}),
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Build TreatmentFacts from extraction result.
 * Routes to treatment-specific mappers.
 */
export function buildFactsFromExtraction(params: BuildFactsParams): TreatmentFacts {
    const { extracted, treatmentId, instanceScope } = params;
    const safeExtracted: ExtractedDataLike = extracted ?? {};
    const documentationContext = buildDocumentationContextFromExtraction(safeExtracted as unknown as Record<string, unknown>);

    const withDocumentationContext = (facts: TreatmentFacts): TreatmentFacts => {
        const hasContext =
            documentationContext.clinical.length > 0
            || documentationContext.patient.length > 0
            || documentationContext.administrative.length > 0
            || documentationContext.forensicNotes.length > 0
            || documentationContext.unresolved.length > 0;
        if (!hasContext) return facts;
        return {
            ...facts,
            documentationContext,
        };
    };

    switch (treatmentId) {
        case 'fuellung':
            return withDocumentationContext(buildFuellungFacts(safeExtracted, instanceScope));
        case 'endo':
            return withDocumentationContext(buildEndoFacts(safeExtracted, instanceScope));
        case 'extraction':
            return withDocumentationContext(buildExtractionFacts(safeExtracted, instanceScope));
        case 'pzr':
            return withDocumentationContext(buildPzrFacts(safeExtracted));
        case 'crown_prep':
            return withDocumentationContext(buildCrownPrepFacts(safeExtracted, instanceScope));
        case 'roentgen':
            return withDocumentationContext(buildRoentgenFacts(safeExtracted, instanceScope));
        case 'untersuchung':
            return withDocumentationContext(buildUntersuchungFacts(safeExtracted, instanceScope));
        case 'fissurenversiegelung':
            return withDocumentationContext(buildFissurenversiegelungFacts(safeExtracted, instanceScope));
        case 'ueberkappung':
            return withDocumentationContext(buildUeberkappungFacts(safeExtracted, instanceScope));
        case 'parodontologie':
            return withDocumentationContext(buildParodontologieFacts(safeExtracted, instanceScope));
        case 'upt':
            return withDocumentationContext(buildUptFacts(safeExtracted, instanceScope));
        case 'wsr':
            return withDocumentationContext(buildWsrFacts(safeExtracted, instanceScope));
        case 'trauma':
            return withDocumentationContext(buildTraumaFacts(safeExtracted, instanceScope));
        case 'implant':
            return withDocumentationContext(buildImplantFacts(safeExtracted, instanceScope));
        case 'schiene':
            return withDocumentationContext(buildSchieneFacts(safeExtracted, instanceScope));
        case 'krone':
            return withDocumentationContext(buildKroneFacts(safeExtracted, instanceScope));
        case 'teilkrone':
            return withDocumentationContext(buildTeilkroneFacts(safeExtracted, instanceScope));
        case 'bruecke':
            return withDocumentationContext(buildBrueckeFacts(safeExtracted, instanceScope));
        case 'teilprothese':
            return withDocumentationContext(buildTeilprotheseFacts(safeExtracted, instanceScope));
        case 'totalprothese':
            return withDocumentationContext(buildTotalprotheseFacts(safeExtracted, instanceScope));
        default:
            return withDocumentationContext({
                treatmentId,
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            });
    }
}

function buildExtractionFacts(extracted: ExtractedDataLike, instanceScope?: { tooth?: string }): TreatmentFacts {
    const raw = String((extracted as any).rawDictation ?? '').toLowerCase();
    const tooth = (instanceScope?.tooth ?? (extracted as any).tooth ?? '').toString();
    const anesthesiaDetected = detectAnesthesia(extracted);
    const anesthesiaAmbiguous = detectAnesthesiaAmbiguous(extracted);
    const anesthesia = anesthesiaAmbiguous ? 'unknown' : anesthesiaDetected;
    const woundCareNegated =
        raw.includes('keine wundversorgung') ||
        raw.includes('ohne wundversorgung') ||
        raw.includes('keine naht') ||
        raw.includes('ohne naht') ||
        raw.includes('kein tampon') ||
        raw.includes('ohne tampon');
    const woundCareMentioned = raw.includes('wundversorgung') || raw.includes('naht') || raw.includes('tampon');
    const woundCare = woundCareNegated ? false : woundCareMentioned ? true : undefined;

    return {
        treatmentId: 'extraction',
        cariesDepth: 'unknown',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
        tooth,
        anesthesia,
        anesthesiaAmbiguous,
        surfaceAnesthesia: detectSurfaceAnesthesia(extracted),
        woundCare,
    };
}
