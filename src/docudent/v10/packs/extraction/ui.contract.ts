/**
 * Extraction UI contract (minimal).
 */

import type { PackUiContractV1 } from '../types';

export const extractionUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'extraktion_einfach',
            mode: 'toggle' as const,
            label: 'Einfache Extraktion',
            group: 'relevant' as const,
            pin: true,
        },
        {
            chipId: 'la_infiltr',
            mode: 'toggle' as const,
            label: 'Infiltrationsanästhesie',
            group: 'optional' as const,
        },
        {
            chipId: 'wundversorgung',
            mode: 'toggle' as const,
            label: 'Wundversorgung',
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
        'Zahnnummer + Extraktion nennen',
        'Anästhesieart erwähnen (z. B. Infiltrationsanästhesie)',
        'Wundversorgung/Naht kurz erwähnen',
    ],
};
