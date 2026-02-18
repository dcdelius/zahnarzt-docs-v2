import type { PackUiContractV1 } from '../types';

export const implantUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'implant_insertion',
            mode: 'toggle',
            label: 'Implantatinsertion',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'implant_freilegung',
            mode: 'toggle',
            label: 'Implantatfreilegung',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'implant_nachsorge',
            mode: 'toggle',
            label: 'Nachsorge dokumentiert',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.implant.defaultPhase',
                label: 'Standard-Implantatphase',
                type: 'enum',
                options: [
                    { value: 'insertion', label: 'Implantatinsertion' },
                    { value: 'freilegung', label: 'Implantatfreilegung' },
                ],
                mapsToAskbackId: 'medical_implant_phase',
            },
            {
                key: 'treatments.implant.defaultNachsorge',
                label: 'Standard-Nachsorge',
                type: 'enum',
                options: [
                    { value: 'ja', label: 'Ja' },
                    { value: 'nein', label: 'Nein' },
                ],
                mapsToAskbackId: 'medical_implant_nachsorge',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_implant_phase',
            'medical_implant_nachsorge',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Implantatphase nennen (Insertion/Freilegung)',
        'Regio/Zahnbezug dokumentieren',
        'Nachsorgehinweis kurz dokumentieren',
    ],
};
