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
        user: [],
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
