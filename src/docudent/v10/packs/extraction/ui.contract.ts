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
        user: [
            {
                key: 'defaultLAType',
                label: 'Standard-LA',
                type: 'enum',
                options: [
                    { value: 'infiltration', label: 'Infiltration' },
                    { value: 'leitung', label: 'Leitung' },
                    { value: 'ila', label: 'Intraligamentär (ILA)' },
                    { value: 'none', label: 'Ohne' },
                ],
                mapsToAskbackId: 'medical_la_type',
            },
            {
                key: 'treatments.extraction.defaultWoundCare',
                label: 'Wundversorgung standardmäßig dokumentieren',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'wound_care',
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
        'Zahnnummer + Extraktion nennen',
        'Anästhesieart erwähnen (z. B. Infiltrationsanästhesie)',
        'Wundversorgung/Naht kurz erwähnen',
    ],
};
