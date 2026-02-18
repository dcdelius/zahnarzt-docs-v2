import type { PackUiContractV1 } from '../types';

export const roentgenUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'roentgen_typ',
            mode: 'param',
            label: 'Roentgen-Typ',
            group: 'relevant',
            pin: true,
            options: [
                { value: 'einzelzahn', label: 'Einzelzahnaufnahme' },
                { value: 'opg', label: 'OPG' },
            ],
            chipMapping: {
                einzelzahn: 'roentgen_einzelzahn',
                opg: 'roentgen_opg',
            },
        },
        {
            chipId: 'roentgen_befundung',
            mode: 'toggle',
            label: 'Befundung dokumentiert',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [
            {
                key: 'defaultRoentgenPolicy',
                label: 'Roentgen-Policy',
                type: 'enum',
                options: [
                    { value: 'always', label: 'Immer' },
                    { value: 'on_indication', label: 'Nach Indikation' },
                    { value: 'never', label: 'Nie' },
                ],
            },
        ],
        user: [
            {
                key: 'treatments.roentgen.defaultType',
                label: 'Standard-Roentgen-Typ',
                type: 'enum',
                options: [
                    { value: 'einzelzahn', label: 'Einzelzahnaufnahme' },
                    { value: 'opg', label: 'OPG' },
                ],
                mapsToAskbackId: 'medical_roentgen_typ',
            },
            {
                key: 'treatments.roentgen.defaultIndication',
                label: 'Standard-Indikation',
                type: 'enum',
                options: [
                    { value: 'diagnostik', label: 'Diagnostik/Abklaerung' },
                    { value: 'kontrolle', label: 'Therapiekontrolle' },
                    { value: 'planung', label: 'Therapieplanung' },
                ],
                mapsToAskbackId: 'medical_roentgen_indikation',
            },
            {
                key: 'treatments.roentgen.defaultTiming',
                label: 'Standard-Zeitpunkt',
                type: 'string',
                mapsToAskbackId: 'medical_roentgen_zeitpunkt',
            },
            {
                key: 'treatments.roentgen.defaultFindings',
                label: 'Standard-Befund',
                type: 'enum',
                options: [
                    { value: 'unauffaellig', label: 'Unauffaellig' },
                    { value: 'kariologische_befunde', label: 'Kariologische Befunde' },
                    { value: 'apikale_auffaelligkeit', label: 'Apikale Auffaelligkeit' },
                ],
                mapsToAskbackId: 'medical_roentgen_befund',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_roentgen_indikation',
            'medical_roentgen_typ',
            'medical_roentgen_zeitpunkt',
            'medical_roentgen_befund',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Roentgen-Typ nennen (Einzelzahnaufnahme oder OPG)',
        'Indikation dokumentieren (z. B. Diagnostik, Kontrolle, Planung)',
        'Befund knapp und nachvollziehbar nennen',
    ],
};
