
export type TreatmentId =
    | 'filling'
    | 'endo'
    | 'crown_prep'
    | 'extraction'
    | 'implant'
    | 'prophylaxis'
    | 'consultation'
    | 'bridge_prep'
    | 'denture'
    | 'perio'
    | 'surgery_minor'
    | 'surgery_major'
    | 'ortho_check'
    | 'bleaching'
    | 'splint'
    | 'emergency'
    | 'recall'
    | 'child_prophylaxis'
    | 'fissure_sealing'
    | 'composite_build_up'
    | 'post_core'
    | 'veneers'
    | 'inlay'
    | 'onlay'
    | 'reline'
    | 'repair'
    | 'suture_removal'
    | 'implant_exposure'
    | 'bone_augmentation'
    | 'sinus_lift';

export interface TreatmentDef {
    id: TreatmentId;
    label: string;
    description: string;
    category: 'conservative' | 'prosthetics' | 'surgery' | 'prevention' | 'endo' | 'general' | 'ortho' | 'implantology';
    ruleCatalogId: string; // e.g., 'conservative_rules'
    chipCatalogId: string; // e.g., 'conservative_chips' (often same as rules in new unified model)
    defaultTemplateId: string;
}

const TEMPLATE_BY_TREATMENT: Partial<Record<TreatmentId, string>> = {
    filling: 'master_fill_v3',
    endo: 'template_endo_root_v3',
    extraction: 'template_surgery_extraction_v3',
    surgery_minor: 'template_surgery_extraction_v3',
    surgery_major: 'template_surgery_extraction_v3',
    suture_removal: 'template_surgery_extraction_v3',
    implant_exposure: 'template_surgery_extraction_v3',
    bone_augmentation: 'template_surgery_extraction_v3',
    sinus_lift: 'template_surgery_extraction_v3',
    prophylaxis: 'template_prevention_prophy_v3',
    recall: 'template_prevention_prophy_v3',
    child_prophylaxis: 'template_prevention_prophy_v3',
    fissure_sealing: 'template_prevention_prophy_v3',
    bleaching: 'template_prevention_prophy_v3'
};

const getTemplateId = (id: TreatmentId) => TEMPLATE_BY_TREATMENT[id] || 'master_fill_v3';

export const TREATMENT_CATALOG: Record<TreatmentId, TreatmentDef> = {
    'filling': {
        id: 'filling',
        label: 'Füllungstherapie',
        description: 'Konservierende Versorgung (Komposit, Zement)',
        category: 'conservative',
        ruleCatalogId: 'conservative',
        chipCatalogId: 'conservative',
        defaultTemplateId: getTemplateId('filling')
    },
    'endo': {
        id: 'endo',
        label: 'Endodontie',
        description: 'Wurzelkanalbehandlung',
        category: 'endo',
        ruleCatalogId: 'endo',
        chipCatalogId: 'endo',
        defaultTemplateId: getTemplateId('endo')
    },
    'crown_prep': {
        id: 'crown_prep',
        label: 'Krone (Präp)',
        description: 'Präparation für Krone/Teilkrone',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('crown_prep')
    },
    'extraction': {
        id: 'extraction',
        label: 'Extraktion',
        description: 'Zahnentfernung',
        category: 'surgery',
        ruleCatalogId: 'surgery',
        chipCatalogId: 'surgery',
        defaultTemplateId: getTemplateId('extraction')
    },
    'implant': {
        id: 'implant',
        label: 'Implantation',
        description: 'Chirurgische Implantatsetzung',
        category: 'implantology',
        ruleCatalogId: 'implantology',
        chipCatalogId: 'implantology',
        defaultTemplateId: getTemplateId('implant')
    },
    'prophylaxis': {
        id: 'prophylaxis',
        label: 'PZR / Prophylaxe',
        description: 'Professionelle Zahnreinigung',
        category: 'prevention',
        ruleCatalogId: 'prevention',
        chipCatalogId: 'prevention',
        defaultTemplateId: getTemplateId('prophylaxis')
    },
    'consultation': {
        id: 'consultation',
        label: 'Beratung / Untersuchung',
        description: 'Allgemeine Untersuchung und Beratung',
        category: 'general',
        ruleCatalogId: 'general',
        chipCatalogId: 'general',
        defaultTemplateId: getTemplateId('consultation')
    },
    'bridge_prep': {
        id: 'bridge_prep',
        label: 'Brücke (Präp)',
        description: 'Präparation für Brückenversorgung',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('bridge_prep')
    },
    'denture': {
        id: 'denture',
        label: 'Prothese',
        description: 'Total- oder Teilprothese',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('denture')
    },
    'perio': {
        id: 'perio',
        label: 'Parodontitis',
        description: 'Systematische Parodontitisbehandlung',
        category: 'prevention',
        ruleCatalogId: 'perio',
        chipCatalogId: 'perio',
        defaultTemplateId: getTemplateId('perio')
    },
    'surgery_minor': {
        id: 'surgery_minor',
        label: 'Kl. Chirurgie',
        description: 'Exzisionen, WSR, etc.',
        category: 'surgery',
        ruleCatalogId: 'surgery',
        chipCatalogId: 'surgery',
        defaultTemplateId: getTemplateId('surgery_minor')
    },
    'surgery_major': {
        id: 'surgery_major',
        label: 'Gr. Chirurgie',
        description: 'Osteotomie, Zysten, etc.',
        category: 'surgery',
        ruleCatalogId: 'surgery',
        chipCatalogId: 'surgery',
        defaultTemplateId: getTemplateId('surgery_major')
    },
    'ortho_check': {
        id: 'ortho_check',
        label: 'KFO Kontrolle',
        description: 'Kieferorthopädische Verlaufskontrolle',
        category: 'ortho',
        ruleCatalogId: 'ortho',
        chipCatalogId: 'ortho',
        defaultTemplateId: getTemplateId('ortho_check')
    },
    'bleaching': {
        id: 'bleaching',
        label: 'Bleaching',
        description: 'Zahnaufhellung',
        category: 'prevention',
        ruleCatalogId: 'prevention',
        chipCatalogId: 'prevention',
        defaultTemplateId: getTemplateId('bleaching')
    },
    'splint': {
        id: 'splint',
        label: 'Schiene',
        description: 'Aufbissbehelf / Knirscherschiene',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('splint')
    },
    'emergency': {
        id: 'emergency',
        label: 'Notdienst',
        description: 'Schmerzbehandlung im Notdienst',
        category: 'general',
        ruleCatalogId: 'general',
        chipCatalogId: 'general',
        defaultTemplateId: getTemplateId('emergency')
    },
    'recall': {
        id: 'recall',
        label: 'Recall',
        description: 'Nachsorgeuntersuchung',
        category: 'prevention',
        ruleCatalogId: 'prevention',
        chipCatalogId: 'prevention',
        defaultTemplateId: getTemplateId('recall')
    },
    'child_prophylaxis': {
        id: 'child_prophylaxis',
        label: 'IP / Kinder',
        description: 'Individualprophylaxe bei Kindern',
        category: 'prevention',
        ruleCatalogId: 'prevention',
        chipCatalogId: 'prevention',
        defaultTemplateId: getTemplateId('child_prophylaxis')
    },
    'fissure_sealing': {
        id: 'fissure_sealing',
        label: 'Versiegelung',
        description: 'Fissurenversiegelung',
        category: 'prevention',
        ruleCatalogId: 'prevention',
        chipCatalogId: 'prevention',
        defaultTemplateId: getTemplateId('fissure_sealing')
    },
    'composite_build_up': {
        id: 'composite_build_up',
        label: 'Aufbaufüllung',
        description: 'Präendodontische oder präprothetische Aufbaufüllung',
        category: 'conservative',
        ruleCatalogId: 'conservative',
        chipCatalogId: 'conservative',
        defaultTemplateId: getTemplateId('composite_build_up')
    },
    'post_core': {
        id: 'post_core',
        label: 'Stiftaufbau',
        description: 'Glasfaserstiftverankerung',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('post_core')
    },
    'veneers': {
        id: 'veneers',
        label: 'Veneers',
        description: 'Keramikschalen',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('veneers')
    },
    'inlay': {
        id: 'inlay',
        label: 'Inlay',
        description: 'Einlagefüllung (Keramik/Gold)',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('inlay')
    },
    'onlay': {
        id: 'onlay',
        label: 'Onlay',
        description: 'Kuppelfüllung',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('onlay')
    },
    'reline': {
        id: 'reline',
        label: 'Unterfütterung',
        description: 'Prothesenunterfütterung',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('reline')
    },
    'repair': {
        id: 'repair',
        label: 'Reparatur',
        description: 'Prothesenreparatur',
        category: 'prosthetics',
        ruleCatalogId: 'prosthetics',
        chipCatalogId: 'prosthetics',
        defaultTemplateId: getTemplateId('repair')
    },
    'suture_removal': {
        id: 'suture_removal',
        label: 'Nahtentfernung',
        description: 'Entfernung von Fäden',
        category: 'surgery',
        ruleCatalogId: 'surgery',
        chipCatalogId: 'surgery',
        defaultTemplateId: getTemplateId('suture_removal')
    },
    'implant_exposure': {
        id: 'implant_exposure',
        label: 'Freilegung',
        description: 'Implantatfreilegung',
        category: 'implantology',
        ruleCatalogId: 'implantology',
        chipCatalogId: 'implantology',
        defaultTemplateId: getTemplateId('implant_exposure')
    },
    'bone_augmentation': {
        id: 'bone_augmentation',
        label: 'Knochenaufbau',
        description: 'Augmentation',
        category: 'implantology',
        ruleCatalogId: 'implantology',
        chipCatalogId: 'implantology',
        defaultTemplateId: getTemplateId('bone_augmentation')
    },
    'sinus_lift': {
        id: 'sinus_lift',
        label: 'Sinuslift',
        description: 'Sinusbodenelevation',
        category: 'implantology',
        ruleCatalogId: 'implantology',
        chipCatalogId: 'implantology',
        defaultTemplateId: getTemplateId('sinus_lift')
    }
};
