/**
 * Crown prep UI contract (minimal).
 */

import type { PackUiContractV1 } from '../types';

export const crownPrepUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'praeparation',
            mode: 'toggle' as const,
            label: 'Kronenpräparation',
            group: 'relevant' as const,
            pin: true,
        },
        {
            chipId: 'abformung',
            mode: 'toggle' as const,
            label: 'Abformung',
            group: 'optional' as const,
        },
        {
            chipId: 'provisorium',
            mode: 'toggle' as const,
            label: 'Provisorium',
            group: 'optional' as const,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.crown_prep.defaultPreparation',
                label: 'Standard-Praeparation dokumentiert',
                type: 'boolean',
                mapsToAskbackId: 'crown_prep_preparation',
            },
            {
                key: 'treatments.crown_prep.defaultImpression',
                label: 'Standard-Abformung dokumentiert',
                type: 'boolean',
                mapsToAskbackId: 'crown_prep_impression',
            },
            {
                key: 'treatments.crown_prep.defaultProvisional',
                label: 'Standard-Provisorium dokumentiert',
                type: 'boolean',
                mapsToAskbackId: 'crown_prep_provisional',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'tooth',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Zahnnummer + Kronenpräparation nennen',
        'Abformung und Provisorium explizit erwähnen',
    ],
};
