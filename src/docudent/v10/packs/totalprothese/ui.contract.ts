import type { PackUiContractV1 } from '../types';

export const totalprotheseUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'totalprothese_konventionell',
            mode: 'toggle',
            label: 'Konventionelle Totalprothese',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'totalprothese_immediat',
            mode: 'toggle',
            label: 'Immediat-Totalprothese',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'totalprothese_kontrolle',
            mode: 'toggle',
            label: 'Kontrolle/Nachjustierung',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.totalprothese.defaultType',
                label: 'Standard-Totalprothesentyp',
                type: 'enum',
                options: [
                    { value: 'konventionell', label: 'Konventionell' },
                    { value: 'immediat', label: 'Immediat' },
                ],
                mapsToAskbackId: 'medical_totalprothese_typ',
            },
            {
                key: 'treatments.totalprothese.defaultPhase',
                label: 'Standard-Leistungsphase',
                type: 'enum',
                options: [
                    { value: 'eingliederung', label: 'Eingliederung' },
                    { value: 'kontrolle', label: 'Kontrolle/Nachjustierung' },
                ],
                mapsToAskbackId: 'medical_totalprothese_phase',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_totalprothese_typ',
            'medical_totalprothese_phase',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Prothesentyp benennen (konventionell/immediat)',
        'Eingliederung und Sitzkontrolle dokumentieren',
        'Kontrolle/Nachjustierung bei Bedarf angeben',
    ],
};
