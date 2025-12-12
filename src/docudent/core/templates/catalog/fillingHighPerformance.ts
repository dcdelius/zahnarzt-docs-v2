import { TemplateV3 } from '../../knowledge/types';

export const FILLING_HIGH_PERFORMANCE: TemplateV3 = {
    id: 'master_fill_v3', // ID matches catalog
    title: 'Füllungstherapie (High-Performance)',
    systemVersion: 'v3',
    treatmentType: 'filling',
    version: 1,

    rulesetId: 'conservative_rules',

    renderSpec: {
        sections: [
            { id: 'summary', required: true, title: 'ZUSAMMENFASSUNG' },
            { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
            { id: 'forensic', required: true, title: 'FORENSIK & SICHERHEIT' },
            { id: 'billing', required: false, title: 'ABRECHNUNG' }
        ],
        strict: true
    },

    requiredFacts: ['tooth', 'surfaces', 'material'],

    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string', description: 'FDI Notation' },
        { id: 'surfaces', label: 'Flächen', type: 'multiselect', options: ['m', 'o', 'd', 'v', 'l', 'i', 'b', 'p'] },
        { id: 'material', label: 'Material', type: 'string' },
        { id: 'anesthesia', label: 'Anästhesie', type: 'select', options: ['Infiltration', 'Leitung', 'Intraligamentär', 'Keine'] },
        { id: 'anesthesia_drug', label: 'Anästhetikum', type: 'string' },
        { id: 'anesthesia_amount', label: 'Menge (ml)', type: 'string' },
        { id: 'isolation', label: 'Trockenlegung', type: 'select', options: ['Kofferdam', 'Watterollen', 'Relative Trockenlegung'] },
        { id: 'excavation', label: 'Exkavation', type: 'select', options: ['Caries profunda', 'Caries media', 'Vollständig'] },
        { id: 'cp_treatment', label: 'CP-Behandlung', type: 'select', options: ['Direkte Überkappung', 'Indirekte Überkappung'] },
        { id: 'matrix', label: 'Matrize', type: 'boolean' },
        { id: 'adhesive', label: 'Adhäsiv', type: 'string' },
        { id: 'curing', label: 'Lichthärtung', type: 'boolean' },
        { id: 'polishing', label: 'Politur', type: 'boolean' },
        { id: 'occlusion', label: 'Okklusion', type: 'select', options: ['Geprüft', 'Eingeschliffen', 'Ohne Befund'] }
    ],

    defaults: {
        insuranceType: 'GKV',
        showBillingCodes: true,
        includeRisks: true,
        forensicLevel: 'standard',
        textLength: 'standard',
        activeStandards: [
            'chip_surface_anesthesia',
            'chip_relative_isolation',
            'chip_adhesive',
            'chip_layering',
            'chip_occlusion_check',
            'chip_polishing',
            'chip_fluoridation'
        ]
    }
};

