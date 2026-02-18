import type { PackUiContractV1 } from '../types';

export const brueckeUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'bruecke_definitiv',
            mode: 'toggle',
            label: 'Definitive Bruecke',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'bruecke_provisorisch',
            mode: 'toggle',
            label: 'Provisorische Bruecke',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'bruecke_kontrolle',
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
                key: 'treatments.bruecke.defaultType',
                label: 'Standard-Brueckentyp',
                type: 'enum',
                options: [
                    { value: 'definitiv', label: 'Definitiv' },
                    { value: 'provisorisch', label: 'Provisorisch' },
                ],
                mapsToAskbackId: 'medical_bruecke_typ',
            },
            {
                key: 'treatments.bruecke.defaultPhase',
                label: 'Standard-Phase',
                type: 'enum',
                options: [
                    { value: 'eingliederung', label: 'Eingliederung' },
                    { value: 'kontrolle', label: 'Kontrolle/Nachjustierung' },
                ],
                mapsToAskbackId: 'medical_bruecke_phase',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_bruecke_typ',
            'medical_bruecke_phase',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Brueckentyp benennen (definitiv/provisorisch)',
        'Eingliederung dokumentieren',
        'Kontrolle/Nachjustierung bei Bedarf angeben',
    ],
};
