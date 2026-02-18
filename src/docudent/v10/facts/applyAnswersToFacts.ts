/**
 * V10 Facts — applyAnswersToFacts
 * 
 * Applies user answers to update facts.
 */

import type {
    TreatmentFacts,
    CariesDepth,
    YesNoUnknown,
    CappingFact,
    MEDICAL_QUESTION_IDS,
} from './types';
import { clampCanalCountToTooth } from './endoToothAnatomy';

// ═══════════════════════════════════════════════════════════════
// NORMALIZERS
// ═══════════════════════════════════════════════════════════════

export function normalizeYesNo(value: unknown): YesNoUnknown {
    if (value === true || value === 'ja' || value === 'yes' || value === 'Ja') {
        return 'yes';
    }
    if (value === false || value === 'nein' || value === 'no' || value === 'Nein') {
        return 'no';
    }
    return 'unknown';
}

export function normalizeCariesDepth(value: unknown): CariesDepth {
    if (typeof value !== 'string') return 'unknown';
    const lower = value.toLowerCase();
    if (lower === 'profunda' || lower === 'caries profunda') return 'profunda';
    if (lower === 'pulpanah' || lower === 'tief' || lower === 'deep' || lower === 'pulp_near') return 'pulp_near';
    if (lower === 'normal' || lower === 'media' || lower === 'caries media') return 'normal';
    return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply user answers to facts
 */
export function applyAnswersToFacts(
    facts: TreatmentFacts,
    answers: Map<string, unknown> | Record<string, unknown>
): TreatmentFacts {
    const answerMap = answers instanceof Map ? answers : new Map(Object.entries(answers));

    const newFacts: TreatmentFacts = {
        ...facts,
        capping: { ...facts.capping },
        counseling: { ...facts.counseling },
    };
    const currentTooth = typeof newFacts.tooth === 'string' ? newFacts.tooth : undefined;

    const getAnswer = (...keys: string[]): unknown => {
        for (const key of keys) {
            if (answerMap.has(key)) return answerMap.get(key);
        }
        return undefined;
    };

    const getAnswerByRegex = (regex: RegExp): unknown => {
        for (const [key, value] of answerMap.entries()) {
            if (regex.test(key)) return value;
        }
        return undefined;
    };

    const normalizeBooleanAnswer = (value: unknown): boolean | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).toLowerCase();
        if (normalized.includes('ja') || normalized.includes('yes') || normalized.includes('true')) return true;
        if (normalized.includes('nein') || normalized.includes('no') || normalized.includes('false') || normalized.includes('keine')) return false;
        return Boolean(value);
    };

    const normalizeEuroAmount = (value: unknown): number | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value > 0 && value < 10000 ? value : undefined;
        }
        if (typeof value === 'string') {
            const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
            const parsed = Number.parseFloat(normalized);
            if (!Number.isFinite(parsed)) return undefined;
            return parsed > 0 && parsed < 10000 ? parsed : undefined;
        }
        return undefined;
    };

    const deriveCavityExtentHint = (surfaces?: Array<'m' | 'o' | 'd' | 'b' | 'l'>) => {
        const count = Array.isArray(surfaces) ? surfaces.length : 0;
        if (count <= 0) return undefined;
        if (count >= 3) return 'large';
        if (count === 2) return 'medium';
        return 'small';
    };

    let cappingIndicatesIndirect = false;
    let cappingIndicatesDirect = false;

    // Capping
    const cappingAnswer = getAnswer(
        'medical_ueberkappung',
        'ueberkappung',
        'forensic_ueberkappung',
        'forensic_capping',
        'capping'
    );
    if (cappingAnswer !== undefined) {
        const normalized = String(cappingAnswer).toLowerCase();
        const compact = normalized.replace(/[^a-z0-9]/g, '');
        const isIndirect = normalized.includes('indirekt') || compact === 'cp';
        const isDirect = (normalized.includes('direkt') && !normalized.includes('indirekt')) || compact === 'p';
        if (isIndirect || isDirect) {
            newFacts.capping.performed = 'yes';
            if (isIndirect) {
                cappingIndicatesIndirect = true;
                newFacts.pulpaOpened = false;
            }
            if (isDirect) {
                cappingIndicatesDirect = true;
                newFacts.pulpaOpened = true;
            }
        } else if (normalized.includes('keine') || normalized.includes('nein') || normalized.includes('no')) {
            newFacts.capping.performed = 'no';
        } else {
            newFacts.capping.performed = normalizeYesNo(cappingAnswer);
        }
    }

    // Capping material
    const materialAnswer = getAnswer(
        'medical_ueberkappung_material',
        'ueberkappung_material',
        'forensic_ueberkappung_material',
        'material'
    );
    if (materialAnswer !== undefined && typeof materialAnswer === 'string') {
        const materialMap: Record<string, CappingFact['material']> = {
            'caoh': 'Ca(OH)₂',
            'caoh2': 'Ca(OH)₂',
            'ca(oh)2': 'Ca(OH)₂',
            'Ca(OH)₂': 'Ca(OH)₂',
            'mta': 'MTA',
            'MTA': 'MTA',
            'biodentine': 'Biodentine',
            'Biodentine': 'Biodentine',
        };
        newFacts.capping.material = materialMap[materialAnswer.toLowerCase()] ?? materialAnswer as CappingFact['material'];
    }

    // Counseling
    const counselAnswer = getAnswer('medical_counsel_pulpitis_risk', 'counsel_pulpitis_risk', 'pulpitis_risk');
    if (counselAnswer !== undefined) {
        newFacts.counseling.pulpitisRisk = normalizeYesNo(counselAnswer);
    }

    // Depth
    const tiefeAnswer = getAnswer('tiefe', 'cavity_depth', 'forensic_tiefe');
    if (tiefeAnswer !== undefined) {
        newFacts.cariesDepth = normalizeCariesDepth(tiefeAnswer);
    }

    // Material (Füllung)
    const fillMaterialAnswer = getAnswer('material', 'fuellung_material');
    if (fillMaterialAnswer !== undefined && typeof fillMaterialAnswer === 'string') {
        const materialMap: Record<string, TreatmentFacts['materialMentioned']> = {
            'komposit': 'komposit',
            'composite': 'komposit',
            'giz': 'giz',
            'glasionomer': 'giz',
            'amalgam': 'amalgam',
        };
        const normalized = materialMap[fillMaterialAnswer.toLowerCase()] ?? 'unknown';
        newFacts.materialMentioned = normalized;
        newFacts.material = normalized;
    }

    // Adhesive technique (Füllung)
    const adhesiveAnswer = getAnswer('adhesive_technique', 'adhesive', 'fuellung_adhesive', 'adhesiv');
    if (adhesiveAnswer !== undefined) {
        const normalized = String(adhesiveAnswer).toLowerCase();
        if (normalized.includes('yes') || normalized.includes('ja')) {
            newFacts.adhesiveTechnique = true;
        } else if (normalized.includes('no') || normalized.includes('nein')) {
            newFacts.adhesiveTechnique = false;
        }
    }

    // MKV justification (Mehrkosten)
    const mkvAnswer = getAnswer('fuellung_mkv_justification', 'mkv_justification');
    if (mkvAnswer !== undefined) {
        const normalized = String(mkvAnswer).toLowerCase();
        const isNurKasse = normalized.includes('keine') || normalized.includes('nur') || facts.nurKasse === true;
        newFacts.mkvJustification = String(mkvAnswer);
        newFacts.mehrkostenSignalsClear = true;
        if (isNurKasse) {
            newFacts.nurKasse = true;
            newFacts.mkvPresent = false;
            newFacts.mehrkostenConfirmed = false;
        } else {
            newFacts.nurKasse = false;
            newFacts.mkvPresent = true;
            newFacts.mehrkostenConfirmed = true;
            if (normalized.includes('mehrschicht') || normalized.includes('schicht')) {
                newFacts.layeringMentioned = 'yes';
                newFacts.adhesiveTechnique = true;
            }
            if (normalized.includes('adhesiv') || normalized.includes('adhäsiv')) {
                newFacts.adhesiveTechnique = true;
            }
        }
    }

    // MKV confirmed (yes/no or explicit mkv/nur_kasse values)
    const mkvConfirmed = getAnswer('medical_mkv_confirmed', 'mkv_confirmed');
    if (mkvConfirmed !== undefined) {
        const normalized = String(mkvConfirmed).toLowerCase();
        const isYes =
            normalized.includes('yes') ||
            normalized.includes('ja') ||
            normalized.includes('mehrkosten') ||
            normalized.includes('mkv');
        const isNo =
            normalized.includes('no') ||
            normalized.includes('nein') ||
            normalized.includes('nur_kasse') ||
            normalized.includes('nur kasse');
        if (isYes) {
            newFacts.mkvPresent = true;
            newFacts.mehrkostenConfirmed = true;
            newFacts.nurKasse = false;
        } else if (isNo) {
            newFacts.mkvPresent = false;
            newFacts.mehrkostenConfirmed = false;
            newFacts.nurKasse = true;
        }
    }

    // MKV amount (Mehrkostenbetrag)
    const mkvBetragAnswer = getAnswer(
        'mkv_betrag',
        'mkv_amount',
        'mkvbetrag',
        'mkvamount',
        'mkv_mkv_betrag',
        'mkv_mkv_amount',
    );
    if (mkvBetragAnswer !== undefined) {
        const parsed = normalizeEuroAmount(mkvBetragAnswer);
        if (parsed !== undefined) {
            newFacts.mkvBetrag = parsed;
        }
    }

    // Combinability override (rule askback)
    const combinabilityOverride = getAnswer('rule_combinability_override', 'combinability_override')
        ?? getAnswerByRegex(/combinability_override/i);
    if (combinabilityOverride !== undefined) {
        const normalized = String(combinabilityOverride).toLowerCase();
        const dropSignals = ['drop', 'drop_blocked', 'nur_kasse', 'kasse', 'nicht', 'keine'];
        const allowSignals = ['allow', 'trotzdem', 'ok', 'abrechnen', 'billing'];
        let action: 'allow' | 'drop_blocked' | undefined;
        if (dropSignals.some(s => normalized.includes(s))) {
            action = 'drop_blocked';
        } else if (allowSignals.some(s => normalized.includes(s))) {
            action = 'allow';
        }
        if (action) {
            newFacts.combinabilityOverride = { action };
        }
    }

    // Pulpaschutz / Überkappung via pulpaschutz askback
    const pulpaAnswer = getAnswer('fuellung_pulpaschutz', 'pulpaschutz');
    if (pulpaAnswer !== undefined) {
        const normalized = String(pulpaAnswer).toLowerCase();
        const compact = normalized.replace(/[^a-z0-9]/g, '');
        if ((normalized.includes('direkt') && !normalized.includes('indirekt')) || compact === 'p') {
            newFacts.capping.performed = 'yes';
            newFacts.pulpaOpened = true;
            cappingIndicatesDirect = true;
        } else if (normalized.includes('indirekt') || compact === 'cp') {
            newFacts.capping.performed = 'yes';
            newFacts.pulpaOpened = false;
            cappingIndicatesIndirect = true;
        } else if (normalized.includes('keine') || normalized.includes('nein') || normalized.includes('no')) {
            newFacts.capping.performed = 'no';
        }
    }

    if (cappingIndicatesIndirect && !cappingIndicatesDirect) {
        newFacts.pulpaOpened = false;
    }

    // Anesthesia type
    const anesthesiaAnswer = getAnswer('la_type', 'medical_la_type', 'anesthesia_type', 'anesthesia');
    if (anesthesiaAnswer !== undefined && typeof anesthesiaAnswer === 'string') {
        const normalized = anesthesiaAnswer.toLowerCase();
        if (normalized.includes('infiltr')) newFacts.anesthesia = 'infiltr';
        else if (normalized.includes('leitung')) newFacts.anesthesia = 'leitung';
        else if (normalized.includes('keine') || normalized.includes('none')) newFacts.anesthesia = 'none';
        newFacts.anesthesiaAmbiguous = false;
        newFacts.fuellung = {
            ...(newFacts.fuellung ?? {}),
            anesthesiaType: newFacts.anesthesia === 'infiltr'
                ? 'infiltration'
                : newFacts.anesthesia === 'leitung'
                    ? 'leitung'
                    : undefined,
        };
    }

    // Vitality (ViPr)
    const viprAnswer = getAnswer('medical_vipr', 'vipr', 'vitality');
    if (viprAnswer !== undefined) {
        const normalized = String(viprAnswer).toLowerCase();
        if (normalized.includes('+') || normalized.includes('pos')) newFacts.vitality = 'pos';
        if (normalized.includes('-') || normalized.includes('neg')) newFacts.vitality = 'neg';
    }

    // Percussion
    const percussionAnswer = getAnswer('percussion', 'perkussion', 'medical_percussion');
    if (percussionAnswer !== undefined) {
        const normalized = String(percussionAnswer).toLowerCase();
        if (normalized.includes('+') || normalized.includes('pos')) newFacts.percussion = 'pos';
        if (normalized.includes('-') || normalized.includes('neg')) newFacts.percussion = 'neg';
    }

    // Strict-KZV radiology evidence (facts-only)
    const radiologyIndication = getAnswer(
        'medical_roentgen_indikation',
        'roentgen_indikation',
        'radiology_indication',
        'xray_indication'
    );
    const radiologyType = getAnswer(
        'medical_roentgen_typ',
        'roentgen_typ',
        'radiology_type',
        'xray_type'
    );
    const radiologyTiming = getAnswer(
        'medical_roentgen_zeitpunkt',
        'roentgen_zeitpunkt',
        'radiology_timing',
        'xray_timing'
    );
    const radiologyFindings = getAnswer(
        'medical_roentgen_befund',
        'roentgen_befund',
        'radiology_findings',
        'xray_findings'
    );
    if (
        radiologyIndication !== undefined
        || radiologyType !== undefined
        || radiologyTiming !== undefined
        || radiologyFindings !== undefined
    ) {
        newFacts.radiology = {
            ...(newFacts.radiology ?? {}),
            ...(radiologyIndication !== undefined ? { indication: String(radiologyIndication).trim() } : {}),
            ...(radiologyType !== undefined ? { type: String(radiologyType).trim() } : {}),
            ...(radiologyTiming !== undefined ? { timing: String(radiologyTiming).trim() } : {}),
            ...(radiologyFindings !== undefined ? { findings: String(radiologyFindings).trim() } : {}),
        };
    }

    // Untersuchung evidence
    const untersuchungReason = getAnswer(
        'medical_untersuchung_anlass',
        'untersuchung_anlass',
        'anlass'
    );
    const untersuchungFindings = getAnswer(
        'medical_untersuchung_befunde',
        'untersuchung_befunde',
        'befunde'
    );
    const untersuchungAssessment = getAnswer(
        'medical_untersuchung_beurteilung',
        'untersuchung_beurteilung',
        'beurteilung'
    );
    if (
        untersuchungReason !== undefined
        || untersuchungFindings !== undefined
        || untersuchungAssessment !== undefined
    ) {
        newFacts.untersuchung = {
            ...(newFacts.untersuchung as Record<string, unknown> ?? {}),
            ...(untersuchungReason !== undefined ? { reason: String(untersuchungReason).trim() } : {}),
            ...(untersuchungFindings !== undefined ? { findings: String(untersuchungFindings).trim() } : {}),
            ...(untersuchungAssessment !== undefined ? { assessment: String(untersuchungAssessment).trim() } : {}),
        };
    }

    // Fissurenversiegelung evidence
    const fissurenIndikation = getAnswer(
        'medical_fissuren_indikation',
        'fissuren_indikation',
        'indikation'
    );
    const fissurenMaterial = getAnswer(
        'medical_fissuren_material',
        'fissuren_material',
        'versiegelungsmaterial'
    );
    if (fissurenIndikation !== undefined || fissurenMaterial !== undefined) {
        newFacts.fissurenversiegelung = {
            ...(newFacts.fissurenversiegelung as Record<string, unknown> ?? {}),
            ...(fissurenIndikation !== undefined ? { indication: String(fissurenIndikation).trim() } : {}),
            ...(fissurenMaterial !== undefined ? { material: String(fissurenMaterial).trim() } : {}),
        };
    }

    // Parodontologie evidence
    const parodontologiePhase = getAnswer(
        'medical_parodontologie_phase',
        'parodontologie_phase',
        'paro_phase'
    );
    const parodontologieUptGrad = getAnswer(
        'medical_parodontologie_upt_grad',
        'parodontologie_upt_grad',
        'upt_grad'
    );
    if (parodontologiePhase !== undefined || parodontologieUptGrad !== undefined) {
        newFacts.parodontologie = {
            ...(newFacts.parodontologie as Record<string, unknown> ?? {}),
            ...(parodontologiePhase !== undefined ? { phase: String(parodontologiePhase).trim().toLowerCase() } : {}),
            ...(parodontologieUptGrad !== undefined ? { uptGrade: String(parodontologieUptGrad).trim().toLowerCase() } : {}),
        };
    }

    // UPT evidence
    const uptGrad = getAnswer(
        'medical_upt_grad',
        'upt_grad',
        'upt_grade'
    );
    const uptIntervall = getAnswer(
        'medical_upt_intervall',
        'upt_intervall',
        'upt_interval'
    );
    if (uptGrad !== undefined || uptIntervall !== undefined) {
        newFacts.upt = {
            ...(newFacts.upt as Record<string, unknown> ?? {}),
            ...(uptGrad !== undefined ? { grade: String(uptGrad).trim().toLowerCase() } : {}),
            ...(uptIntervall !== undefined ? { interval: String(uptIntervall).trim().toLowerCase() } : {}),
        };
    }

    // Krone evidence
    const kroneArt = getAnswer(
        'medical_krone_art',
        'krone_art',
        'krone_type'
    );
    const kroneEingliederung = getAnswer(
        'medical_krone_eingliederung',
        'krone_eingliederung',
        'krone_placement'
    );
    if (kroneArt !== undefined || kroneEingliederung !== undefined) {
        newFacts.krone = {
            ...(newFacts.krone as Record<string, unknown> ?? {}),
            ...(kroneArt !== undefined ? { type: String(kroneArt).trim().toLowerCase() } : {}),
            ...(kroneEingliederung !== undefined ? { placement: String(kroneEingliederung).trim().toLowerCase() } : {}),
        };
    }

    // Bruecke evidence
    const brueckeTyp = getAnswer(
        'medical_bruecke_typ',
        'bruecke_typ',
        'bruecke_type'
    );
    const brueckePhase = getAnswer(
        'medical_bruecke_phase',
        'bruecke_phase',
        'bruecke_step'
    );
    if (brueckeTyp !== undefined || brueckePhase !== undefined) {
        newFacts.bruecke = {
            ...(newFacts.bruecke as Record<string, unknown> ?? {}),
            ...(brueckeTyp !== undefined ? { type: String(brueckeTyp).trim().toLowerCase() } : {}),
            ...(brueckePhase !== undefined ? { phase: String(brueckePhase).trim().toLowerCase() } : {}),
        };
    }

    // Teilkrone evidence
    const teilkroneArt = getAnswer(
        'medical_teilkrone_art',
        'teilkrone_art',
        'teilkrone_type'
    );
    const teilkroneEingliederung = getAnswer(
        'medical_teilkrone_eingliederung',
        'teilkrone_eingliederung',
        'teilkrone_placement'
    );
    if (teilkroneArt !== undefined || teilkroneEingliederung !== undefined) {
        newFacts.teilkrone = {
            ...(newFacts.teilkrone as Record<string, unknown> ?? {}),
            ...(teilkroneArt !== undefined ? { type: String(teilkroneArt).trim().toLowerCase() } : {}),
            ...(teilkroneEingliederung !== undefined ? { placement: String(teilkroneEingliederung).trim().toLowerCase() } : {}),
        };
    }

    // WSR evidence
    const wsrZugang = getAnswer(
        'medical_wsr_zugang',
        'wsr_zugang',
        'wsr_access'
    );
    const wsrLokalisation = getAnswer(
        'medical_wsr_lokalisation',
        'wsr_lokalisation',
        'wsr_location'
    );
    if (wsrZugang !== undefined || wsrLokalisation !== undefined) {
        newFacts.wsr = {
            ...(newFacts.wsr as Record<string, unknown> ?? {}),
            ...(wsrZugang !== undefined ? { zugang: String(wsrZugang).trim().toLowerCase() } : {}),
            ...(wsrLokalisation !== undefined ? { lokalisation: String(wsrLokalisation).trim().toLowerCase() } : {}),
        };
    }

    // Trauma evidence
    const traumaArt = getAnswer(
        'medical_trauma_art',
        'trauma_art',
        'trauma_type'
    );
    const traumaSchienung = getAnswer(
        'medical_trauma_schienung',
        'trauma_schienung',
        'trauma_splint'
    );
    const traumaKontrolle = getAnswer(
        'medical_trauma_kontrolle',
        'trauma_kontrolle',
        'trauma_followup'
    );
    if (traumaArt !== undefined || traumaSchienung !== undefined || traumaKontrolle !== undefined) {
        newFacts.trauma = {
            ...(newFacts.trauma as Record<string, unknown> ?? {}),
            ...(traumaArt !== undefined ? { art: String(traumaArt).trim().toLowerCase() } : {}),
            ...(traumaSchienung !== undefined ? { schienung: String(traumaSchienung).trim().toLowerCase() } : {}),
            ...(traumaKontrolle !== undefined ? { kontrolle: String(traumaKontrolle).trim().toLowerCase() } : {}),
        };
    }

    // Implant evidence
    const implantPhase = getAnswer(
        'medical_implant_phase',
        'implant_phase',
        'implant_step'
    );
    const implantNachsorge = getAnswer(
        'medical_implant_nachsorge',
        'implant_nachsorge',
        'implant_followup'
    );
    if (implantPhase !== undefined || implantNachsorge !== undefined) {
        newFacts.implant = {
            ...(newFacts.implant as Record<string, unknown> ?? {}),
            ...(implantPhase !== undefined ? { phase: String(implantPhase).trim().toLowerCase() } : {}),
            ...(implantNachsorge !== undefined ? { nachsorge: String(implantNachsorge).trim().toLowerCase() } : {}),
        };
    }

    // Schiene evidence
    const schieneTyp = getAnswer(
        'medical_schiene_typ',
        'schiene_typ',
        'schiene_type'
    );
    const schienePhase = getAnswer(
        'medical_schiene_phase',
        'schiene_phase',
        'schiene_step'
    );
    if (schieneTyp !== undefined || schienePhase !== undefined) {
        newFacts.schiene = {
            ...(newFacts.schiene as Record<string, unknown> ?? {}),
            ...(schieneTyp !== undefined ? { type: String(schieneTyp).trim().toLowerCase() } : {}),
            ...(schienePhase !== undefined ? { phase: String(schienePhase).trim().toLowerCase() } : {}),
        };
    }

    // Teilprothese evidence
    const teilprotheseTyp = getAnswer(
        'medical_teilprothese_typ',
        'teilprothese_typ',
        'teilprothese_type'
    );
    const teilprothesePhase = getAnswer(
        'medical_teilprothese_phase',
        'teilprothese_phase',
        'teilprothese_step'
    );
    if (teilprotheseTyp !== undefined || teilprothesePhase !== undefined) {
        newFacts.teilprothese = {
            ...(newFacts.teilprothese as Record<string, unknown> ?? {}),
            ...(teilprotheseTyp !== undefined ? { type: String(teilprotheseTyp).trim().toLowerCase() } : {}),
            ...(teilprothesePhase !== undefined ? { phase: String(teilprothesePhase).trim().toLowerCase() } : {}),
        };
    }

    // Totalprothese evidence
    const totalprotheseTyp = getAnswer(
        'medical_totalprothese_typ',
        'totalprothese_typ',
        'totalprothese_type'
    );
    const totalprothesePhase = getAnswer(
        'medical_totalprothese_phase',
        'totalprothese_phase',
        'totalprothese_step'
    );
    if (totalprotheseTyp !== undefined || totalprothesePhase !== undefined) {
        newFacts.totalprothese = {
            ...(newFacts.totalprothese as Record<string, unknown> ?? {}),
            ...(totalprotheseTyp !== undefined ? { type: String(totalprotheseTyp).trim().toLowerCase() } : {}),
            ...(totalprothesePhase !== undefined ? { phase: String(totalprothesePhase).trim().toLowerCase() } : {}),
        };
    }

    // Isolation (Kofferdam / relative)
    const isolationAnswer = getAnswer('isolation', 'medical_isolation', 'fuellung_isolation');
    if (isolationAnswer !== undefined && typeof isolationAnswer === 'string') {
        const normalized = isolationAnswer.toLowerCase();
        if (normalized.includes('kofferdam')) {
            newFacts.kofferdamUsed = true;
            newFacts.kofferdamMentioned = true;
            newFacts.isolationMentioned = 'rubberDam';
        } else if (normalized.includes('relativ')) {
            newFacts.kofferdamUsed = false;
            newFacts.kofferdamMentioned = true;
            newFacts.isolationMentioned = 'relative';
        } else if (
            normalized.includes('keine')
            || normalized.includes('kein')
            || normalized.includes('ohne')
            || normalized.includes('none')
            || normalized.includes('nein')
            || normalized.includes('no')
            || normalized.includes('false')
        ) {
            newFacts.kofferdamUsed = false;
            newFacts.kofferdamMentioned = false;
            newFacts.isolationMentioned = 'unknown';
        }
    }

    // Surfaces (answer may be array or comma-separated string)
    const surfacesAnswer = getAnswer('surfaces', 'medical_surfaces', 'fuellung_surfaces', 'surface');
    if (surfacesAnswer !== undefined) {
        const raw = Array.isArray(surfacesAnswer)
            ? surfacesAnswer.join(',')
            : String(surfacesAnswer);
        const tokens = raw
            .toLowerCase()
            .split(/[\s,;]+/)
            .filter(Boolean);
        const normalized = tokens.filter(t => ['m', 'o', 'd', 'b', 'l'].includes(t)) as Array<'m' | 'o' | 'd' | 'b' | 'l'>;
        if (normalized.length > 0) {
            newFacts.surfaces = normalized;
            newFacts.surfaceAmbiguous = false;
            newFacts.surfaceSource = 'dictation';
            newFacts.cavityExtentHint = deriveCavityExtentHint(normalized);
        }
    }

    // Fluoridation
    const fluorAnswer = getAnswer('fluor', 'fluoridation');
    if (fluorAnswer !== undefined) {
        const normalized = normalizeBooleanAnswer(fluorAnswer);
        if (normalized === undefined) {
            // fall through
        }
        newFacts.fuellung = {
            ...(newFacts.fuellung ?? {}),
            fluoridation: normalized ?? Boolean(fluorAnswer),
        };
    }

    // Surface anesthesia
    const surfaceAnesthesiaAnswer = getAnswer('surface_anesthesia', 'oberflaeche_la', 'oberflaechenanaesthesie');
    if (surfaceAnesthesiaAnswer !== undefined) {
        const normalized = normalizeBooleanAnswer(surfaceAnesthesiaAnswer);
        newFacts.surfaceAnesthesia = normalized ?? Boolean(surfaceAnesthesiaAnswer);
    }

    // Wound care / suture (Extraction)
    if (newFacts.treatmentId === 'extraction') {
        const woundCareAnswer = getAnswer('wound_care', 'wundversorgung', 'naht', 'extraction_wound_care');
        const normalized = normalizeBooleanAnswer(woundCareAnswer);
        if (normalized !== undefined) {
            newFacts.woundCare = normalized;
        }
    }

    // PZR answers
    if (newFacts.treatmentId === 'pzr') {
        const zahnsteinAnswer = getAnswer('pzr_zahnstein', 'zahnstein_entfernung', 'zahnstein');
        const zahnstein = normalizeBooleanAnswer(zahnsteinAnswer);
        if (zahnstein !== undefined) {
            newFacts.pzr = {
                ...(newFacts.pzr ?? {}),
                zahnsteinEntfernung: zahnstein,
            };
        }
        const pzrFluorAnswer = getAnswer('pzr_fluoridation', 'fluoridierung');
        const fluor = normalizeBooleanAnswer(pzrFluorAnswer);
        if (fluor !== undefined) {
            newFacts.pzr = {
                ...(newFacts.pzr ?? {}),
                fluoridation: fluor,
            };
        }
    }

    // Crown prep answers
    if (newFacts.treatmentId === 'crown_prep') {
        const prepAnswer = getAnswer('crown_prep_preparation', 'crown_prep_praeparation', 'praeparation');
        const prep = normalizeBooleanAnswer(prepAnswer);
        if (prep !== undefined) {
            newFacts.crownPrep = {
                ...(newFacts.crownPrep ?? {}),
                preparation: prep,
            };
        }
        const impressionAnswer = getAnswer('crown_prep_impression', 'abformung');
        const impression = normalizeBooleanAnswer(impressionAnswer);
        if (impression !== undefined) {
            newFacts.crownPrep = {
                ...(newFacts.crownPrep ?? {}),
                impression,
            };
        }
        const provisionalAnswer = getAnswer('crown_prep_provisional', 'provisorium');
        const provisional = normalizeBooleanAnswer(provisionalAnswer);
        if (provisional !== undefined) {
            newFacts.crownPrep = {
                ...(newFacts.crownPrep ?? {}),
                provisional,
            };
        }
    }

    // Finishing / Politur / Okklusion
    const finishingAnswer = getAnswer('finishing', 'finishing_polishing', 'politur', 'okklusion', 'bisskontrolle');
    if (finishingAnswer !== undefined) {
        const normalized = String(finishingAnswer).toLowerCase();
        if (normalized.includes('ja') || normalized.includes('yes') || normalized.includes('true')) {
            newFacts.finishingPerformed = true;
        } else if (normalized.includes('nein') || normalized.includes('no') || normalized.includes('false')) {
            newFacts.finishingPerformed = false;
        } else {
            newFacts.finishingPerformed = Boolean(finishingAnswer);
        }
    }

    // Exkavation
    const exkavationAnswer = getAnswer('exkavation', 'caries_exkavation');
    if (exkavationAnswer !== undefined) {
        const normalized = normalizeBooleanAnswer(exkavationAnswer);
        newFacts.exkavationPerformed = normalized ?? Boolean(exkavationAnswer);
    }

    // Layering technique
    const layeringAnswer = getAnswer('layering', 'fuellung_layering', 'schichttechnik');
    if (layeringAnswer !== undefined) {
        const normalized = String(layeringAnswer).toLowerCase();
        if (normalized.includes('yes') || normalized.includes('ja') || normalized.includes('mehr') || normalized.includes('schicht')) {
            newFacts.layeringMentioned = 'yes';
        } else if (normalized.includes('no') || normalized.includes('nein') || normalized.includes('einfach') || normalized.includes('bulk')) {
            newFacts.layeringMentioned = 'no';
        }
    }

    // ── Endo askbacks ──────────────────────────────────────────
    const endoKofferdam = getAnswer('medical_endo_kofferdam', 'endo_kofferdam');
    if (endoKofferdam !== undefined) {
        const normalized = normalizeYesNo(endoKofferdam);
        const raw = String(endoKofferdam).toLowerCase();
        const yes =
            normalized === 'yes'
            || raw.includes('kofferdam')
            || raw.includes('rubber');
        const relative =
            raw.includes('relativ')
            || raw.includes('watterollen')
            || raw.includes('watte');
        const no =
            normalized === 'no'
            || relative
            || raw.includes('none')
            || raw.includes('kein')
            || raw.includes('keine')
            || raw.includes('ohne')
            || raw.includes('nein')
            || raw.includes('no')
            || raw.includes('false');

        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            kofferdam: yes ? true : no ? false : (newFacts.endo as Record<string, unknown> | undefined)?.kofferdam as boolean | undefined,
        };
        if (yes) {
            newFacts.kofferdamUsed = true;
            newFacts.kofferdamMentioned = true;
            newFacts.isolationMentioned = 'rubberDam';
        } else if (relative) {
            newFacts.kofferdamUsed = false;
            newFacts.kofferdamMentioned = true;
            newFacts.isolationMentioned = 'relative';
        } else if (no) {
            newFacts.kofferdamUsed = false;
            newFacts.kofferdamMentioned = false;
            newFacts.isolationMentioned = 'unknown';
        }
    }

    const endoWlMethod = getAnswer('medical_wl_method', 'medical_endo_wl_method', 'endo_wl_method', 'wl_method');
    if (endoWlMethod !== undefined) {
        const normalized = String(endoWlMethod).toLowerCase();
        const isElectronic =
            normalized.includes('elektr')
            || normalized.includes('apex')
            || normalized.includes('eal')
            || normalized.includes('apexlokator')
            || normalized.includes('apex locator')
            || normalized.includes('beide')
            || normalized.includes('both');
        const isXray =
            normalized.includes('röntgen')
            || normalized.includes('roentgen')
            || normalized.includes('xray')
            || normalized.includes('rö');
        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            workingLengthMethod: isElectronic
                ? 'electronic'
                : isXray
                    ? 'xray'
                    : undefined,
        };
    }

    const endoIrrigation = getAnswer('medical_irrigation', 'medical_endo_irrigation', 'endo_irrigation');
    if (endoIrrigation !== undefined) {
        const raw = Array.isArray(endoIrrigation) ? endoIrrigation.join(' ') : String(endoIrrigation);
        const normalized = raw.toLowerCase();
        const solutions: string[] = [];
        if (normalized.includes('naocl')) solutions.push('NaOCl');
        if (normalized.includes('edta')) solutions.push('EDTA');
        if (normalized.includes('chx') || normalized.includes('chlorhex')) solutions.push('CHX');
        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            irrigationSolutions: normalized.includes('none') || normalized.includes('keine')
                ? []
                : solutions.length > 0
                    ? solutions
                    : (newFacts.endo ?? {}).irrigationSolutions,
        };
    }

    const endoMedication = getAnswer('medical_endo_medication', 'endo_medication');
    if (endoMedication !== undefined) {
        const normalized = String(endoMedication).toLowerCase();
        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            medication: normalized.includes('ca') || normalized.includes('calcium') ? 'Ca(OH)2' : String(endoMedication),
        };
    }

    const endoObturation = getAnswer('medical_wf_technique', 'medical_endo_obturation_technique', 'endo_obturation_technique', 'wf_technique');
    if (endoObturation !== undefined) {
        const normalized = String(endoObturation).toLowerCase();
        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            wfTechnique: normalized.includes('warm') ? 'warm'
                : normalized.includes('einzel') || normalized.includes('single') ? 'einzel'
                    : normalized.includes('kalt') || normalized.includes('lateral') ? 'kalt'
                        : undefined,
        };
    }

    const endoCanalCount = getAnswer('endo_canal_count', 'medical_endo_canal_count', 'canal_count');
    if (endoCanalCount !== undefined) {
        const parsed = typeof endoCanalCount === 'number'
            ? endoCanalCount
            : Number.parseInt(String(endoCanalCount), 10);
        if (Number.isFinite(parsed)) {
            newFacts.endo = {
                ...(newFacts.endo ?? {}),
                canalCount: clampCanalCountToTooth(currentTooth, parsed),
            };
        }
    }

    const workingLengthsAnswer =
        getAnswer('workingLengthsByCanal', 'working_lengths', 'endo_working_lengths')
        ?? getAnswerByRegex(/ENDO_.*WORKING_LENGTHS/i);

    const normalizedWorkingLengthsText = (() => {
        if (!workingLengthsAnswer) return undefined;
        if (typeof workingLengthsAnswer === 'string') {
            const value = workingLengthsAnswer.trim();
            return value.length > 0 ? value : undefined;
        }
        if (typeof workingLengthsAnswer === 'object' && !Array.isArray(workingLengthsAnswer)) {
            const entries = Object.entries(workingLengthsAnswer as Record<string, unknown>)
                .map(([canal, len]) => [String(canal).trim().toUpperCase(), String(len ?? '').trim()] as const)
                .filter(([canal, len]) => canal.length > 0 && len.length > 0);
            if (entries.length === 0) return undefined;
            return entries.map(([canal, len]) => `${canal}: ${len} mm`).join(', ');
        }
        return String(workingLengthsAnswer);
    })();

    if (normalizedWorkingLengthsText) {
        newFacts.endo = {
            ...(newFacts.endo ?? {}),
            workingLengthsText: normalizedWorkingLengthsText,
        };
    }

    // Derive canal count from working length answers (if explicit canal count missing)
    if (newFacts.endo?.canalCount === undefined) {

        const parsedCanals = (() => {
            if (workingLengthsAnswer && typeof workingLengthsAnswer === 'object' && !Array.isArray(workingLengthsAnswer)) {
                const keys = Object.keys(workingLengthsAnswer as Record<string, unknown>).filter(Boolean);
                return keys.length > 0 ? keys.length : undefined;
            }
            if (typeof workingLengthsAnswer === 'string') {
                const trimmed = workingLengthsAnswer.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
                        const keys = Object.keys(parsed).filter(Boolean);
                        if (keys.length > 0) return keys.length;
                    } catch {
                        // fall through to regex scan
                    }
                }
                const canalPattern = /\b(MB1|MB2|MB|ML|MV|DB|DL|DV|D|P|B|L|K1|K2|K3|K4)\b/gi;
                const hits = new Set<string>();
                let match: RegExpExecArray | null;
                while ((match = canalPattern.exec(trimmed)) !== null) {
                    hits.add(match[1].toUpperCase());
                }
                if (hits.size > 0) return hits.size;
            }
            return undefined;
        })();

        if (parsedCanals !== undefined) {
            newFacts.endo = {
                ...(newFacts.endo ?? {}),
                canalCount: clampCanalCountToTooth(currentTooth, parsedCanals),
            };
        }
    }

    // Hemostasis
    const hemostasisAnswer = getAnswer('medical_hemostasis', 'hemostasis');
    if (hemostasisAnswer !== undefined) {
        newFacts.bleeding = {
            ...newFacts.bleeding,
            detected: newFacts.bleeding?.detected ?? 'unknown',
            hemostasisPerformed: normalizeYesNo(hemostasisAnswer),
        };
    }

    // Sensitivity
    const sensitivityAnswer = getAnswer('medical_sensitivity_followup', 'sensitivity_followup');
    if (sensitivityAnswer !== undefined) {
        newFacts.sensitivity = {
            ...newFacts.sensitivity,
            reported: newFacts.sensitivity?.reported ?? 'unknown',
            desensitizerApplied: normalizeYesNo(sensitivityAnswer),
        };
    }

    return newFacts;
}
