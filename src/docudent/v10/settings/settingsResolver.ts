/**
 * Settings Resolver - map settings to askback answers with provenance rules.
 *
 * Rules:
 * - Never override facts that already have explicit values (dictation wins).
 * - Critical askbacks cannot be auto-filled or skipped.
 * - Skippable askbacks may be auto-filled if settings provide value.
 */

import type { SettingsInput, ResolvedSettings } from './settingsTypes';
import type { TreatmentFacts } from '../facts';
import type { AskbackPolicyV1, SettingsSchemaV1 } from '../packs/types';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';
import {
    getPracticeDefaultAnestheticAgentId,
    getPracticeDefaultIsolation,
    getUserDefaultAnestheticAgentId,
    getUserDefaultCappingMaterial,
    getUserDefaultIsolation,
    getUserDefaultLAType,
    getUserDefaultLATypeUkPosterior,
} from './medicalDefaults';

function normalizeAskbackKey(id: string): string {
    return normalizeAskbackId(id);
}

function isCriticalAskback(askbackId: string, policy?: AskbackPolicyV1): boolean {
    if (!policy?.criticalAskbacks?.length) return false;
    const normalized = normalizeAskbackKey(askbackId);
    const critical = new Set(policy.criticalAskbacks.map(normalizeAskbackKey));
    return critical.has(normalized);
}

function isSkippableAskback(askbackId: string, policy?: AskbackPolicyV1): boolean {
    if (!policy?.skippableAskbacks?.length) return true;
    const normalized = normalizeAskbackKey(askbackId);
    const skippable = new Set(policy.skippableAskbacks.map(normalizeAskbackKey));
    return skippable.has(normalized);
}

export function isFactKnownForAskback(askbackId: string, facts: TreatmentFacts): boolean {
    const key = normalizeAskbackKey(askbackId);
    switch (key) {
        case 'la_type':
            return facts.anesthesia !== undefined && facts.anesthesia !== 'unknown';
        case 'vitality':
            return facts.vitality !== undefined && facts.vitality !== 'unknown';
        case 'percussion':
            return facts.percussion !== undefined && facts.percussion !== 'unknown';
        case 'isolation':
            return (
                typeof facts.kofferdamUsed === 'boolean'
                || facts.isolationMentioned === 'rubberDam'
                || facts.isolationMentioned === 'relative'
            );
        case 'radiology_indication':
            return typeof (facts.radiology as { indication?: string } | undefined)?.indication === 'string'
                && ((facts.radiology as { indication?: string } | undefined)?.indication?.trim().length ?? 0) > 0;
        case 'radiology_type':
            return typeof (facts.radiology as { type?: string } | undefined)?.type === 'string'
                && ((facts.radiology as { type?: string } | undefined)?.type?.trim().length ?? 0) > 0;
        case 'radiology_timing':
            return typeof (facts.radiology as { timing?: string } | undefined)?.timing === 'string'
                && ((facts.radiology as { timing?: string } | undefined)?.timing?.trim().length ?? 0) > 0;
        case 'radiology_findings':
            return typeof (facts.radiology as { findings?: string } | undefined)?.findings === 'string'
                && ((facts.radiology as { findings?: string } | undefined)?.findings?.trim().length ?? 0) > 0;
        case 'ueberkappung':
            return facts.capping?.performed !== undefined && facts.capping?.performed !== 'unknown';
        case 'ueberkappung_material':
            return Boolean(facts.capping?.material);
        case 'pulpaschutz':
            return facts.capping?.performed !== undefined && facts.capping?.performed !== 'unknown';
        case 'fissuren_indikation':
            return Boolean((facts.fissurenversiegelung as { indication?: string } | undefined)?.indication);
        case 'fissuren_material':
            return Boolean((facts.fissurenversiegelung as { material?: string } | undefined)?.material);
        case 'crown_prep_preparation':
            return typeof (facts.crownPrep as { preparation?: boolean } | undefined)?.preparation === 'boolean';
        case 'crown_prep_impression':
            return typeof (facts.crownPrep as { impression?: boolean } | undefined)?.impression === 'boolean';
        case 'crown_prep_provisional':
            return typeof (facts.crownPrep as { provisional?: boolean } | undefined)?.provisional === 'boolean';
        case 'wl_method':
            return Boolean(facts.endo?.workingLengthMethod);
        case 'wf_technique':
            return Boolean(facts.endo?.wfTechnique);
        case 'irrigation':
            return Array.isArray(facts.endo?.irrigationSolutions)
                && (facts.endo?.irrigationSolutions?.length ?? 0) > 0;
        case 'layering':
            return facts.layeringMentioned !== undefined && facts.layeringMentioned !== 'unknown';
        case 'adhesive':
        case 'adhesive_technique':
            return facts.adhesiveTechnique !== undefined;
        case 'material':
            return (
                facts.material !== undefined
                && facts.material !== null
                && facts.material !== 'unknown'
            );
        case 'kofferdam':
            return typeof facts.kofferdamUsed === 'boolean'
                || facts.isolationMentioned === 'rubberDam'
                || facts.isolationMentioned === 'relative';
        case 'medication':
            return typeof facts.endo?.medication === 'string';
        case 'canal_count':
            return typeof facts.endo?.canalCount === 'number';
        case 'hemostasis':
            return typeof facts.bleeding?.hemostasisPerformed === 'string'
                && facts.bleeding?.hemostasisPerformed !== 'unknown';
        case 'sensitivity_followup':
            return typeof facts.sensitivity?.desensitizerApplied === 'string'
                && facts.sensitivity?.desensitizerApplied !== 'unknown';
        case 'wound_care':
            return typeof (facts as Record<string, unknown>).woundCare === 'boolean';
        case 'untersuchung_anlass':
            return Boolean((facts.untersuchung as { reason?: string } | undefined)?.reason);
        case 'untersuchung_befunde':
            return Boolean((facts.untersuchung as { findings?: string } | undefined)?.findings);
        case 'untersuchung_beurteilung':
            return Boolean((facts.untersuchung as { assessment?: string } | undefined)?.assessment);
        case 'pzr_zahnstein':
            return typeof (facts.pzr as { zahnsteinEntfernung?: boolean } | undefined)?.zahnsteinEntfernung === 'boolean';
        case 'pzr_fluoridation':
            return typeof (facts.pzr as { fluoridation?: boolean } | undefined)?.fluoridation === 'boolean';
        case 'parodontologie_phase':
            return Boolean((facts.parodontologie as { phase?: string } | undefined)?.phase);
        case 'parodontologie_upt_grad':
            return Boolean((facts.parodontologie as { uptGrade?: string } | undefined)?.uptGrade);
        case 'upt_grad':
            return Boolean((facts.upt as { grade?: string } | undefined)?.grade);
        case 'upt_intervall':
            return Boolean((facts.upt as { interval?: string } | undefined)?.interval);
        case 'krone_art':
            return Boolean((facts.krone as { type?: string } | undefined)?.type);
        case 'krone_eingliederung':
            return Boolean((facts.krone as { placement?: string } | undefined)?.placement);
        case 'teilkrone_art':
            return Boolean((facts.teilkrone as { type?: string } | undefined)?.type);
        case 'teilkrone_eingliederung':
            return Boolean((facts.teilkrone as { placement?: string } | undefined)?.placement);
        case 'bruecke_typ':
            return Boolean((facts.bruecke as { type?: string } | undefined)?.type);
        case 'bruecke_phase':
            return Boolean((facts.bruecke as { phase?: string } | undefined)?.phase);
        case 'trauma_art':
            return Boolean((facts.trauma as { art?: string } | undefined)?.art);
        case 'trauma_schienung':
            return Boolean((facts.trauma as { schienung?: string } | undefined)?.schienung);
        case 'trauma_kontrolle':
            return Boolean((facts.trauma as { kontrolle?: string } | undefined)?.kontrolle);
        case 'implant_phase':
            return Boolean((facts.implant as { phase?: string } | undefined)?.phase);
        case 'implant_nachsorge':
            return Boolean((facts.implant as { nachsorge?: string } | undefined)?.nachsorge);
        case 'schiene_typ':
            return Boolean((facts.schiene as { type?: string } | undefined)?.type);
        case 'schiene_phase':
            return Boolean((facts.schiene as { phase?: string } | undefined)?.phase);
        case 'teilprothese_typ':
            return Boolean((facts.teilprothese as { type?: string } | undefined)?.type);
        case 'teilprothese_phase':
            return Boolean((facts.teilprothese as { phase?: string } | undefined)?.phase);
        case 'totalprothese_typ':
            return Boolean((facts.totalprothese as { type?: string } | undefined)?.type);
        case 'totalprothese_phase':
            return Boolean((facts.totalprothese as { phase?: string } | undefined)?.phase);
        case 'wsr_zugang':
            return Boolean((facts.wsr as { zugang?: string } | undefined)?.zugang);
        case 'wsr_lokalisation':
            return Boolean((facts.wsr as { lokalisation?: string } | undefined)?.lokalisation);
        case 'mkv_justification':
            return typeof facts.mkvJustification === 'string' && facts.mkvJustification.length > 0;
        case 'mkv_confirmed':
            return (
                facts.nurKasse === true
                || facts.mehrkostenConfirmed === true
                || facts.mehrkostenMentioned === true
                || (typeof facts.mkvBetrag === 'number' && facts.mkvBetrag > 0)
            );
        default:
            return false;
    }
}

function normalizeSettingsValue(askbackId: string, raw: unknown): unknown | undefined {
    if (raw === undefined || raw === null) return undefined;
    const key = normalizeAskbackKey(askbackId);
    if (key === 'mkv_confirmed') {
        if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
        if (typeof raw === 'string') {
            const value = raw.toLowerCase();
            if (value.includes('yes') || value.includes('ja') || value.includes('on') || value.includes('true')) return 'yes';
            if (value.includes('no') || value.includes('nein') || value.includes('off') || value.includes('false')) return 'no';
        }
    }
    if (typeof raw !== 'string') return raw;
    const value = raw.toLowerCase();

    switch (key) {
        case 'la_type':
            if (value.includes('ila') || value.includes('intralig')) return 'ila';
            if (value.includes('infiltr')) return 'infiltr';
            if (value.includes('leitung')) return 'leitung';
            if (value.includes('none') || value.includes('keine')) return 'none';
            return raw;
        case 'isolation':
            if (value.includes('kofferdam')) return 'kofferdam';
            if (value.includes('watterollen') || value.includes('relative') || value.includes('relativ')) return 'relativ';
            if (value.includes('none') || value.includes('keine')) return 'none';
            return raw;
        case 'ueberkappung_material': {
            if (value.includes('caoh') || value.includes('ca(oh)') || value.includes('caoh2')) return 'Ca(OH)₂';
            if (value.includes('mta')) return 'MTA';
            if (value.includes('biodentin')) return 'Biodentine';
            return raw;
        }
        case 'ueberkappung':
        case 'pulpaschutz':
            if (value.includes('indirekt')) return 'indirekt';
            if (value.includes('direkt')) return 'direkt';
            if (value.includes('keine') || value.includes('none') || value.includes('no')) return 'keine';
            return raw;
        case 'wl_method':
            if (value.includes('elektr')) return 'elektrisch';
            if (value.includes('roentgen')) return 'roentgen';
            if (value.includes('both')) return 'elektrisch';
            return raw;
        case 'wf_technique':
            if (value.includes('kalt')) return 'kalt';
            if (value.includes('warm')) return 'warm';
            if (value.includes('einzel')) return 'einzel';
            return raw;
        case 'kofferdam':
            if (value.includes('kofferdam')) return 'yes';
            if (value.includes('relativ') || value.includes('relative') || value.includes('none') || value.includes('keine')) return 'no';
            if (value.includes('yes') || value.includes('ja')) return 'yes';
            if (value.includes('no') || value.includes('nein')) return 'no';
            return raw;
        case 'layering':
            if (value.includes('yes') || value.includes('ja') || value.includes('mehr')) return 'yes';
            if (value.includes('no') || value.includes('nein') || value.includes('bulk') || value.includes('einfach')) return 'no';
            return raw;
        case 'adhesive':
        case 'adhesive_technique':
            if (value.includes('yes') || value.includes('ja') || value.includes('adh')) return 'yes';
            if (value.includes('no') || value.includes('nein')) return 'no';
            return raw;
        case 'hemostasis':
        case 'sensitivity_followup':
            if (value.includes('yes') || value.includes('ja')) return 'yes';
            if (value.includes('no') || value.includes('nein')) return 'no';
            return raw;
        case 'wound_care':
            if (value.includes('yes') || value.includes('ja')) return 'yes';
            if (value.includes('no') || value.includes('nein')) return 'no';
            return raw;
        case 'pzr_zahnstein':
        case 'pzr_fluoridation':
            if (value.includes('yes') || value.includes('ja')) return 'yes';
            if (value.includes('no') || value.includes('nein')) return 'no';
            return raw;
        case 'crown_prep_preparation':
        case 'crown_prep_impression':
        case 'crown_prep_provisional':
            if (value.includes('yes') || value.includes('ja') || value.includes('true')) return true;
            if (value.includes('no') || value.includes('nein') || value.includes('false')) return false;
            return raw;
        case 'trauma_schienung':
        case 'trauma_kontrolle':
        case 'implant_nachsorge':
            if (value.includes('yes') || value.includes('ja')) return 'ja';
            if (value.includes('no') || value.includes('nein')) return 'nein';
            return raw;
        case 'material':
            if (value.includes('giz') || value.includes('glasionomer')) return 'giz';
            if (value.includes('comp_') || value.includes('komposit') || value.includes('composite') || value.includes('bulk')) return 'komposit';
            return raw;
        case 'medication':
            if (value.includes('caoh')) return 'Ca(OH)2';
            if (value.includes('none') || value.includes('keine')) return 'none';
            return raw;
        case 'mkv_justification':
            if (value.includes('mehrschicht')) return 'mehrschicht';
            if (value.includes('adhesiv')) return 'adhesiv';
            if (value.includes('aesthet') || value.includes('ästhet')) return 'aesthetik';
            if (value.includes('keine') || value.includes('nur')) return 'keine';
            return raw;
        case 'canal_count': {
            const parsed = parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : raw;
        }
        case 'mkv_confirmed':
            if (value.includes('yes') || value.includes('ja') || value.includes('on')) return 'yes';
            if (value.includes('no') || value.includes('nein') || value.includes('off')) return 'no';
            return raw;
        default:
            return raw;
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function setNestedFact(target: Record<string, unknown>, path: string[], value: unknown) {
    let cursor = target;
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) {
            cursor[key] = value;
            return;
        }
        const next = cursor[key];
        if (!isPlainObject(next)) {
            cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
    }
}

function applySettingsFactPatch(
    target: Record<string, unknown>,
    askbackId: string,
    normalizedValue: unknown
) {
    if (normalizedValue === undefined || normalizedValue === null) return;
    const key = normalizeAskbackKey(askbackId);
    const valueStr = typeof normalizedValue === 'string' ? normalizedValue.toLowerCase() : '';

    switch (key) {
        case 'la_type': {
            let anesthesia: 'infiltr' | 'leitung' | 'ila' | 'none' | undefined;
            if (valueStr.includes('ila') || valueStr.includes('intralig')) anesthesia = 'ila';
            else if (valueStr.includes('infiltr')) anesthesia = 'infiltr';
            else if (valueStr.includes('leitung')) anesthesia = 'leitung';
            else if (valueStr.includes('none') || valueStr.includes('keine')) anesthesia = 'none';
            if (!anesthesia) return;
            setNestedFact(target, ['anesthesia'], anesthesia);
            if (anesthesia === 'infiltr' || anesthesia === 'leitung' || anesthesia === 'ila') {
                setNestedFact(
                    target,
                    ['fuellung', 'anesthesiaType'],
                    anesthesia === 'infiltr' ? 'infiltration' : anesthesia === 'leitung' ? 'leitung' : 'ila'
                );
            }
            return;
        }
        case 'isolation': {
            if (valueStr.includes('kofferdam')) {
                setNestedFact(target, ['kofferdamUsed'], true);
                setNestedFact(target, ['kofferdamMentioned'], true);
                setNestedFact(target, ['isolationMentioned'], 'rubberDam');
            } else if (valueStr.includes('relativ') || valueStr.includes('watterollen')) {
                setNestedFact(target, ['kofferdamUsed'], false);
                setNestedFact(target, ['kofferdamMentioned'], true);
                setNestedFact(target, ['isolationMentioned'], 'relative');
            } else if (valueStr.includes('none') || valueStr.includes('keine')) {
                setNestedFact(target, ['kofferdamUsed'], false);
                setNestedFact(target, ['kofferdamMentioned'], false);
            }
            return;
        }
        case 'ueberkappung_material': {
            setNestedFact(target, ['capping', 'material'], normalizedValue);
            return;
        }
        case 'ueberkappung': {
            if (valueStr.includes('indirekt')) {
                setNestedFact(target, ['capping', 'performed'], 'yes');
                setNestedFact(target, ['pulpaOpened'], false);
            } else if (valueStr.includes('direkt') && !valueStr.includes('indirekt')) {
                setNestedFact(target, ['capping', 'performed'], 'yes');
                setNestedFact(target, ['pulpaOpened'], true);
            } else if (valueStr.includes('keine') || valueStr.includes('no')) {
                setNestedFact(target, ['capping', 'performed'], 'no');
            }
            return;
        }
        case 'wl_method': {
            if (valueStr.includes('elektr')) {
                setNestedFact(target, ['endo', 'workingLengthMethod'], 'electronic');
            } else if (valueStr.includes('roentgen')) {
                setNestedFact(target, ['endo', 'workingLengthMethod'], 'xray');
            }
            return;
        }
        case 'wf_technique': {
            if (valueStr.includes('warm')) {
                setNestedFact(target, ['endo', 'wfTechnique'], 'warm');
            } else if (valueStr.includes('einzel')) {
                setNestedFact(target, ['endo', 'wfTechnique'], 'einzel');
            } else if (valueStr.includes('kalt') || valueStr.includes('lateral')) {
                setNestedFact(target, ['endo', 'wfTechnique'], 'kalt');
            }
            return;
        }
        case 'irrigation': {
            const solutions: string[] = [];
            if (valueStr.includes('naocl')) solutions.push('NaOCl');
            if (valueStr.includes('edta')) solutions.push('EDTA');
            if (solutions.length > 0) {
                setNestedFact(target, ['endo', 'irrigationSolutions'], solutions);
            } else if (valueStr.includes('none') || valueStr.includes('keine')) {
                setNestedFact(target, ['endo', 'irrigationSolutions'], []);
            }
            return;
        }
        case 'layering': {
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('mehr')) {
                setNestedFact(target, ['layeringMentioned'], 'yes');
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('bulk') || valueStr.includes('einfach')) {
                setNestedFact(target, ['layeringMentioned'], 'no');
            }
            return;
        }
        case 'adhesive':
        case 'adhesive_technique': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['adhesiveTechnique'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['adhesiveTechnique'], false);
            }
            return;
        }
        case 'kofferdam': {
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('kofferdam')) {
                setNestedFact(target, ['kofferdamUsed'], true);
                setNestedFact(target, ['kofferdamMentioned'], true);
                setNestedFact(target, ['isolationMentioned'], 'rubberDam');
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('none')) {
                setNestedFact(target, ['kofferdamUsed'], false);
                setNestedFact(target, ['kofferdamMentioned'], false);
            }
            return;
        }
        case 'material': {
            if (!valueStr) return;
            setNestedFact(target, ['material'], normalizedValue);
            setNestedFact(target, ['materialMentioned'], normalizedValue);
            return;
        }
        case 'hemostasis': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['bleeding', 'hemostasisPerformed'], 'yes');
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['bleeding', 'hemostasisPerformed'], 'no');
            }
            return;
        }
        case 'sensitivity_followup': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['sensitivity', 'desensitizerApplied'], 'yes');
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['sensitivity', 'desensitizerApplied'], 'no');
            }
            return;
        }
        case 'wound_care': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['woundCare'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['woundCare'], false);
            }
            return;
        }
        case 'radiology_indication': {
            setNestedFact(target, ['radiology', 'indication'], normalizedValue);
            return;
        }
        case 'radiology_type': {
            setNestedFact(target, ['radiology', 'type'], normalizedValue);
            return;
        }
        case 'radiology_timing': {
            setNestedFact(target, ['radiology', 'timing'], normalizedValue);
            return;
        }
        case 'radiology_findings': {
            setNestedFact(target, ['radiology', 'findings'], normalizedValue);
            return;
        }
        case 'untersuchung_anlass': {
            setNestedFact(target, ['untersuchung', 'reason'], normalizedValue);
            return;
        }
        case 'untersuchung_befunde': {
            setNestedFact(target, ['untersuchung', 'findings'], normalizedValue);
            return;
        }
        case 'untersuchung_beurteilung': {
            setNestedFact(target, ['untersuchung', 'assessment'], normalizedValue);
            return;
        }
        case 'pzr_zahnstein': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['pzr', 'zahnsteinEntfernung'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['pzr', 'zahnsteinEntfernung'], false);
            }
            return;
        }
        case 'pzr_fluoridation': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['pzr', 'fluoridation'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['pzr', 'fluoridation'], false);
            }
            return;
        }
        case 'parodontologie_phase': {
            setNestedFact(target, ['parodontologie', 'phase'], normalizedValue);
            return;
        }
        case 'parodontologie_upt_grad': {
            setNestedFact(target, ['parodontologie', 'uptGrade'], normalizedValue);
            return;
        }
        case 'upt_grad': {
            setNestedFact(target, ['upt', 'grade'], normalizedValue);
            return;
        }
        case 'upt_intervall': {
            setNestedFact(target, ['upt', 'interval'], normalizedValue);
            return;
        }
        case 'krone_art': {
            setNestedFact(target, ['krone', 'type'], normalizedValue);
            return;
        }
        case 'krone_eingliederung': {
            setNestedFact(target, ['krone', 'placement'], normalizedValue);
            return;
        }
        case 'teilkrone_art': {
            setNestedFact(target, ['teilkrone', 'type'], normalizedValue);
            return;
        }
        case 'teilkrone_eingliederung': {
            setNestedFact(target, ['teilkrone', 'placement'], normalizedValue);
            return;
        }
        case 'bruecke_typ': {
            setNestedFact(target, ['bruecke', 'type'], normalizedValue);
            return;
        }
        case 'bruecke_phase': {
            setNestedFact(target, ['bruecke', 'phase'], normalizedValue);
            return;
        }
        case 'fissuren_indikation': {
            setNestedFact(target, ['fissurenversiegelung', 'indication'], normalizedValue);
            return;
        }
        case 'fissuren_material': {
            setNestedFact(target, ['fissurenversiegelung', 'material'], normalizedValue);
            return;
        }
        case 'crown_prep_preparation': {
            if (typeof normalizedValue === 'boolean') {
                setNestedFact(target, ['crownPrep', 'preparation'], normalizedValue);
                return;
            }
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('true')) {
                setNestedFact(target, ['crownPrep', 'preparation'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('false')) {
                setNestedFact(target, ['crownPrep', 'preparation'], false);
            }
            return;
        }
        case 'crown_prep_impression': {
            if (typeof normalizedValue === 'boolean') {
                setNestedFact(target, ['crownPrep', 'impression'], normalizedValue);
                return;
            }
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('true')) {
                setNestedFact(target, ['crownPrep', 'impression'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('false')) {
                setNestedFact(target, ['crownPrep', 'impression'], false);
            }
            return;
        }
        case 'crown_prep_provisional': {
            if (typeof normalizedValue === 'boolean') {
                setNestedFact(target, ['crownPrep', 'provisional'], normalizedValue);
                return;
            }
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('true')) {
                setNestedFact(target, ['crownPrep', 'provisional'], true);
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('false')) {
                setNestedFact(target, ['crownPrep', 'provisional'], false);
            }
            return;
        }
        case 'trauma_art': {
            setNestedFact(target, ['trauma', 'art'], normalizedValue);
            return;
        }
        case 'trauma_schienung': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['trauma', 'schienung'], 'ja');
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['trauma', 'schienung'], 'nein');
            } else {
                setNestedFact(target, ['trauma', 'schienung'], normalizedValue);
            }
            return;
        }
        case 'trauma_kontrolle': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['trauma', 'kontrolle'], 'ja');
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['trauma', 'kontrolle'], 'nein');
            } else {
                setNestedFact(target, ['trauma', 'kontrolle'], normalizedValue);
            }
            return;
        }
        case 'implant_phase': {
            setNestedFact(target, ['implant', 'phase'], normalizedValue);
            return;
        }
        case 'implant_nachsorge': {
            if (valueStr.includes('yes') || valueStr.includes('ja')) {
                setNestedFact(target, ['implant', 'nachsorge'], 'ja');
            } else if (valueStr.includes('no') || valueStr.includes('nein')) {
                setNestedFact(target, ['implant', 'nachsorge'], 'nein');
            } else {
                setNestedFact(target, ['implant', 'nachsorge'], normalizedValue);
            }
            return;
        }
        case 'schiene_typ': {
            setNestedFact(target, ['schiene', 'type'], normalizedValue);
            return;
        }
        case 'schiene_phase': {
            setNestedFact(target, ['schiene', 'phase'], normalizedValue);
            return;
        }
        case 'teilprothese_typ': {
            setNestedFact(target, ['teilprothese', 'type'], normalizedValue);
            return;
        }
        case 'teilprothese_phase': {
            setNestedFact(target, ['teilprothese', 'phase'], normalizedValue);
            return;
        }
        case 'totalprothese_typ': {
            setNestedFact(target, ['totalprothese', 'type'], normalizedValue);
            return;
        }
        case 'totalprothese_phase': {
            setNestedFact(target, ['totalprothese', 'phase'], normalizedValue);
            return;
        }
        case 'wsr_zugang': {
            setNestedFact(target, ['wsr', 'zugang'], normalizedValue);
            return;
        }
        case 'wsr_lokalisation': {
            setNestedFact(target, ['wsr', 'lokalisation'], normalizedValue);
            return;
        }
        case 'medication': {
            if (valueStr.includes('caoh')) {
                setNestedFact(target, ['endo', 'medication'], 'Ca(OH)2');
            } else if (valueStr.includes('none') || valueStr.includes('keine')) {
                setNestedFact(target, ['endo', 'medication'], 'none');
            } else {
                setNestedFact(target, ['endo', 'medication'], normalizedValue);
            }
            return;
        }
        case 'pulpaschutz': {
            if (valueStr.includes('direkt')) {
                setNestedFact(target, ['capping', 'performed'], 'yes');
                setNestedFact(target, ['pulpaOpened'], true);
            } else if (valueStr.includes('indirekt')) {
                setNestedFact(target, ['capping', 'performed'], 'yes');
                setNestedFact(target, ['pulpaOpened'], false);
            } else if (valueStr.includes('keine') || valueStr.includes('no')) {
                setNestedFact(target, ['capping', 'performed'], 'no');
            }
            return;
        }
        case 'mkv_justification': {
            setNestedFact(target, ['mkvJustification'], normalizedValue);
            if (valueStr.includes('keine') || valueStr.includes('nur')) {
                setNestedFact(target, ['nurKasse'], true);
                setNestedFact(target, ['mehrkostenConfirmed'], false);
            } else if (valueStr.length > 0) {
                setNestedFact(target, ['mehrkostenConfirmed'], true);
                if (valueStr.includes('mehrschicht') || valueStr.includes('schicht')) {
                    setNestedFact(target, ['layeringMentioned'], 'yes');
                    setNestedFact(target, ['adhesiveTechnique'], true);
                }
                if (valueStr.includes('adhesiv') || valueStr.includes('adhäsiv')) {
                    setNestedFact(target, ['adhesiveTechnique'], true);
                }
            }
            return;
        }
        case 'canal_count': {
            const parsed = typeof normalizedValue === 'number'
                ? normalizedValue
                : Number.parseInt(String(normalizedValue), 10);
            if (Number.isFinite(parsed)) {
                setNestedFact(target, ['endo', 'canalCount'], parsed);
            }
            return;
        }
        case 'mkv_confirmed': {
            if (typeof normalizedValue === 'boolean') {
                setNestedFact(target, ['mkvPresent'], normalizedValue);
                setNestedFact(target, ['mehrkostenConfirmed'], normalizedValue === true);
                if (normalizedValue === false) {
                    setNestedFact(target, ['nurKasse'], true);
                } else if (normalizedValue === true) {
                    setNestedFact(target, ['nurKasse'], false);
                }
                return;
            }
            if (valueStr.includes('yes') || valueStr.includes('ja') || valueStr.includes('on')) {
                setNestedFact(target, ['mkvPresent'], true);
                setNestedFact(target, ['mehrkostenConfirmed'], true);
                setNestedFact(target, ['nurKasse'], false);
            } else if (valueStr.includes('no') || valueStr.includes('nein') || valueStr.includes('off')) {
                setNestedFact(target, ['mkvPresent'], false);
                setNestedFact(target, ['mehrkostenConfirmed'], false);
                setNestedFact(target, ['nurKasse'], true);
            }
            return;
        }
        default:
            return;
    }
}

function collectMappings(schema?: SettingsSchemaV1): Array<{ key: string; askbackId: string; scope: 'practice' | 'user' }> {
    if (!schema) return [];
    const mappings: Array<{ key: string; askbackId: string; scope: 'practice' | 'user' }> = [];

    for (const entry of schema.practice) {
        if (entry.mapsToAskbackId) {
            mappings.push({ key: entry.key, askbackId: entry.mapsToAskbackId, scope: 'practice' });
        }
    }
    for (const entry of schema.user) {
        if (entry.mapsToAskbackId) {
            mappings.push({ key: entry.key, askbackId: entry.mapsToAskbackId, scope: 'user' });
        }
    }

    return mappings;
}

export function resolveSettings(params: {
    settings?: SettingsInput;
    facts: TreatmentFacts;
    tooth?: string;
    askbackPolicy?: AskbackPolicyV1;
    settingsSchema?: SettingsSchemaV1;
}): ResolvedSettings {
    const { settings, facts, askbackPolicy, settingsSchema, tooth } = params;
    const answers = new Map<string, unknown>();
    const skippedAskbacks = new Set<string>();
    const appliedAskbacks = new Set<string>();
    const resolvedFacts: Record<string, unknown> = {};
    const factSources: Record<string, 'practice' | 'user'> = {};

    if (!settings) {
        return {
            practiceVersion: undefined,
            userVersion: undefined,
            answers,
            skippedAskbacks,
            appliedAskbacks,
            facts: resolvedFacts,
            factsSource: factSources,
        };
    }

    const skipList = settings.user?.skipAskbacks ?? [];
    for (const askbackId of skipList) {
        if (!isCriticalAskback(askbackId, askbackPolicy)) {
            skippedAskbacks.add(askbackId);
        }
    }

    const isUkPosteriorMolar = (value: string | undefined): boolean => {
        if (!value) return false;
        const n = parseInt(value, 10);
        if (!Number.isFinite(n)) return false;
        return (n >= 36 && n <= 38) || (n >= 46 && n <= 48);
    };

    const mappings = collectMappings(settingsSchema);
    const getNestedValue = (obj: unknown, path: string): unknown => {
        if (!obj || typeof obj !== 'object') return undefined;
        if (!path.includes('.')) {
            return (obj as Record<string, unknown>)[path];
        }
        return path.split('.').reduce((acc, part) => {
            if (!isPlainObject(acc)) return undefined;
            return (acc as Record<string, unknown>)[part];
        }, obj as Record<string, unknown> | undefined);
    };

    for (const mapping of mappings) {
        const scopeSettings = mapping.scope === 'practice' ? settings.practice : settings.user;
        let rawValue = getNestedValue(scopeSettings, mapping.key);
        if (rawValue === undefined) {
            if (mapping.scope === 'practice') {
                if (mapping.key === 'defaultIsolation') rawValue = getPracticeDefaultIsolation(settings.practice);
                if (mapping.key === 'defaultAnestheticAgentId') rawValue = getPracticeDefaultAnestheticAgentId(settings.practice);
            } else {
                if (mapping.key === 'defaultLAType') rawValue = getUserDefaultLAType(settings.user);
                if (mapping.key === 'defaultLATypeUkPosterior') rawValue = getUserDefaultLATypeUkPosterior(settings.user);
                if (mapping.key === 'defaultIsolation') rawValue = getUserDefaultIsolation(settings.user);
                if (mapping.key === 'defaultCappingMaterial') rawValue = getUserDefaultCappingMaterial(settings.user);
                if (mapping.key === 'defaultAnestheticAgentId') rawValue = getUserDefaultAnestheticAgentId(settings.user);
            }
        }
        if (rawValue === undefined) continue;

        const askbackId = mapping.askbackId;
        if (isCriticalAskback(askbackId, askbackPolicy)) {
            continue;
        }
        if (!isSkippableAskback(askbackId, askbackPolicy)) {
            continue;
        }
        if (isFactKnownForAskback(askbackId, facts)) {
            continue;
        }

        const normalized = normalizeSettingsValue(askbackId, rawValue);
        if (normalized === undefined) continue;

        answers.set(askbackId, normalized);
        appliedAskbacks.add(askbackId);
        const factKey = normalizeAskbackKey(askbackId);
        factSources[factKey] = mapping.scope;
        applySettingsFactPatch(resolvedFacts, askbackId, normalized);
    }

    // Tooth-aware shortcut: allow a user override for UK posterior molars without forcing a schema explosion.
    // This only applies when dictation didn't already provide a known anesthesia type.
    const laAskbackId = 'medical_la_type';
    if (
        !isCriticalAskback(laAskbackId, askbackPolicy)
        && isSkippableAskback(laAskbackId, askbackPolicy)
        && !isFactKnownForAskback(laAskbackId, facts)
    ) {
        const user = settings.user;
        const override = isUkPosteriorMolar(tooth) ? getUserDefaultLATypeUkPosterior(user) : undefined;
        const fallback = getUserDefaultLAType(user);
        const desired = override ?? (!answers.has(laAskbackId) ? fallback : undefined);
        const normalized = normalizeSettingsValue(laAskbackId, desired);
        if (normalized !== undefined) {
            answers.set(laAskbackId, normalized);
            appliedAskbacks.add(laAskbackId);
            factSources['la_type'] = 'user';
            applySettingsFactPatch(resolvedFacts, laAskbackId, normalized);
        }
    }

    // Füllung-Material: wenn ein User- ODER Praxis-Default gesetzt ist, Askback auto-füllen
    const materialAskbackId = 'fuellung_material';
    if (
        !isCriticalAskback(materialAskbackId, askbackPolicy)
        && isSkippableAskback(materialAskbackId, askbackPolicy)
        && !isFactKnownForAskback(materialAskbackId, facts)
        && !answers.has(materialAskbackId)
    ) {
        const fuellungDefaults = settings.user?.treatments?.fuellung;
        const hasUserMaterialDefault = Boolean(
            fuellungDefaults?.defaultCompositeMaterialId
            ?? fuellungDefaults?.defaultBulkMaterialId
            ?? fuellungDefaults?.defaultFlowableMaterialId
        );
        const practiceMaterialDefault = settings.practice?.defaultMaterial;
        const rawMaterialValue = hasUserMaterialDefault
            ? (fuellungDefaults?.defaultCompositeMaterialId ?? 'komposit')
            : practiceMaterialDefault;
        const normalized = normalizeSettingsValue(materialAskbackId, rawMaterialValue);
        if (normalized !== undefined) {
            answers.set(materialAskbackId, normalized);
            appliedAskbacks.add(materialAskbackId);
            factSources['material'] = hasUserMaterialDefault ? 'user' : 'practice';
            applySettingsFactPatch(resolvedFacts, materialAskbackId, normalized);
        }
    }

    // Füllung-Flowable-Base: Settings-Default kann Flowable als Basis markieren
    const flowableBaseDefault = settings.user?.treatments?.fuellung?.defaultFlowableBase;
    if (flowableBaseDefault === true && facts.flowableMentioned !== true) {
        (resolvedFacts as Record<string, unknown>).flowableMentioned = true;
        factSources['flowable'] = 'user';
    }

    // Füllung-Matrix-System: Default dokumentieren, wenn approximal beteiligt
    const matrixDefault =
        settings.user?.treatments?.fuellung?.defaultMatrixSystem
        ?? settings.practice?.treatments?.fuellung?.defaultMatrixSystem;
    const hasApproximalSurface = Array.isArray(facts.surfaces)
        && facts.surfaces.some(s => s === 'm' || s === 'd');
    if (
        facts.treatmentId === 'fuellung'
        && matrixDefault
        && facts.matrixMentioned !== true
        && hasApproximalSurface
    ) {
        (resolvedFacts as Record<string, unknown>).matrixMentioned = true;
        factSources['matrix'] =
            settings.user?.treatments?.fuellung?.defaultMatrixSystem !== undefined
                ? 'user'
                : 'practice';
    }

    // Füllung-Keil/Kontaktpunkt: Defaults dokumentieren (approximal)
    const keilDefault =
        settings.user?.treatments?.fuellung?.defaultKeilUsed
        ?? settings.practice?.treatments?.fuellung?.defaultKeilUsed;
    if (
        facts.treatmentId === 'fuellung'
        && keilDefault === true
        && facts.keilMentioned !== true
        && hasApproximalSurface
    ) {
        (resolvedFacts as Record<string, unknown>).keilMentioned = true;
        factSources['keil'] =
            settings.user?.treatments?.fuellung?.defaultKeilUsed !== undefined
                ? 'user'
                : 'practice';
    }

    const kontaktpunktDefault =
        settings.user?.treatments?.fuellung?.defaultKontaktpunktCheck
        ?? settings.practice?.treatments?.fuellung?.defaultKontaktpunktCheck;
    if (
        facts.treatmentId === 'fuellung'
        && kontaktpunktDefault === true
        && facts.kontaktpunktMentioned !== true
        && hasApproximalSurface
    ) {
        (resolvedFacts as Record<string, unknown>).kontaktpunktMentioned = true;
        factSources['kontaktpunkt'] =
            settings.user?.treatments?.fuellung?.defaultKontaktpunktCheck !== undefined
                ? 'user'
                : 'practice';
    }

    // Endo-Defaults: Instrumentierung/Sealer nur als Facts (keine Chip-Logik)
    if (facts.treatmentId === 'endo') {
        const endoUser = settings.user?.treatments?.endo;
        const endoPractice = settings.practice?.treatments?.endo;
        const defaultInstr = endoUser?.defaultInstrumentationMode ?? endoPractice?.defaultInstrumentationMode;
        const endoFacts = facts.endo as Record<string, unknown> | undefined;
        const hasPreparationSignals = Boolean(
            endoFacts?.canalCount
            || endoFacts?.workingLengthMethod
            || (Array.isArray(endoFacts?.irrigationSolutions) && (endoFacts?.irrigationSolutions as unknown[]).length > 0)
            || endoFacts?.step === 'preparation'
            || endoFacts?.step === 'irrigation'
            || endoFacts?.step === 'obturation'
        );
        if (defaultInstr && endoFacts?.instrumentationMode === undefined && hasPreparationSignals) {
            (resolvedFacts as Record<string, unknown>).endo = {
                ...(resolvedFacts as Record<string, unknown>).endo,
                instrumentationMode: defaultInstr,
            };
            factSources['instrumentation_mode'] =
                endoUser?.defaultInstrumentationMode !== undefined ? 'user' : 'practice';
        }

        const defaultSealer = endoUser?.defaultSealer ?? endoPractice?.defaultSealer;
        const hasObturationSignals = Boolean(
            endoFacts?.wfTechnique
            || endoFacts?.obturationMentioned === true
            || endoFacts?.obturated === true
        );
        if (defaultSealer === true && endoFacts?.sealerMentioned !== true && hasObturationSignals) {
            (resolvedFacts as Record<string, unknown>).endo = {
                ...(resolvedFacts as Record<string, unknown>).endo,
                sealerMentioned: true,
            };
            factSources['sealer'] =
                endoUser?.defaultSealer !== undefined ? 'user' : 'practice';
        }
    }

    return {
        practiceVersion: settings.practice?.version,
        userVersion: settings.user?.version,
        answers,
        skippedAskbacks,
        appliedAskbacks,
        facts: resolvedFacts,
        factsSource: factSources,
    };
}
