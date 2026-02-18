/**
 * V10 Askback Question Builder — SSOT via medical_kb askbacks
 */

import type { DynamicQuestion } from '../../contracts/questions';
import { medicalKbV10 } from '../../medical_kb';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';

type AskbackDefinition = {
    questionKey: string;
    name: string;
    category?: string;
    required?: boolean;
    options?: Array<{ id: string; label: string; dataValue?: unknown }>;
};

const fallbackDefinitions: Record<string, AskbackDefinition> = {
    vitality: {
        questionKey: 'vitality',
        name: 'Vitalitaetstest (ViPr) dokumentiert?',
        category: 'forensic',
        options: [
            { id: 'pos', label: 'Positiv (+)', dataValue: 'pos' },
            { id: 'neg', label: 'Negativ (-)', dataValue: 'neg' },
            { id: 'unknown', label: 'Nicht dokumentiert', dataValue: 'unknown' },
        ],
    },
    percussion: {
        questionKey: 'percussion',
        name: 'Perkussion dokumentiert?',
        category: 'forensic',
        options: [
            { id: 'pos', label: 'Positiv (+)', dataValue: 'pos' },
            { id: 'neg', label: 'Negativ (-)', dataValue: 'neg' },
            { id: 'unknown', label: 'Nicht dokumentiert', dataValue: 'unknown' },
        ],
    },
    radiology_indication: {
        questionKey: 'radiology_indication',
        name: 'Roentgen-Indikation dokumentieren',
        category: 'forensic',
    },
    radiology_type: {
        questionKey: 'radiology_type',
        name: 'Roentgen-Typ dokumentieren (z. B. Zahnfilm/Bissfluegel/OPG)',
        category: 'forensic',
    },
    radiology_timing: {
        questionKey: 'radiology_timing',
        name: 'Roentgen-Zeitpunkt dokumentieren',
        category: 'forensic',
    },
    radiology_findings: {
        questionKey: 'radiology_findings',
        name: 'Roentgen-Befund dokumentieren',
        category: 'forensic',
    },
    untersuchung_anlass: {
        questionKey: 'untersuchung_anlass',
        name: 'Anlass der Untersuchung dokumentieren',
        category: 'forensic',
    },
    untersuchung_befunde: {
        questionKey: 'untersuchung_befunde',
        name: 'Wesentliche Befunde dokumentieren',
        category: 'forensic',
    },
    untersuchung_beurteilung: {
        questionKey: 'untersuchung_beurteilung',
        name: 'Beurteilung/Diagnose dokumentieren',
        category: 'forensic',
    },
    fissuren_indikation: {
        questionKey: 'fissuren_indikation',
        name: 'Fissurenversiegelung-Indikation dokumentieren',
        category: 'forensic',
        options: [
            { id: 'kariesprophylaxe', label: 'Kariesprophylaxe', dataValue: 'kariesprophylaxe' },
            { id: 'erhoehtes_risiko', label: 'Erhoehtes Kariesrisiko', dataValue: 'erhoehtes_risiko' },
        ],
    },
    fissuren_material: {
        questionKey: 'fissuren_material',
        name: 'Versiegelungsmaterial dokumentieren',
        category: 'forensic',
        options: [
            { id: 'kunststoff', label: 'Kunststoff', dataValue: 'kunststoff' },
            { id: 'giz_provisorisch', label: 'GIZ provisorisch', dataValue: 'giz_provisorisch' },
        ],
    },
    parodontologie_phase: {
        questionKey: 'parodontologie_phase',
        name: 'PAR-Phase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'status', label: 'Status/PSI', dataValue: 'status' },
            { id: 'ait', label: 'AIT', dataValue: 'ait' },
            { id: 'upt', label: 'UPT', dataValue: 'upt' },
        ],
    },
    parodontologie_upt_grad: {
        questionKey: 'parodontologie_upt_grad',
        name: 'UPT-Grad dokumentieren',
        category: 'forensic',
        options: [
            { id: 'a', label: 'Grad A', dataValue: 'a' },
            { id: 'b', label: 'Grad B', dataValue: 'b' },
            { id: 'c', label: 'Grad C', dataValue: 'c' },
        ],
    },
    upt_grad: {
        questionKey: 'upt_grad',
        name: 'UPT-Grad dokumentieren',
        category: 'forensic',
        options: [
            { id: 'a', label: 'Grad A', dataValue: 'a' },
            { id: 'b', label: 'Grad B', dataValue: 'b' },
            { id: 'c', label: 'Grad C', dataValue: 'c' },
        ],
    },
    upt_intervall: {
        questionKey: 'upt_intervall',
        name: 'Recallintervall dokumentieren',
        category: 'forensic',
        options: [
            { id: '3_4_monate', label: '3-4 Monate', dataValue: '3-4_monate' },
            { id: '6_monate', label: '6 Monate', dataValue: '6_monate' },
            { id: '12_monate', label: '12 Monate', dataValue: '12_monate' },
        ],
    },
    krone_art: {
        questionKey: 'krone_art',
        name: 'Kronenart dokumentieren',
        category: 'forensic',
        options: [
            { id: 'vollkrone', label: 'Vollkrone', dataValue: 'vollkrone' },
            { id: 'provisorium', label: 'Provisorische Krone', dataValue: 'provisorium' },
        ],
    },
    krone_eingliederung: {
        questionKey: 'krone_eingliederung',
        name: 'Eingliederungsart dokumentieren',
        category: 'forensic',
        options: [
            { id: 'definitiv', label: 'Definitiv', dataValue: 'definitiv' },
            { id: 'provisorisch', label: 'Provisorisch', dataValue: 'provisorisch' },
        ],
    },
    bruecke_typ: {
        questionKey: 'bruecke_typ',
        name: 'Brueckentyp dokumentieren',
        category: 'forensic',
        options: [
            { id: 'definitiv', label: 'Definitive Bruecke', dataValue: 'definitiv' },
            { id: 'provisorisch', label: 'Provisorische Bruecke', dataValue: 'provisorisch' },
        ],
    },
    bruecke_phase: {
        questionKey: 'bruecke_phase',
        name: 'Leistungsphase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'eingliederung', label: 'Eingliederung', dataValue: 'eingliederung' },
            { id: 'kontrolle', label: 'Kontrolle/Nachjustierung', dataValue: 'kontrolle' },
        ],
    },
    teilkrone_art: {
        questionKey: 'teilkrone_art',
        name: 'Teilkronenart dokumentieren',
        category: 'forensic',
        options: [
            { id: 'teilkrone', label: 'Teilkronenversorgung', dataValue: 'teilkrone' },
            { id: 'provisorium', label: 'Provisorische Teilkrone', dataValue: 'provisorium' },
        ],
    },
    teilkrone_eingliederung: {
        questionKey: 'teilkrone_eingliederung',
        name: 'Eingliederungsart dokumentieren',
        category: 'forensic',
        options: [
            { id: 'definitiv', label: 'Definitiv', dataValue: 'definitiv' },
            { id: 'provisorisch', label: 'Provisorisch', dataValue: 'provisorisch' },
        ],
    },
    wsr_zugang: {
        questionKey: 'wsr_zugang',
        name: 'WSR-Zugang dokumentieren',
        category: 'forensic',
        options: [
            { id: 'trepaniert', label: 'Trepaniert / am eroeffneten Zahn', dataValue: 'trepaniert' },
            { id: 'osteotomie', label: 'Durch Osteotomie', dataValue: 'osteotomie' },
        ],
    },
    wsr_lokalisation: {
        questionKey: 'wsr_lokalisation',
        name: 'WSR-Lokalisation dokumentieren',
        category: 'forensic',
        options: [
            { id: 'front_praemolar', label: 'Frontzahn/Praemolar', dataValue: 'front_praemolar' },
            { id: 'molar', label: 'Molar', dataValue: 'molar' },
        ],
    },
    trauma_art: {
        questionKey: 'trauma_art',
        name: 'Traumaart dokumentieren',
        category: 'forensic',
        options: [
            { id: 'luxation', label: 'Luxation', dataValue: 'luxation' },
            { id: 'fraktur', label: 'Kronen-/Wurzelfraktur', dataValue: 'fraktur' },
            { id: 'avulsion', label: 'Avulsion', dataValue: 'avulsion' },
        ],
    },
    trauma_schienung: {
        questionKey: 'trauma_schienung',
        name: 'Semipermanente Schienung dokumentieren',
        category: 'forensic',
        options: [
            { id: 'ja', label: 'Ja', dataValue: 'ja' },
            { id: 'nein', label: 'Nein', dataValue: 'nein' },
        ],
    },
    trauma_kontrolle: {
        questionKey: 'trauma_kontrolle',
        name: 'Verlaufskontrolle dokumentieren',
        category: 'forensic',
        options: [
            { id: 'ja', label: 'Ja', dataValue: 'ja' },
            { id: 'nein', label: 'Nein', dataValue: 'nein' },
        ],
    },
    implant_phase: {
        questionKey: 'implant_phase',
        name: 'Implantatphase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'insertion', label: 'Implantatinsertion', dataValue: 'insertion' },
            { id: 'freilegung', label: 'Implantatfreilegung', dataValue: 'freilegung' },
        ],
    },
    implant_nachsorge: {
        questionKey: 'implant_nachsorge',
        name: 'Postoperative Nachsorge dokumentieren',
        category: 'forensic',
        options: [
            { id: 'ja', label: 'Ja', dataValue: 'ja' },
            { id: 'nein', label: 'Nein', dataValue: 'nein' },
        ],
    },
    schiene_typ: {
        questionKey: 'schiene_typ',
        name: 'Schienentyp dokumentieren',
        category: 'forensic',
        options: [
            { id: 'okklusionsschiene', label: 'Okklusionsschiene', dataValue: 'okklusionsschiene' },
            { id: 'protrusionsschiene', label: 'Protrusionsschiene', dataValue: 'protrusionsschiene' },
        ],
    },
    schiene_phase: {
        questionKey: 'schiene_phase',
        name: 'Leistungsphase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'eingliederung', label: 'Eingliederung', dataValue: 'eingliederung' },
            { id: 'kontrolle', label: 'Kontrolle/Nachadjustierung', dataValue: 'kontrolle' },
        ],
    },
    teilprothese_typ: {
        questionKey: 'teilprothese_typ',
        name: 'Teilprothesentyp dokumentieren',
        category: 'forensic',
        options: [
            { id: 'interim', label: 'Interimsteilprothese', dataValue: 'interim' },
            { id: 'modellguss', label: 'Modellgussprothese', dataValue: 'modellguss' },
        ],
    },
    teilprothese_phase: {
        questionKey: 'teilprothese_phase',
        name: 'Leistungsphase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'eingliederung', label: 'Eingliederung', dataValue: 'eingliederung' },
            { id: 'kontrolle', label: 'Kontrolle/Nachjustierung', dataValue: 'kontrolle' },
        ],
    },
    totalprothese_typ: {
        questionKey: 'totalprothese_typ',
        name: 'Totalprothesentyp dokumentieren',
        category: 'forensic',
        options: [
            { id: 'konventionell', label: 'Konventionelle Totalprothese', dataValue: 'konventionell' },
            { id: 'immediat', label: 'Immediat-Totalprothese', dataValue: 'immediat' },
        ],
    },
    totalprothese_phase: {
        questionKey: 'totalprothese_phase',
        name: 'Leistungsphase dokumentieren',
        category: 'forensic',
        options: [
            { id: 'eingliederung', label: 'Eingliederung', dataValue: 'eingliederung' },
            { id: 'kontrolle', label: 'Kontrolle/Nachjustierung', dataValue: 'kontrolle' },
        ],
    },
    wf_technique: {
        questionKey: 'wf_technique',
        name: 'Welche Wurzelfuelltechnik wurde verwendet?',
        category: 'medical',
        options: [
            { id: 'warm', label: 'Warm vertikal', dataValue: 'warm' },
            { id: 'kalt', label: 'Kalt lateral', dataValue: 'kalt' },
            { id: 'einzel', label: 'Einzelstift', dataValue: 'einzel' },
        ],
    },
    irrigation: {
        questionKey: 'irrigation',
        name: 'Welche Spuelloesungen wurden verwendet?',
        category: 'medical',
        options: [
            { id: 'naocl_edta', label: 'NaOCl + EDTA', dataValue: 'naocl_edta' },
            { id: 'naocl', label: 'NaOCl', dataValue: 'naocl' },
            { id: 'edta', label: 'EDTA', dataValue: 'edta' },
            { id: 'chx', label: 'CHX', dataValue: 'chx' },
            { id: 'keine', label: 'Keine', dataValue: 'none' },
        ],
    },
    medication: {
        questionKey: 'medication',
        name: 'Welche medikamentoese Einlage wurde verwendet?',
        category: 'medical',
    },
    canal_count: {
        questionKey: 'canal_count',
        name: 'Wie viele Kanaele wurden behandelt?',
        category: 'medical',
    },
};

function findAskbackDefinition(questionKey: string): AskbackDefinition | undefined {
    const fromKb = medicalKbV10.askbacks.find(a => a.questionKey === questionKey) as AskbackDefinition | undefined;
    return fromKb ?? fallbackDefinitions[questionKey];
}

function mapCategory(category?: string): DynamicQuestion['category'] {
    const normalized = String(category ?? '').toLowerCase();
    if (normalized === 'billing' || normalized === 'mkv') return 'mkv';
    if (normalized === 'forensic') return 'forensic';
    if (normalized === 'upsell') return 'upsell';
    if (normalized === 'rule') return 'rule';
    return 'medical';
}

function buildFallbackQuestion(
    askbackId: string,
    questionKey: string,
    medicalSeverity: 'hard' | 'soft'
): DynamicQuestion {
    return {
        id: askbackId,
        questionKey,
        category: 'medical',
        question: questionKey,
        type: 'text',
        medicalSeverity,
        regressRisk: medicalSeverity === 'hard',
    };
}

function buildQuestionFromDefinition(
    askbackId: string,
    def: AskbackDefinition,
    medicalSeverity: 'hard' | 'soft'
): DynamicQuestion {
    const options = def.options?.map(opt => ({
        id: opt.id,
        label: opt.label,
        dataValue: opt.dataValue,
    }));

    return {
        id: askbackId,
        questionKey: def.questionKey,
        category: mapCategory(def.category),
        question: def.name,
        type: options && options.length > 0 ? 'single' : 'text',
        options,
        dataField: def.questionKey,
        medicalSeverity,
        regressRisk: medicalSeverity === 'hard' || def.required === true,
    };
}

export function buildQuestionsFromAskbacks(params: {
    required: string[];
    optional?: string[];
}): DynamicQuestion[] {
    const questions: DynamicQuestion[] = [];
    const seen = new Set<string>();

    const pushQuestion = (askbackId: string, medicalSeverity: 'hard' | 'soft') => {
        if (!askbackId) return;
        if (seen.has(askbackId)) return;
        seen.add(askbackId);

        const questionKey = normalizeAskbackId(askbackId);
        const def = findAskbackDefinition(questionKey);

        if (!def) {
            questions.push(buildFallbackQuestion(askbackId, questionKey, medicalSeverity));
            return;
        }

        questions.push(buildQuestionFromDefinition(askbackId, def, medicalSeverity));
    };

    for (const id of params.required ?? []) {
        pushQuestion(id, 'hard');
    }

    for (const id of params.optional ?? []) {
        if (!seen.has(id)) {
            pushQuestion(id, 'soft');
        }
    }

    return questions;
}
