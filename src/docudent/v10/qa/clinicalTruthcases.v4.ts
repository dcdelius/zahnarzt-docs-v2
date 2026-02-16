/**
 * M39: Clinical Truthcases v4
 * 
 * 35 new truthcases: Settings-reduced askbacks, manual overrides, 
 * multi-treatment with scoped negations, confusables.
 */

import type { ClinicalContractV2, ClinicalTruthcaseV5 } from './clinicalAssertionContract.v2';
import { canonicalizeSettingsInput } from '../settings/medicalDefaults';

// ═══════════════════════════════════════════════════════════════
// SECTION A: SETTINGS REDUCE ASKBACKS (10 cases)
// ═══════════════════════════════════════════════════════════════

const settingsReducesAskbacks: ClinicalTruthcaseV5[] = [
    {
        id: 'v4_settings_la_type_infiltration',
        description: 'DefaultLAType=infiltration → no LA askback',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo Komposit',
        settings: { user: { defaultLAType: 'infiltration' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_la_type'] } },
            byInstance: { fuellung: { chips: { mustHave: ['la_infiltration'] } } },
        },
    },
    {
        id: 'v4_settings_la_type_leitung',
        description: 'DefaultLAType=leitung → no LA askback',
        treatmentId: 'endo',
        dictation: 'Endo 14 2 Kanäle WF',
        settings: { user: { defaultLAType: 'leitung' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_la_type'] } },
        },
    },
    {
        id: 'v4_settings_isolation_kofferdam',
        description: 'DefaultIsolation=kofferdam → no isolation askback',
        treatmentId: 'endo',
        dictation: 'Endo 26 3 Kanäle',
        settings: { practice: { defaultIsolation: 'kofferdam' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_isolation'] } },
            byInstance: { endo: { chips: { mustHave: ['kofferdam'] } } },
        },
    },
    {
        id: 'v4_settings_wl_method_elektrisch',
        description: 'DefaultWLMethod=elektrisch → no WL askback',
        treatmentId: 'endo',
        dictation: 'WKB 14 Aufbereitung',
        settings: { practice: { defaultWLMethod: 'elektrisch' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_wl_method'] } },
        },
    },
    {
        id: 'v4_settings_wf_technique_warm',
        description: 'DefaultWFTechnique=warm → no WF askback',
        treatmentId: 'endo',
        dictation: 'WKB 36 WF',
        settings: { practice: { defaultWFTechnique: 'warm' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_wf_technique'] } },
        },
    },
    {
        id: 'v4_settings_capping_mta',
        description: 'DefaultCappingMaterial=mta → no capping askback',
        treatmentId: 'fuellung',
        dictation: 'Füllung 46 mod direkte Überkappung',
        settings: { user: { defaultCappingMaterial: 'mta' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_ueberkappung'] } },
        },
    },
    {
        id: 'v4_settings_irrigation_naocl_edta',
        description: 'DefaultIrrigationProtocol → no irrigation askback',
        treatmentId: 'endo',
        dictation: 'WKB 14 Spülung',
        settings: { practice: { defaultIrrigationProtocol: 'naocl_edta' } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_irrigation'] } },
        },
    },
    {
        id: 'v4_settings_combined_practice_user',
        description: 'Practice + User settings combined',
        treatmentId: 'endo',
        dictation: 'VitE 36 direkt Aufbereitung WF',
        settings: {
            practice: { defaultIsolation: 'kofferdam', defaultWLMethod: 'elektrisch' },
            user: { defaultLAType: 'leitung' },
        },
        contractV2: {
            expectedState: 'output',
            global: {
                askbacks: {
                    mustNotHave: ['medical_la_type', 'medical_isolation', 'medical_wl_method'],
                },
            },
        },
    },
    {
        id: 'v4_settings_skip_askbacks_list',
        description: 'SkipAskbacks list skips specific questions',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo Komposit LA',
        settings: { user: { skipAskbacks: ['medical_vipr', 'medical_perk'] } },
        contractV2: {
            expectedState: 'output',
            global: { askbacks: { mustNotHave: ['medical_vipr', 'medical_perk'] } },
        },
    },
    {
        id: 'v4_settings_text_length_kurz',
        description: 'PreferredTextLength=kurz does not affect askbacks',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo Komposit LA',
        settings: { user: { preferredTextLength: 'kurz' } },
        contractV2: { expectedState: 'output' },
    },
];

// ═══════════════════════════════════════════════════════════════
// SECTION B: MANUAL OVERRIDES BEAT SETTINGS (10 cases)
// ═══════════════════════════════════════════════════════════════

const manualOverridesSection: ClinicalTruthcaseV5[] = [
    {
        id: 'v4_override_la_none_beats_settings',
        description: 'Override LA=off beats settings infiltration',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo',
        settings: { user: { defaultLAType: 'infiltration' } },
        overrides: { single: { la_type: { mode: 'off' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { fuellung: { chips: { mustNotHave: ['la_infiltration', 'la_leitung'] } } },
        },
    },
    {
        id: 'v4_override_la_leitung_beats_settings',
        description: 'Override LA=leitung beats settings infiltration',
        treatmentId: 'endo',
        dictation: 'VitE 14 Aufbereitung',
        settings: { user: { defaultLAType: 'infiltration' } },
        overrides: { single: { la_type: { mode: 'on', value: 'leitung' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { endo: { chips: { mustHave: ['la_leitung'] } } },
        },
    },
    {
        id: 'v4_override_isolation_off_beats_kofferdam',
        description: 'Override isolation=off beats kofferdam settings',
        treatmentId: 'endo',
        dictation: 'WKB 36 WF',
        settings: { practice: { defaultIsolation: 'kofferdam' } },
        overrides: { single: { isolation: { mode: 'off' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { endo: { chips: { mustNotHave: ['kofferdam'] } } },
        },
    },
    {
        id: 'v4_override_wl_roentgen_beats_elektrisch',
        description: 'Override WL=roentgen beats elektrisch settings',
        treatmentId: 'endo',
        dictation: 'WKB 14 Aufbereitung',
        settings: { practice: { defaultWLMethod: 'elektrisch' } },
        overrides: { single: { wl_method: { mode: 'on', value: 'roentgen' } } },
        contractV2: { expectedState: 'output' },
    },
    {
        id: 'v4_override_wf_kalt_beats_warm',
        description: 'Override WF=kalt beats warm settings',
        treatmentId: 'endo',
        dictation: 'WKB 36 WF',
        settings: { practice: { defaultWFTechnique: 'warm' } },
        overrides: { single: { wf_technique: { mode: 'on', value: 'kalt' } } },
        contractV2: { expectedState: 'output' },
    },
    {
        id: 'v4_override_add_chip_mehrschicht',
        description: 'Override add chip mehrschicht',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo Komposit',
        overrides: { single: { mehrschicht: { mode: 'on' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { fuellung: { chips: { mustHave: ['mehrschicht'] } } },
        },
    },
    {
        id: 'v4_override_remove_chip_spuelung',
        description: 'Override remove spülung chip',
        treatmentId: 'endo',
        dictation: 'WKB 14 NaOCl Spülung',
        overrides: { single: { spuelung_naocl: { mode: 'off' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { endo: { chips: { mustNotHave: ['spuelung_naocl'] } } },
        },
    },
    {
        id: 'v4_override_reset_to_auto',
        description: 'Override reset to auto restores settings',
        treatmentId: 'fuellung',
        dictation: 'Füllung 36 mo',
        settings: { user: { defaultLAType: 'infiltration' } },
        overrides: { single: { la_type: { mode: 'auto' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: { fuellung: { chips: { mustHave: ['la_infiltration'] } } },
        },
    },
    {
        id: 'v4_override_multi_chips',
        description: 'Override multiple chips at once',
        treatmentId: 'endo',
        dictation: 'VitE 14',
        overrides: {
            single: {
                la_type: { mode: 'on', value: 'leitung' },
                isolation: { mode: 'on', value: 'kofferdam' },
            },
        },
        contractV2: {
            expectedState: 'output',
            byInstance: { endo: { chips: { mustHave: ['la_leitung', 'kofferdam'] } } },
        },
    },
    {
        id: 'v4_override_parametrized_value',
        description: 'Override with parametrized value',
        treatmentId: 'endo',
        dictation: 'WKB 14 WF',
        overrides: { single: { wf_technique: { mode: 'on', value: 'einzel' } } },
        contractV2: { expectedState: 'output' },
    },
];

// ═══════════════════════════════════════════════════════════════
// SECTION C: MULTITREATMENT SCOPING (10 cases)
// ═══════════════════════════════════════════════════════════════

const multiTreatmentSection: ClinicalTruthcaseV5[] = [
    {
        id: 'v4_multi_endo_la_fuellung_ohne',
        description: 'Endo LA, danach Füllung ohne Betäubung',
        treatmentId: 'multi',
        dictation: 'Endo 14 Leitungsanästhesie, danach Füllung mo ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['la_leitung'] } },
                fuellung: { chips: { mustNotHave: ['la_leitung', 'la_infiltration'] } },
            },
        },
    },
    {
        id: 'v4_multi_endo_kofferdam_fuellung_ohne',
        description: 'Endo Kofferdam, danach Füllung ohne Kofferdam',
        treatmentId: 'multi',
        dictation: 'WKB 36 Kofferdam, danach Füllung mo kein Kofferdam',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['kofferdam'] } },
                fuellung: { chips: { mustNotHave: ['kofferdam'] } },
            },
        },
    },
    {
        id: 'v4_multi_shared_la_both_instances',
        description: 'Shared LA for both treatments',
        treatmentId: 'multi',
        dictation: 'Leitungsanästhesie, dann Endo 14, danach Füllung mo',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['la_leitung'] } },
                fuellung: { chips: { mustHave: ['la_leitung'] } },
            },
        },
    },
    {
        id: 'v4_multi_different_teeth',
        description: 'Endo 14 + Füllung 36 different teeth',
        treatmentId: 'multi',
        dictation: 'WKB 14 2K, zusätzlich Füllung 36 mo Komposit',
        contractV2: { expectedState: 'output' },
    },
    {
        id: 'v4_multi_bilateral_endo',
        description: 'Bilateral Endo same session',
        treatmentId: 'multi',
        dictation: 'VitE 36 2K, dann VitE 46 2K',
        contractV2: { expectedState: 'output' },
    },
    {
        id: 'v4_multi_negation_only_second_clause',
        description: 'Negation only in second clause',
        treatmentId: 'multi',
        dictation: 'Endo 14 Röntgen, danach Füllung ohne Röntgen',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['roentgen'] } },
            },
        },
    },
    {
        id: 'v4_multi_zusaetzlich_marker',
        description: 'Zusätzlich as clause marker',
        treatmentId: 'multi',
        dictation: 'WKB 14 WF, zusätzlich Füllung ohne LA',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                fuellung: { chips: { mustNotHave: ['la_leitung', 'la_infiltration'] } },
            },
        },
    },
    {
        id: 'v4_multi_anschliessend_marker',
        description: 'Anschließend as clause marker',
        treatmentId: 'multi',
        dictation: 'Endo 14 LA Leitung, anschließend Füllung mo ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['la_leitung'] } },
                fuellung: { chips: { mustNotHave: ['la_leitung'] } },
            },
        },
    },
    {
        id: 'v4_multi_override_per_instance',
        description: 'Override applies only to specific instance',
        treatmentId: 'multi',
        dictation: 'Endo 14, danach Füllung mo',
        settings: { user: { defaultLAType: 'infiltration' } },
        overrides: { fuellung: { la_type: { mode: 'off' } } },
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['la_infiltration'] } },
                fuellung: { chips: { mustNotHave: ['la_infiltration'] } },
            },
        },
    },
    {
        id: 'v4_multi_settings_per_treatment',
        description: 'Settings apply per treatment type',
        treatmentId: 'multi',
        dictation: 'WKB 14 WF, danach Füllung mo',
        settings: {
            practice: { defaultWFTechnique: 'warm' },
            user: { defaultLAType: 'leitung' },
        },
        contractV2: { expectedState: 'output' },
    },
];

// ═══════════════════════════════════════════════════════════════
// SECTION D: CONFUSABLES AND TRAPS (5 cases)
// ═══════════════════════════════════════════════════════════════

const confusablesSection: ClinicalTruthcaseV5[] = [
    {
        id: 'v4_confusable_nacl_vs_naocl',
        description: 'NaCl (saline) vs NaOCl (disinfectant) confusion',
        treatmentId: 'endo',
        dictation: 'WKB 14 Spülung mit NaOCl und EDTA',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: {
                    chips: { mustHave: ['spuelung_naocl'] },
                },
            },
        },
    },
    {
        id: 'v4_confusable_spuelt_zuhause',
        description: 'Spült zuhause is NOT intraop irrigation',
        treatmentId: 'endo',
        dictation: 'VitE Patient spült zuhause mit CHX',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustNotHave: ['spuelung_naocl'] } },
            },
        },
    },
    {
        id: 'v4_confusable_keine_roentgen_nur_fuellung',
        description: 'Keine Röntgen only applies to Füllung part',
        treatmentId: 'multi',
        dictation: 'WKB 14 Aufbereitung Röntgen WL, danach Füllung keine Röntgenaufnahme',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustHave: ['roentgen'] } },
            },
        },
    },
    {
        id: 'v4_trap_pronoun_die_fuellung',
        description: 'Pronoun "die Füllung" should not leak LA',
        treatmentId: 'multi',
        dictation: 'Endo 14 LA, die Füllung danach ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                fuellung: { chips: { mustNotHave: ['la_leitung', 'la_infiltration'] } },
            },
        },
    },
    {
        id: 'v4_trap_session_level_negation',
        description: 'Session-level negation applies to all',
        treatmentId: 'multi',
        dictation: 'Heute ohne Betäubung: Endo 14, Füllung mo',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                endo: { chips: { mustNotHave: ['la_leitung', 'la_infiltration'] } },
                fuellung: { chips: { mustNotHave: ['la_leitung', 'la_infiltration'] } },
            },
        },
    },
    // M50: Deep filling crash fix
    {
        id: 'v4_deep_filling_no_crash',
        description: 'Deep filling with LA and Kofferdam should not crash',
        treatmentId: 'fuellung',
        dictation: 'Zahn 26 MOD, tiefe Kompositfüllung, Kofferdam, Anästhesie.',
        contractV2: {
            // This MUST NOT error - the crash fix ensures graceful handling
            expectedState: 'output',
            byInstance: {
                fuellung: {
                    chips: { mustHave: ['kofferdam'] },
                },
            },
        },
    },
    {
        id: 'v4_profunda_with_ueberkappung',
        description: 'Profunda triggers ueberkappung askback or output',
        treatmentId: 'fuellung',
        dictation: 'Zahn 36 do profunda, direkte Überkappung mit Ca(OH)2',
        contractV2: {
            expectedState: 'output',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL V4 TRUTHCASES
// ═══════════════════════════════════════════════════════════════

export const clinicalTruthcasesV4: ClinicalTruthcaseV5[] = [
    ...settingsReducesAskbacks,
    ...manualOverridesSection,
    ...multiTreatmentSection,
    ...confusablesSection,
].map((truthcase) => {
    if (!truthcase.settings) return truthcase;
    return {
        ...truthcase,
        settings: canonicalizeSettingsInput(truthcase.settings),
    };
});

export const V4_TRUTH_COUNT = clinicalTruthcasesV4.length;
