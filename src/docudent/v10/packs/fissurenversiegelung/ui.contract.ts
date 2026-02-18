import type { PackUiContractV1 } from '../types';

export const fissurenversiegelungUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'fissurenversiegelung_standard',
            mode: 'toggle',
            label: 'Fissurenversiegelung',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'fissurenversiegelung_kontrolle',
            mode: 'toggle',
            label: 'Kontrolle dokumentiert',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.fissurenversiegelung.defaultIndication',
                label: 'Standard-Indikation',
                type: 'enum',
                options: [
                    { value: 'kariesprophylaxe', label: 'Kariesprophylaxe' },
                    { value: 'erhoehtes_risiko', label: 'Erhoehtes Kariesrisiko' },
                ],
                mapsToAskbackId: 'medical_fissuren_indikation',
            },
            {
                key: 'treatments.fissurenversiegelung.defaultMaterial',
                label: 'Standard-Material',
                type: 'enum',
                options: [
                    { value: 'kunststoff', label: 'Kunststoff' },
                    { value: 'giz_provisorisch', label: 'GIZ provisorisch' },
                ],
                mapsToAskbackId: 'medical_fissuren_material',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_fissuren_indikation',
            'medical_fissuren_material',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Indikation nennen (z. B. Kariesprophylaxe)',
        'Material nennen (Kunststoff oder Provisorium)',
        'Kontrolle/Okklusion kurz dokumentieren',
    ],
};
