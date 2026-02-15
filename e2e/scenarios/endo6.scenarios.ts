export type EndoScenario = {
    id: string;
    title: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    dictation: string;
    expected: {
        phase: 'output' | 'questions';
        mustIncludeAnyBillingRefs?: string[];
        mustNotIncludeBillingRefs?: string[];
        mustIncludeTextSnippets?: string[];
        mustNotIncludeTextSnippets?: string[];
        autoComplete?: boolean;
    };
};

export const ENDO_SCENARIOS: EndoScenario[] = [
    {
        id: 'E01',
        title: 'GKV Endo komplett (T3) → Output',
        insuranceType: 'GKV',
        dictation:
            'Endo Zahn 36. ViPr negativ, Perkussion negativ. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch (Apex-Locator). Gespült mit NaOCl und EDTA. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['BEMA_31', 'BEMA_12'],
            mustIncludeTextSnippets: ['Kofferdam', 'Trepanation', 'Wurzelfüllung'],
        },
    },
    {
        id: 'E02',
        title: 'PKV Endo komplett (T3) → Output (GOZ only)',
        insuranceType: 'PKV',
        dictation:
            'Wurzelbehandlung Zahn 26. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['GOZ_2360'],
            mustNotIncludeBillingRefs: ['BEMA_'],
            mustIncludeTextSnippets: ['Kofferdam', 'Trepanation', 'Wurzelfüllung'],
        },
    },
    {
        id: 'E03',
        title: 'GKV: Kein Kofferdam möglich → kein BEMA_12',
        insuranceType: 'GKV',
        dictation:
            'Endo Zahn 46. Leitungsanästhesie. Kein Kofferdam möglich (eingeschränkte Mundöffnung). Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustNotIncludeBillingRefs: ['BEMA_12'],
            mustNotIncludeTextSnippets: ['Kofferdam angelegt'],
        },
    },
    {
        id: 'E04',
        title: 'GKV: Spülung fehlt → Questions (Irrigation askback)',
        insuranceType: 'GKV',
        dictation:
            'Endo Zahn 36. Zweiter Termin. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Aufbereitung maschinell. Einlage CaOH2.',
        expected: {
            phase: 'questions',
            mustIncludeTextSnippets: ['NaOCl'],
        },
    },
    {
        id: 'E05',
        title: 'GKV: WL-Längen (18/19/20mm) erzeugen keine Phantom-Zähne',
        insuranceType: 'GKV',
        dictation:
            'Zahn 46. Zweiter Termin. Kofferdam. MB 19mm, ML 18mm, D 20mm per EAL bestimmt. 3 Kanäle aufbereitet. Gespült mit NaOCl und EDTA. Einlage CaOH2. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustNotIncludeTextSnippets: ['Zahn 18', 'Zahn 19', 'Zahn 20'],
        },
    },
    {
        id: 'E06',
        title: 'GKV: T3 Technik unklar → Questions (Obturations-Technik)',
        insuranceType: 'GKV',
        dictation:
            'Zahn 16. Dritter Termin. Kofferdam. Wurzelfüllung durchgeführt. Guttapercha mit Sealer. Röntgenkontrolle zeigt homogene Füllung.',
        expected: {
            phase: 'questions',
            mustIncludeTextSnippets: ['Warm vertikal'],
        },
    },
    {
        id: 'E07',
        title: 'GKV: T2 Baseline unvollständig → Questions (WL/Spülung)',
        insuranceType: 'GKV',
        dictation:
            'Zahn 36. Zweiter Termin Wurzelkanalbehandlung. Kofferdam angelegt. Kanäle erneut aufbereitet und gespült. Arbeitslängen überprüft. Keine Beschwerden. Neue medikamentöse Einlage mit Kalziumhydroxid. Provisorischer Verschluss.',
        expected: {
            phase: 'questions',
            autoComplete: true,
        },
    },
    {
        id: 'E08',
        title: 'GKV: T1 EAL erwähnt, WL‑Zahlen fehlen → Questions',
        insuranceType: 'GKV',
        dictation:
            'Zahn 26. Erster Termin Wurzelbehandlung. Trepanation durchgeführt. Kofferdam angelegt. Kanäle mit Apex Locator dargestellt. Gespült mit NaOCl. Einlage CaOH2.',
        expected: {
            phase: 'questions',
            autoComplete: true,
        },
    },
    {
        id: 'E09',
        title: 'GKV Endo komplett (T3) → Output (Variante)',
        insuranceType: 'GKV',
        dictation:
            'Endo Zahn 37. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült mit NaOCl und EDTA. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['BEMA_31', 'BEMA_12'],
            mustIncludeTextSnippets: ['Kofferdam', 'Trepanation', 'Wurzelfüllung'],
        },
    },
    {
        id: 'E10',
        title: 'PKV Endo komplett (T3) → Output (Variante)',
        insuranceType: 'PKV',
        dictation:
            'Wurzelbehandlung Zahn 27. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['GOZ_2360'],
            mustNotIncludeBillingRefs: ['BEMA_'],
            mustIncludeTextSnippets: ['Kofferdam', 'Trepanation', 'Wurzelfüllung'],
        },
    },
    {
        id: 'E11',
        title: 'GKV: T2 kein Kofferdam möglich → kein BEMA_12',
        insuranceType: 'GKV',
        dictation:
            'Zahn 36. Zweiter Termin. Kein Kofferdam möglich wegen Kronenrand. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. ISO 30. Maschinell aufbereitet. NaOCl + EDTA Spülung. Einlage CaOH2.',
        expected: {
            phase: 'output',
            mustNotIncludeBillingRefs: ['BEMA_12'],
            mustNotIncludeTextSnippets: ['Kofferdam angelegt'],
        },
    },
    {
        id: 'E12',
        title: 'GKV: WL vorhanden, Spülung fehlt → Questions',
        insuranceType: 'GKV',
        dictation:
            'Zahn 46. Zweiter Termin. Kofferdam. MB 19mm, ML 18mm, D 20mm per EAL bestimmt. Aufbereitung maschinell. Einlage CaOH2.',
        expected: {
            phase: 'questions',
            autoComplete: true,
        },
    },
    {
        id: 'E13',
        title: 'GKV: T1 EAL erwähnt (anderer Zahn) → Questions',
        insuranceType: 'GKV',
        dictation:
            'Zahn 24. Erster Termin Wurzelbehandlung. Trepanation durchgeführt. Kofferdam angelegt. Kanäle mit Apex Locator dargestellt. Gespült mit NaOCl. Einlage CaOH2.',
        expected: {
            phase: 'questions',
            autoComplete: true,
        },
    },
    {
        id: 'E14',
        title: 'GKV: T3 Technik unklar → Questions (Variante)',
        insuranceType: 'GKV',
        dictation:
            'Zahn 17. Dritter Termin. Kofferdam. Wurzelfüllung durchgeführt. Guttapercha mit Sealer. Röntgenkontrolle zeigt homogene Füllung.',
        expected: {
            phase: 'questions',
            mustIncludeTextSnippets: ['Warm vertikal'],
            autoComplete: true,
        },
    },
    {
        id: 'E15',
        title: 'GKV: T3 mit Röntgenkontrolle → Output',
        insuranceType: 'GKV',
        dictation:
            'Zahn 16. Dritter Termin. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal. Röntgenkontrolle durchgeführt.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['BEMA_Ä925a'],
            mustIncludeTextSnippets: ['Röntgenkontroll'],
        },
    },
    {
        id: 'E16',
        title: 'PKV: T3 mit Röntgenkontrolle → Output',
        insuranceType: 'PKV',
        dictation:
            'Zahn 25. Dritter Termin. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal. Röntgenkontrolle durchgeführt.',
        expected: {
            phase: 'output',
            mustIncludeAnyBillingRefs: ['GOZ_5000'],
            mustNotIncludeBillingRefs: ['BEMA_'],
            mustIncludeTextSnippets: ['Röntgenkontroll'],
        },
    },
];
