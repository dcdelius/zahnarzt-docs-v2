/**
 * PZR UI contract (minimal).
 */

import type { PackUiContractV1 } from '../types';

export const pzrUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'pzr_vollstaendig',
            mode: 'toggle' as const,
            label: 'PZR vollständig',
            group: 'relevant' as const,
            pin: true,
        },
        {
            chipId: 'zahnstein_entfernung',
            mode: 'toggle' as const,
            label: 'Zahnsteinentfernung',
            group: 'optional' as const,
        },
        {
            chipId: 'fluoridierung',
            mode: 'toggle' as const,
            label: 'Fluoridierung',
            group: 'optional' as const,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.pzr.defaultZahnsteinEntfernung',
                label: 'Zahnsteinentfernung standardmaessig dokumentieren',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'pzr_zahnstein',
            },
            {
                key: 'treatments.pzr.defaultFluoridation',
                label: 'Fluoridierung standardmaessig dokumentieren',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'pzr_fluoridation',
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
        'PZR explizit nennen (z. B. „PZR vollständig“)',
        'Zahnstein/Beläge entfernt + Politur erwähnen',
        'Fluoridierung erwähnen, wenn durchgeführt',
    ],
};
