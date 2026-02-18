import type { PackUiContractV1 } from '../types';

export const parodontologieUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'parodontologie_status',
            mode: 'toggle',
            label: 'Parodontalstatus',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'parodontologie_ait',
            mode: 'toggle',
            label: 'AIT',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'parodontologie_upt_a',
            mode: 'toggle',
            label: 'UPT A',
            group: 'optional',
            pin: true,
        },
        {
            chipId: 'parodontologie_upt_b',
            mode: 'toggle',
            label: 'UPT B',
            group: 'optional',
            pin: true,
        },
        {
            chipId: 'parodontologie_upt_c',
            mode: 'toggle',
            label: 'UPT C',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.parodontologie.defaultPhase',
                label: 'Standard-PAR-Phase',
                type: 'enum',
                options: [
                    { value: 'status', label: 'Status' },
                    { value: 'ait', label: 'AIT' },
                    { value: 'upt', label: 'UPT' },
                ],
                mapsToAskbackId: 'medical_parodontologie_phase',
            },
            {
                key: 'treatments.parodontologie.defaultUptGrade',
                label: 'Standard-UPT-Grad',
                type: 'enum',
                options: [
                    { value: 'a', label: 'Grad A' },
                    { value: 'b', label: 'Grad B' },
                    { value: 'c', label: 'Grad C' },
                ],
                mapsToAskbackId: 'medical_parodontologie_upt_grad',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_parodontologie_phase',
            'medical_parodontologie_upt_grad',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'PAR-Phase dokumentieren (Status, AIT oder UPT)',
        'Bei UPT den Grad (A/B/C) nennen',
        'Befund- und Recallbezug kurz angeben',
    ],
};
