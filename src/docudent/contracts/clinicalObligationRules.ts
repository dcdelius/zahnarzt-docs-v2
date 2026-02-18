export type ClinicalValueKind = 'string_non_empty' | 'boolean_known' | 'anesthesia_resolved';

export type ClinicalSimpleRule = {
    factPath: string;
    askbackId: string;
    valueKind: ClinicalValueKind;
};

export type ClinicalConditionalRule = {
    factPath: string;
    askbackId: string;
    applicability: 'always' | 'parodontologie_phase_upt' | 'wsr_gkv_only' | 'wsr_pkv_only';
    valueKind: ClinicalValueKind;
    notRequiredReason?: string;
};

export const CLINICAL_SIMPLE_RULES: Record<string, ClinicalSimpleRule[]> = {
    extraction: [
        { factPath: 'anesthesia.type', askbackId: 'medical_la_type', valueKind: 'anesthesia_resolved' },
        { factPath: 'woundCare', askbackId: 'wound_care', valueKind: 'boolean_known' },
    ],
    pzr: [
        { factPath: 'pzr.zahnsteinEntfernung', askbackId: 'pzr_zahnstein', valueKind: 'boolean_known' },
        { factPath: 'pzr.fluoridation', askbackId: 'pzr_fluoridation', valueKind: 'boolean_known' },
    ],
    untersuchung: [
        { factPath: 'untersuchung.reason', askbackId: 'medical_untersuchung_anlass', valueKind: 'string_non_empty' },
        { factPath: 'untersuchung.findings', askbackId: 'medical_untersuchung_befunde', valueKind: 'string_non_empty' },
        { factPath: 'untersuchung.assessment', askbackId: 'medical_untersuchung_beurteilung', valueKind: 'string_non_empty' },
    ],
    upt: [
        { factPath: 'upt.grade', askbackId: 'medical_upt_grad', valueKind: 'string_non_empty' },
        { factPath: 'upt.interval', askbackId: 'medical_upt_intervall', valueKind: 'string_non_empty' },
    ],
    trauma: [
        { factPath: 'trauma.art', askbackId: 'medical_trauma_art', valueKind: 'string_non_empty' },
        { factPath: 'trauma.schienung', askbackId: 'medical_trauma_schienung', valueKind: 'string_non_empty' },
    ],
    implant: [
        { factPath: 'implant.phase', askbackId: 'medical_implant_phase', valueKind: 'string_non_empty' },
        { factPath: 'implant.nachsorge', askbackId: 'medical_implant_nachsorge', valueKind: 'string_non_empty' },
    ],
    fissurenversiegelung: [
        { factPath: 'fissurenversiegelung.indication', askbackId: 'medical_fissuren_indikation', valueKind: 'string_non_empty' },
        { factPath: 'fissurenversiegelung.material', askbackId: 'medical_fissuren_material', valueKind: 'string_non_empty' },
    ],
    crown_prep: [
        { factPath: 'crownPrep.preparation', askbackId: 'crown_prep_preparation', valueKind: 'boolean_known' },
        { factPath: 'crownPrep.impression', askbackId: 'crown_prep_impression', valueKind: 'boolean_known' },
        { factPath: 'crownPrep.provisional', askbackId: 'crown_prep_provisional', valueKind: 'boolean_known' },
    ],
    krone: [
        { factPath: 'krone.type', askbackId: 'medical_krone_art', valueKind: 'string_non_empty' },
        { factPath: 'krone.placement', askbackId: 'medical_krone_eingliederung', valueKind: 'string_non_empty' },
    ],
    teilkrone: [
        { factPath: 'teilkrone.type', askbackId: 'medical_teilkrone_art', valueKind: 'string_non_empty' },
        { factPath: 'teilkrone.placement', askbackId: 'medical_teilkrone_eingliederung', valueKind: 'string_non_empty' },
    ],
    bruecke: [
        { factPath: 'bruecke.type', askbackId: 'medical_bruecke_typ', valueKind: 'string_non_empty' },
        { factPath: 'bruecke.phase', askbackId: 'medical_bruecke_phase', valueKind: 'string_non_empty' },
    ],
    teilprothese: [
        { factPath: 'teilprothese.type', askbackId: 'medical_teilprothese_typ', valueKind: 'string_non_empty' },
        { factPath: 'teilprothese.phase', askbackId: 'medical_teilprothese_phase', valueKind: 'string_non_empty' },
    ],
    totalprothese: [
        { factPath: 'totalprothese.type', askbackId: 'medical_totalprothese_typ', valueKind: 'string_non_empty' },
        { factPath: 'totalprothese.phase', askbackId: 'medical_totalprothese_phase', valueKind: 'string_non_empty' },
    ],
    schiene: [
        { factPath: 'schiene.type', askbackId: 'medical_schiene_typ', valueKind: 'string_non_empty' },
        { factPath: 'schiene.phase', askbackId: 'medical_schiene_phase', valueKind: 'string_non_empty' },
    ],
    ueberkappung: [
        { factPath: 'capping.performed', askbackId: 'medical_ueberkappung', valueKind: 'string_non_empty' },
        { factPath: 'cappingMaterial', askbackId: 'medical_ueberkappung_material', valueKind: 'string_non_empty' },
    ],
} as const;

export const CLINICAL_CONDITIONAL_RULES: Record<string, ClinicalConditionalRule[]> = {
    parodontologie: [
        {
            factPath: 'parodontologie.phase',
            askbackId: 'medical_parodontologie_phase',
            applicability: 'always',
            valueKind: 'string_non_empty',
        },
        {
            factPath: 'parodontologie.uptGrade',
            askbackId: 'medical_parodontologie_upt_grad',
            applicability: 'parodontologie_phase_upt',
            valueKind: 'string_non_empty',
            notRequiredReason: 'not_required_for_phase',
        },
    ],
    wsr: [
        {
            factPath: 'wsr.zugang',
            askbackId: 'medical_wsr_zugang',
            applicability: 'wsr_gkv_only',
            valueKind: 'string_non_empty',
            notRequiredReason: 'not_required_for_insurance',
        },
        {
            factPath: 'wsr.lokalisation',
            askbackId: 'medical_wsr_lokalisation',
            applicability: 'wsr_pkv_only',
            valueKind: 'string_non_empty',
            notRequiredReason: 'not_required_for_insurance',
        },
    ],
} as const;
