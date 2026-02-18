import type { PackUiContractV1 } from '../types';

export const schieneUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'schiene_okklusionsschiene',
            mode: 'toggle',
            label: 'Okklusionsschiene',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'schiene_protrusionsschiene',
            mode: 'toggle',
            label: 'Protrusionsschiene',
            group: 'relevant',
            pin: false,
        },
        {
            chipId: 'schiene_kontrolle',
            mode: 'toggle',
            label: 'Kontrolle/Nachadjustierung',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.schiene.defaultType',
                label: 'Standard-Schienentyp',
                type: 'enum',
                options: [
                    { value: 'okklusionsschiene', label: 'Okklusionsschiene' },
                    { value: 'protrusionsschiene', label: 'Protrusionsschiene' },
                ],
                mapsToAskbackId: 'medical_schiene_typ',
            },
            {
                key: 'treatments.schiene.defaultPhase',
                label: 'Standard-Leistungsphase',
                type: 'enum',
                options: [
                    { value: 'eingliederung', label: 'Eingliederung' },
                    { value: 'kontrolle', label: 'Kontrolle/Nachadjustierung' },
                ],
                mapsToAskbackId: 'medical_schiene_phase',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_schiene_typ',
            'medical_schiene_phase',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Schienentyp benennen (Okklusions-/Protrusionsschiene)',
        'Eingliederung oder Kontrolle kurz dokumentieren',
        'Anpassung/Tragehinweise bei Bedarf angeben',
    ],
};
