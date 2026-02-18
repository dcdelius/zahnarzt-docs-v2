import type { PackUiContractV1 } from '../types';

export const traumaUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'trauma_baseline',
            mode: 'toggle',
            label: 'Trauma-Befund',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'trauma_schienung_semipermanent',
            mode: 'toggle',
            label: 'Semipermanente Schienung',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'trauma_kontrolle_empfohlen',
            mode: 'toggle',
            label: 'Kontrolle geplant',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.trauma.defaultArt',
                label: 'Standard-Traumaart',
                type: 'enum',
                options: [
                    { value: 'luxation', label: 'Luxation' },
                    { value: 'fraktur', label: 'Kronen-/Wurzelfraktur' },
                    { value: 'avulsion', label: 'Avulsion' },
                ],
                mapsToAskbackId: 'medical_trauma_art',
            },
            {
                key: 'treatments.trauma.defaultSchienung',
                label: 'Standard-Schienung',
                type: 'enum',
                options: [
                    { value: 'ja', label: 'Ja' },
                    { value: 'nein', label: 'Nein' },
                ],
                mapsToAskbackId: 'medical_trauma_schienung',
            },
            {
                key: 'treatments.trauma.defaultKontrolle',
                label: 'Standard-Verlaufskontrolle',
                type: 'enum',
                options: [
                    { value: 'ja', label: 'Ja' },
                    { value: 'nein', label: 'Nein' },
                ],
                mapsToAskbackId: 'medical_trauma_kontrolle',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_trauma_art',
            'medical_trauma_schienung',
        ],
        skippableAskbacks: [
            'medical_trauma_kontrolle',
        ],
    },
    dictationHints: [
        'Traumaart dokumentieren (Luxation/Fraktur/Avulsion)',
        'Schienung ja/nein benennen',
        'Kontrollintervall bzw. Nachsorgehinweis kurz dokumentieren',
    ],
};
