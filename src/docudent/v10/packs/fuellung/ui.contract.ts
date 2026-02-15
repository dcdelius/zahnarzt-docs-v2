/**
 * Fuellung UI contract (chip controls + settings schema + askback policy).
 */

import type { PackUiContractV1 } from '../types';

export const fuellungUiContract: PackUiContractV1 = {
    chipControls: [
        // Anesthesia (param control)
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
        // Isolation (toggle)
        {
            chipId: 'kofferdam',
            mode: 'toggle' as const,
            label: 'Kofferdam',
            group: 'relevant' as const,
        },
        // Capping (param)
        {
            chipId: 'ueberkappung',
            mode: 'param' as const,
            label: 'Überkappung',
            group: 'optional' as const,
            options: [
                { value: 'none', label: 'Keine' },
                { value: 'direkt', label: 'Direkt (P)' },
                { value: 'indirekt', label: 'Indirekt (Cp)' },
            ],
            chipMapping: {
                'direkt': 'p',
                'indirekt': 'cp',
            },
        },
        // Fluoride (toggle)
        {
            chipId: 'fluor',
            mode: 'toggle' as const,
            label: 'Fluoridierung',
            group: 'optional' as const,
        },
        // Material (toggle - mostecute Mehrschicht)
        {
            chipId: 'mehrschicht',
            mode: 'toggle' as const,
            label: 'Mehrschicht',
            group: 'advanced' as const,
        },
        // Documentation (toggle)
        {
            chipId: 'doc_aufklaerung',
            mode: 'toggle' as const,
            label: 'Aufklärung erfolgt',
            group: 'optional' as const,
        },
        {
            chipId: 'doc_alternativen',
            mode: 'toggle' as const,
            label: 'Alternativen besprochen',
            group: 'optional' as const,
        },
        {
            chipId: 'doc_risiken',
            mode: 'toggle' as const,
            label: 'Risiken besprochen',
            group: 'optional' as const,
        },
        {
            chipId: 'doc_einverstaendnis',
            mode: 'toggle' as const,
            label: 'Einverständnis eingeholt',
            group: 'optional' as const,
        },
        {
            chipId: 'doc_okklusion',
            mode: 'toggle' as const,
            label: 'Okklusion kontrolliert',
            group: 'advanced' as const,
        },
        {
            chipId: 'doc_politur',
            mode: 'toggle' as const,
            label: 'Politur/Finierung',
            group: 'advanced' as const,
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
                key: 'defaultCappingMaterial',
                label: 'Standard-Überkappung',
                type: 'enum',
                options: [
                    { value: 'caoh2', label: 'Ca(OH)2' },
                    { value: 'mta', label: 'MTA' },
                    { value: 'biodentin', label: 'Biodentin' },
                ],
                mapsToAskbackId: 'medical_ueberkappung_material',
            },
            {
                key: 'defaultHasMKV',
                label: 'MKV als Default',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'medical_mkv_confirmed',
            },
            {
                key: 'treatments.fuellung.defaultHasMKV',
                label: 'MKV Default (Füllung)',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'medical_mkv_confirmed',
            },
            {
                key: 'treatments.fuellung.defaultAdhesiv',
                label: 'Standard-Adhäsivtechnik (persönlich)',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'fuellung_adhesive',
            },
            {
                key: 'treatments.fuellung.defaultAdhesiv',
                label: 'Standard-Adhäsivtechnik (Askback)',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'askback-adhesive-technique',
            },
            {
                key: 'treatments.fuellung.defaultSchichtung',
                label: 'Standard-Schichtung (persönlich)',
                type: 'enum',
                options: [
                    { value: 'mehrschicht', label: 'Mehrschicht' },
                    { value: 'bulk', label: 'Bulk / einfach' },
                ],
                mapsToAskbackId: 'fuellung_layering',
            },
            {
                key: 'treatments.fuellung.defaultKeilUsed',
                label: 'Standard-Keil (persönlich)',
                type: 'boolean',
            },
            {
                key: 'treatments.fuellung.defaultKontaktpunktCheck',
                label: 'Standard-Kontaktpunktprüfung (persönlich)',
                type: 'boolean',
            },
            {
                key: 'treatments.fuellung.defaultUeberkappung',
                label: 'Standard-Überkappung (Cp/P/keine)',
                type: 'enum',
                options: [
                    { value: 'indirekt', label: 'Indirekt (Cp)' },
                    { value: 'direkt', label: 'Direkt (P)' },
                    { value: 'keine', label: 'Keine' },
                ],
                mapsToAskbackId: 'askback-ueberkappung',
            },
            {
                key: 'treatments.fuellung.defaultPulpaschutz',
                label: 'Standard-Pulpaschutz (Cp/P/keine)',
                type: 'enum',
                options: [
                    { value: 'indirekt', label: 'Indirekt (Cp)' },
                    { value: 'direkt', label: 'Direkt (P)' },
                    { value: 'keine', label: 'Keine' },
                ],
                mapsToAskbackId: 'askback-pulpaschutz',
            },
            {
                key: 'treatments.fuellung.defaultHemostasis',
                label: 'Standard-Hämostase',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'askback-hemostasis',
            },
            {
                key: 'treatments.fuellung.defaultSensitivityFollowup',
                label: 'Standard-Kontrolle bei Überempfindlichkeit',
                type: 'enum',
                options: [
                    { value: 'yes', label: 'Ja' },
                    { value: 'no', label: 'Nein' },
                ],
                mapsToAskbackId: 'askback-sensitivity-followup',
            },
            {
                key: 'defaultIsolation',
                label: 'Kofferdam (ja/nein)',
                type: 'enum',
                options: [
                    { value: 'kofferdam', label: 'Ja (Kofferdam)' },
                    { value: 'relative', label: 'Nein (relative)' },
                    { value: 'none', label: 'Nein (keine)' },
                ],
                mapsToAskbackId: 'askback-kofferdam',
            },
            {
                key: 'treatments.fuellung.defaultMkvJustification',
                label: 'Standard-MKV-Begründung',
                type: 'enum',
                options: [
                    { value: 'mehrschicht', label: 'Mehrschicht (adhäsiv)' },
                    { value: 'adhesiv', label: 'Adhäsivtechnik' },
                    { value: 'aesthetik', label: 'Ästhetik / Materialwahl' },
                    { value: 'keine', label: 'Keine (nur Kasse)' },
                ],
                mapsToAskbackId: 'askback-mkv-justification',
            },
            {
                key: 'treatments.fuellung.defaultCompositeMaterialId',
                label: 'Standard-Komposit (Material)',
                type: 'enum',
                options: [
                    { value: 'komposit', label: 'Komposit' },
                    { value: 'giz', label: 'Glasionomer' },
                ],
                mapsToAskbackId: 'fuellung_material',
            },
            {
                key: 'treatments.fuellung.defaultBulkMaterialId',
                label: 'Standard-Bulk (Material)',
                type: 'enum',
                options: [
                    { value: 'komposit', label: 'Komposit' },
                    { value: 'giz', label: 'Glasionomer' },
                ],
                mapsToAskbackId: 'fuellung_material',
            },
            {
                key: 'treatments.fuellung.defaultFlowableMaterialId',
                label: 'Standard-Flowable (Material)',
                type: 'enum',
                options: [
                    { value: 'komposit', label: 'Komposit' },
                    { value: 'giz', label: 'Glasionomer' },
                ],
                mapsToAskbackId: 'fuellung_material',
            },
        ],
    },

    askbackPolicy: {
        criticalAskbacks: [
            'fuellung_tooth',
            'fuellung_surface',
            'medical_vipr',
        ],
        skippableAskbacks: [
            'medical_la_type',
            'medical_isolation',
            'medical_ueberkappung',
            'medical_ueberkappung_material',
            'medical_material',
            'medical_mkv_confirmed',
            'fuellung_material',
            'fuellung_layering',
            'fuellung_adhesive',
        ],
    },

    dictationHints: [
        'Bei mehreren Behandlungen: sag "danach" oder "zusätzlich"',
        'Für tiefe Karies: sag "profunda" oder "tief"',
    ],
};
