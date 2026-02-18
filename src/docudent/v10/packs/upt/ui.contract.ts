import type { PackUiContractV1 } from '../types';

export const uptUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'upt_grad_a',
            mode: 'toggle',
            label: 'UPT Grad A',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'upt_grad_b',
            mode: 'toggle',
            label: 'UPT Grad B',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'upt_grad_c',
            mode: 'toggle',
            label: 'UPT Grad C',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'upt_recall_dokumentiert',
            mode: 'toggle',
            label: 'Recall dokumentiert',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.upt.defaultGrade',
                label: 'Standard-UPT-Grad',
                type: 'enum',
                options: [
                    { value: 'a', label: 'Grad A' },
                    { value: 'b', label: 'Grad B' },
                    { value: 'c', label: 'Grad C' },
                ],
                mapsToAskbackId: 'medical_upt_grad',
            },
            {
                key: 'treatments.upt.defaultInterval',
                label: 'Standard-Recallintervall',
                type: 'string',
                mapsToAskbackId: 'medical_upt_intervall',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_upt_grad',
            'medical_upt_intervall',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'UPT-Grad (A/B/C) nennen',
        'Recallintervall dokumentieren',
        'Parodontalen Nachsorgekontext kurz nennen',
    ],
};
