import type { PackUiContractV1 } from '../types';

export const wsrUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'wsr_bema_54',
            mode: 'toggle',
            label: 'WSR (BEMA 54)',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'wsr_bema_55',
            mode: 'toggle',
            label: 'WSR (BEMA 55)',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'wsr_goz_3110',
            mode: 'toggle',
            label: 'GOZ 3110',
            group: 'optional',
            pin: true,
        },
        {
            chipId: 'wsr_goz_3120',
            mode: 'toggle',
            label: 'GOZ 3120',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.wsr.defaultZugang',
                label: 'Standard-WSR-Zugang',
                type: 'enum',
                options: [
                    { value: 'trepaniert', label: 'Trepaniert / am eroeffneten Zahn' },
                    { value: 'osteotomie', label: 'Durch Osteotomie' },
                ],
                mapsToAskbackId: 'medical_wsr_zugang',
            },
            {
                key: 'treatments.wsr.defaultLokalisation',
                label: 'Standard-WSR-Lokalisation',
                type: 'enum',
                options: [
                    { value: 'front_praemolar', label: 'Frontzahn/Praemolar' },
                    { value: 'molar', label: 'Molar' },
                ],
                mapsToAskbackId: 'medical_wsr_lokalisation',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_wsr_zugang',
            'medical_wsr_lokalisation',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Zugang nennen (trepaniert/am eroeffneten Zahn oder Osteotomie)',
        'Lokalisation nennen (Front/Praemolar oder Molar)',
        'Kurze OP-Dokumentation inkl. Indikation und Nachsorgehinweis',
    ],
};
