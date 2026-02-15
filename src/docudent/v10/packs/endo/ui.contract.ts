/**
 * Endo UI contract (chip controls + settings schema + askback policy).
 */

import type { PackUiContractV1 } from '../types';

export const endoUiContract: PackUiContractV1 = {
    chipControls: [
        // Anesthesia (param)
        {
            chipId: 'la_type',
            mode: 'param' as const,
            label: 'Anästhesie',
            group: 'relevant' as const,
            pin: true,
            options: [
                { value: 'none', label: 'Ohne LA' },
                { value: 'infiltr', label: 'Infiltration' },
                { value: 'leitung', label: 'Leitung' },
            ],
            chipMapping: {
                'infiltr': 'la_infiltr',
                'leitung': 'la_leitung',
            },
        },
        // WL Method (param)
        {
            chipId: 'wl_method',
            mode: 'param' as const,
            label: 'Arbeitslänge',
            group: 'relevant' as const,
            pin: true,
            options: [
                { value: 'elektrisch', label: 'Elektrisch' },
                { value: 'roentgen', label: 'Röntgen' },
                { value: 'beide', label: 'Beide' },
            ],
            chipMapping: {
                'elektrisch': 'laengenmessung_elek',
                'roentgen': 'laengenmessung_roentgen',
            },
        },
        // WF Technique (param)
        {
            chipId: 'wf_technique',
            mode: 'param' as const,
            label: 'Wurzelfüllung',
            group: 'relevant' as const,
            pin: true,
            options: [
                { value: 'kalt', label: 'Kaltlateral' },
                { value: 'warm', label: 'Warm vertikal' },
                { value: 'einzel', label: 'Einzelstift' },
            ],
            chipMapping: {
                'kalt': 'wf_kalt',
                'warm': 'wf_warm',
                'einzel': 'wf_einzel',
            },
        },
        // Kofferdam (toggle)
        {
            chipId: 'kofferdam',
            mode: 'toggle' as const,
            label: 'Kofferdam',
            group: 'relevant' as const,
        },
        // Med. Einlage (toggle)
        {
            chipId: 'med_einlage',
            mode: 'toggle' as const,
            label: 'Med. Einlage',
            group: 'optional' as const,
        },
        // NaOCl irrigation (toggle)
        {
            chipId: 'spuelung_naocl',
            mode: 'toggle' as const,
            label: 'NaOCl Spülung',
            group: 'optional' as const,
        },
        // EDTA (toggle)
        {
            chipId: 'spuelung_edta',
            mode: 'toggle' as const,
            label: 'EDTA Spülung',
            group: 'optional' as const,
        },
    ],

    settingsSchema: {
        practice: [
            {
                key: 'defaultWLMethod',
                label: 'Standard-Arbeitslänge (Praxis)',
                type: 'enum',
                options: [
                    { value: 'elektrisch', label: 'Elektrisch' },
                    { value: 'roentgen', label: 'Röntgen' },
                    { value: 'both', label: 'Beide' },
                ],
                mapsToAskbackId: 'medical_wl_method',
            },
            {
                key: 'defaultWFTechnique',
                label: 'Standard-WF-Technik (Praxis)',
                type: 'enum',
                options: [
                    { value: 'kalt', label: 'Kaltlateral' },
                    { value: 'warm', label: 'Warm vertikal' },
                    { value: 'einzel', label: 'Einzelstift' },
                ],
                mapsToAskbackId: 'medical_wf_technique',
            },
            {
                key: 'defaultIrrigationProtocol',
                label: 'Standard-Spülprotokoll (Praxis)',
                type: 'enum',
                options: [
                    { value: 'naocl_edta', label: 'NaOCl + EDTA' },
                    { value: 'naocl_only', label: 'Nur NaOCl' },
                    { value: 'none', label: 'Keine' },
                ],
                mapsToAskbackId: 'medical_irrigation',
            },
            {
                key: 'defaultEinlage',
                label: 'Standard-Einlage (Praxis)',
                type: 'enum',
                options: [
                    { value: 'none', label: 'Keine' },
                    { value: 'caoh2', label: 'Ca(OH)2' },
                ],
                mapsToAskbackId: 'endo_medication',
            },
            {
                key: 'defaultCanalCount',
                label: 'Standard-Kanalanzahl (Praxis)',
                type: 'enum',
                options: [
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                ],
                mapsToAskbackId: 'endo_canal_count',
            },
        ],
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
                key: 'defaultIsolation',
                label: 'Standard-Isolation',
                type: 'enum',
                options: [
                    { value: 'kofferdam', label: 'Kofferdam' },
                    { value: 'relative', label: 'Relative Trockenlegung (Watterollen)' },
                    { value: 'none', label: 'Keine' },
                ],
                mapsToAskbackId: 'medical_isolation',
            },
            {
                key: 'treatments.endo.defaultWLMethod',
                label: 'Standard-Arbeitslänge (persönlich)',
                type: 'enum',
                options: [
                    { value: 'elektrisch', label: 'Elektrisch' },
                    { value: 'roentgen', label: 'Röntgen' },
                    { value: 'both', label: 'Beide' },
                ],
                mapsToAskbackId: 'medical_wl_method',
            },
            {
                key: 'treatments.endo.defaultWFTechnique',
                label: 'Standard-WF-Technik (persönlich)',
                type: 'enum',
                options: [
                    { value: 'kalt', label: 'Kaltlateral' },
                    { value: 'warm', label: 'Warm vertikal' },
                    { value: 'einzel', label: 'Einzelstift' },
                ],
                mapsToAskbackId: 'medical_wf_technique',
            },
            {
                key: 'treatments.endo.defaultIrrigationProtocol',
                label: 'Standard-Spülprotokoll (persönlich)',
                type: 'enum',
                options: [
                    { value: 'naocl_edta', label: 'NaOCl + EDTA' },
                    { value: 'naocl_only', label: 'Nur NaOCl' },
                    { value: 'none', label: 'Keine' },
                ],
                mapsToAskbackId: 'medical_irrigation',
            },
            {
                key: 'treatments.endo.defaultInstrumentationMode',
                label: 'Standard-Aufbereitung (persönlich)',
                type: 'enum',
                options: [
                    { value: 'rotary', label: 'Maschinell (rotierend)' },
                    { value: 'manual', label: 'Manuell' },
                ],
            },
            {
                key: 'treatments.endo.defaultSealer',
                label: 'Standard-Sealer (persönlich)',
                type: 'boolean',
            },
            {
                key: 'treatments.endo.defaultEinlage',
                label: 'Standard-Einlage (persönlich)',
                type: 'enum',
                options: [
                    { value: 'none', label: 'Keine' },
                    { value: 'caoh2', label: 'Ca(OH)2' },
                ],
                mapsToAskbackId: 'endo_medication',
            },
            {
                key: 'treatments.endo.defaultCanalCount',
                label: 'Standard-Kanalanzahl (persönlich)',
                type: 'enum',
                options: [
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                ],
                mapsToAskbackId: 'endo_canal_count',
            },
        ],
    },

    askbackPolicy: {
        criticalAskbacks: [
            'endo_tooth',
            'medical_vipr',
        ],
        skippableAskbacks: [
            'medical_la_type',
            'medical_wl_method',
            'medical_wf_technique',
            'medical_isolation',
            'medical_irrigation',
            'endo_medication',
            'endo_canal_count',
        ],
    },

    dictationHints: [
        'Sag \"Endo an 14 ... danach Füllung ...\" für Multi-Behandlung',
        'Anzahl Kanäle explizit nennen: \"3 Kanäle\"',
    ],
};
