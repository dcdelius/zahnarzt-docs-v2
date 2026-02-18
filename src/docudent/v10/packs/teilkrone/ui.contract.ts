import type { PackUiContractV1 } from '../types';

export const teilkroneUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'teilkrone_definitiv',
            mode: 'toggle',
            label: 'Teilkronenversorgung',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'teilkrone_provisorium',
            mode: 'toggle',
            label: 'Provisorische Teilkrone',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'teilkrone_eingliederung_definitiv',
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
                key: 'treatments.teilkrone.defaultType',
                label: 'Standard-Teilkronenart',
                type: 'enum',
                options: [
                    { value: 'teilkrone', label: 'Teilkronenversorgung' },
                    { value: 'provisorium', label: 'Provisorium' },
                ],
                mapsToAskbackId: 'medical_teilkrone_art',
            },
            {
                key: 'treatments.teilkrone.defaultPlacement',
                label: 'Standard-Eingliederung',
                type: 'enum',
                options: [
                    { value: 'definitiv', label: 'Definitiv' },
                    { value: 'provisorisch', label: 'Provisorisch' },
                ],
                mapsToAskbackId: 'medical_teilkrone_eingliederung',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_teilkrone_art',
            'medical_teilkrone_eingliederung',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Teilkronenart nennen (definitiv/provisorisch)',
        'Eingliederung dokumentieren (definitiv/provisorisch)',
        'Okklusions-/Passungskontrolle knapp dokumentieren',
    ],
};
