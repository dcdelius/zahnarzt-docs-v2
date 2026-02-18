import type { PackUiContractV1 } from '../types';

export const kroneUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'krone_vollkrone',
            mode: 'toggle',
            label: 'Vollkrone',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'krone_provisorium',
            mode: 'toggle',
            label: 'Provisorische Krone',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'krone_eingliederung_definitiv',
            mode: 'toggle',
            label: 'Definitive Eingliederung',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.krone.defaultType',
                label: 'Standard-Kronenart',
                type: 'enum',
                options: [
                    { value: 'vollkrone', label: 'Vollkrone' },
                    { value: 'provisorium', label: 'Provisorium' },
                ],
                mapsToAskbackId: 'medical_krone_art',
            },
            {
                key: 'treatments.krone.defaultPlacement',
                label: 'Standard-Eingliederung',
                type: 'enum',
                options: [
                    { value: 'definitiv', label: 'Definitiv' },
                    { value: 'provisorisch', label: 'Provisorisch' },
                ],
                mapsToAskbackId: 'medical_krone_eingliederung',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_krone_art',
            'medical_krone_eingliederung',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Kronenart nennen (Vollkrone/Provisorium)',
        'Eingliederung dokumentieren (definitiv/provisorisch)',
        'Okklusions-/Passungskontrolle knapp dokumentieren',
    ],
};
