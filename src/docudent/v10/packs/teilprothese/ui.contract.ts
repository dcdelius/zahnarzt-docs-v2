import type { PackUiContractV1 } from '../types';

export const teilprotheseUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'teilprothese_interim',
            mode: 'toggle',
            label: 'Interimsteilprothese',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'teilprothese_modellguss',
            mode: 'toggle',
            label: 'Modellgussprothese',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'teilprothese_kontrolle',
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
                key: 'treatments.teilprothese.defaultType',
                label: 'Standard-Teilprothesentyp',
                type: 'enum',
                options: [
                    { value: 'interim', label: 'Interimsteilprothese' },
                    { value: 'modellguss', label: 'Modellgussprothese' },
                ],
                mapsToAskbackId: 'medical_teilprothese_typ',
            },
            {
                key: 'treatments.teilprothese.defaultPhase',
                label: 'Standard-Leistungsphase',
                type: 'enum',
                options: [
                    { value: 'eingliederung', label: 'Eingliederung' },
                    { value: 'kontrolle', label: 'Kontrolle/Nachjustierung' },
                ],
                mapsToAskbackId: 'medical_teilprothese_phase',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_teilprothese_typ',
            'medical_teilprothese_phase',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Prothesentyp benennen (Interim/Modellguss)',
        'Eingliederung und Passung dokumentieren',
        'Kontrolle/Nachjustierung bei Bedarf angeben',
    ],
};
