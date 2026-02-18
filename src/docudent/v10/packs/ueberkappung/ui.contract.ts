import type { PackUiContractV1 } from '../types';

export const ueberkappungUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'ueberkappung_art',
            mode: 'param',
            label: 'Ueberkappungsart',
            group: 'relevant',
            pin: true,
            options: [
                { value: 'indirekt', label: 'Indirekt' },
                { value: 'direkt', label: 'Direkt' },
            ],
            chipMapping: {
                indirekt: 'ueberkappung_indirekt',
                direkt: 'ueberkappung_direkt',
            },
        },
        {
            chipId: 'ueberkappung_material',
            mode: 'param',
            label: 'Material',
            group: 'optional',
            options: [
                { value: 'MTA', label: 'MTA' },
                { value: 'Ca(OH)₂', label: 'Ca(OH)2' },
                { value: 'Biodentine', label: 'Biodentine' },
            ],
            chipMapping: {
                MTA: 'ueberkappung_material_mta',
                'Ca(OH)₂': 'ueberkappung_material_caoh2',
                Biodentine: 'ueberkappung_material_biodentine',
            },
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.ueberkappung.defaultType',
                label: 'Standard-Ueberkappungsart',
                type: 'enum',
                options: [
                    { value: 'indirekt', label: 'Indirekt' },
                    { value: 'direkt', label: 'Direkt' },
                ],
                mapsToAskbackId: 'medical_ueberkappung',
            },
            {
                key: 'treatments.ueberkappung.defaultMaterial',
                label: 'Standard-Material',
                type: 'enum',
                options: [
                    { value: 'MTA', label: 'MTA' },
                    { value: 'Ca(OH)₂', label: 'Ca(OH)2' },
                    { value: 'Biodentine', label: 'Biodentine' },
                ],
                mapsToAskbackId: 'medical_ueberkappung_material',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_ueberkappung',
            'medical_ueberkappung_material',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Direkt/indirekt explizit nennen',
        'Material nennen (z. B. MTA, Ca(OH)2, Biodentine)',
        'Pulpaeroeffnung ja/nein klar dokumentieren',
    ],
};
