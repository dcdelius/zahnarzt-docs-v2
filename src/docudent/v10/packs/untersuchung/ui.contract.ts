import type { PackUiContractV1 } from '../types';

export const untersuchungUiContract: PackUiContractV1 = {
    chipControls: [
        {
            chipId: 'untersuchung_eingehend',
            mode: 'toggle',
            label: 'Eingehende Untersuchung',
            group: 'relevant',
            pin: true,
        },
        {
            chipId: 'untersuchung_befunddoku',
            mode: 'toggle',
            label: 'Befunddokumentation',
            group: 'optional',
            pin: true,
        },
    ],
    settingsSchema: {
        practice: [],
        user: [
            {
                key: 'treatments.untersuchung.defaultReason',
                label: 'Standard-Anlass',
                type: 'enum',
                options: [
                    { value: 'kontrolle', label: 'Kontrolluntersuchung' },
                    { value: 'beschwerden', label: 'Beschwerden/Abklaerung' },
                    { value: 'vorsorge', label: 'Vorsorge' },
                ],
                mapsToAskbackId: 'medical_untersuchung_anlass',
            },
            {
                key: 'treatments.untersuchung.defaultFindings',
                label: 'Standard-Befunde',
                type: 'enum',
                options: [
                    { value: 'unauffaellig', label: 'Unauffaellig' },
                    { value: 'kariesverdacht', label: 'Kariesverdaechtige Stellen' },
                    { value: 'parozeichen', label: 'Parodontale Auffaelligkeiten' },
                ],
                mapsToAskbackId: 'medical_untersuchung_befunde',
            },
            {
                key: 'treatments.untersuchung.defaultAssessment',
                label: 'Standard-Beurteilung',
                type: 'enum',
                options: [
                    { value: 'ohne_therapiebedarf', label: 'Derzeit kein Therapiebedarf' },
                    { value: 'therapiebedarf', label: 'Therapiebedarf vorhanden' },
                ],
                mapsToAskbackId: 'medical_untersuchung_beurteilung',
            },
        ],
    },
    askbackPolicy: {
        criticalAskbacks: [
            'medical_untersuchung_anlass',
            'medical_untersuchung_befunde',
            'medical_untersuchung_beurteilung',
        ],
        skippableAskbacks: [],
    },
    dictationHints: [
        'Anlass der Untersuchung nennen (z. B. Kontrolle, Beschwerden, Vorsorge)',
        'Wesentliche Befunde dokumentieren',
        'Beurteilung/Diagnose explizit nennen',
    ],
};
