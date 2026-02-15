/**
 * Real Case Fixtures for V7 E2E Tests
 * 
 * 20 realistic German dentistry dictations (NO PATIENT IDENTITY DATA):
 * - 10 Füllung cases
 * - 10 Endo cases
 * 
 * Each fixture defines expected assertions for medical/billing correctness.
 */

export interface RealCaseFixture {
    id: string;
    treatmentId: 'fuellung' | 'endo';
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    dictation: string;
    expected: {
        mustContain: string[];
        mustNotContain: string[];
        expectedTooth?: string;
        expectedSections?: string[];
        expectedBilling?: {
            mustIncludeCodes?: string[];
            mustExcludeCodes?: string[];
            allowEmptyOnlyIfReason?: string[];
        };
        requiredQuestions?: string[];
    };
    /** Optional: pre-defined answers for deterministic testing */
    answers?: Record<string, string | number | boolean>;
    /** Optional: skip this fixture (known bugs) */
    skip?: string;
    /** P12.8c: Expect pipeline to return unsupported state with this reason */
    expectUnsupported?: string;
}

// ═══════════════════════════════════════════════════════════════
// FÜLLUNG CASES (10)
// ═══════════════════════════════════════════════════════════════

export const FUELLUNG_FIXTURES: RealCaseFixture[] = [
    {
        id: 'F01_standard_gkv',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 14 mesial kariös. Lokalanästhesie mit Ultracain. Trockenlegung mittels Watterollen. Karies exkaviert, Kavität präpariert. Komposit eingebracht, ausgehärtet, ausgearbeitet und poliert.',
        expected: {
            mustContain: ['14', 'Komposit'],
            mustNotContain: ['Trepanation', 'Wurzelkanal', 'NaOCl', 'Obturation'],
            expectedTooth: '14',
        },
    },
    {
        id: 'F02_mod_kofferdam',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 36, mod Karies. Infiltrationsanästhesie. Kofferdam angelegt. Karies vollständig entfernt. Adhäsivtechnik, Mehrschichtkomposit, Lichthärtung, Politur abschließend.',
        expected: {
            mustContain: ['36', 'm,o,d', 'Kofferdam'],
            mustNotContain: ['Vitalexstirpation', 'Kanalaufbereitung'],
            expectedTooth: '36',
        },
    },
    {
        id: 'F03_pkv_ästhetik',
        treatmentId: 'fuellung',
        insuranceType: 'PKV',
        hasMKV: false,
        dictation: 'Zahn 11 palatinal insuffiziente Füllung. Alte Füllung entfernt. Aufbaufüllung mit Komposit. Feinpolitur für optimale Ästhetik.',
        expected: {
            mustContain: ['11', 'Komposit'],
            mustNotContain: ['Wurzelbehandlung', 'medikamentöse Einlage'],
            expectedTooth: '11',
        },
    },
    {
        id: 'F04_mkv_aufklärung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: true,
        dictation: 'Zahn 24 distal Karies. Aufklärung über Mehrkostenvereinbarung erfolgt. Komposit-Restauration, Adhäsivtechnik mit Phosphorsäure-Ätzung. Schichttechnik, Politur.',
        expected: {
            mustContain: ['24', 'Komposit'],
            mustNotContain: ['Trepanation', 'Spülung NaOCl'],
            expectedTooth: '24',
        },
    },
    {
        id: 'F05_multiple_surfaces',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 46 mesial-okklusal-distal kariös. Anästhesie. Karies exkaviert. Matrize und Keil gelegt. Unterfüllung mit Glasionomerzement. Deckfüllung Komposit. Ausarbeitung.',
        expected: {
            mustContain: ['46', 'm,o,d'],
            mustNotContain: ['Wurzelfüllung', 'apikale'],
            expectedTooth: '46',
        },
    },
    {
        id: 'F06_frontzahn',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 21 mesiale Karies III. Lokalanästhesie. Schmelz-Dentin-Adhäsiv. Flow-Komposit als Liner. Schichttechnik mit pastösem Komposit. Hochglanzpolitur.',
        expected: {
            mustContain: ['21', 'Komposit'],
            mustNotContain: ['Kanalaufbereitung', 'Obturation'],
            expectedTooth: '21',
        },
    },
    {
        id: 'F07_tiefe_karies',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 16 okklusal tiefe Karies pulpanah. Indirekte Überkappung mit Kalziumhydroxid. Unterfüllung Glasionomerzement. Deckfüllung Komposit. Sensibilität erhalten.',
        expected: {
            mustContain: ['16', 'Komposit'],
            mustNotContain: ['Wurzelkanal', 'Trepanation'],
            expectedTooth: '16',
        },
    },
    {
        id: 'F08_minimalinvasiv',
        treatmentId: 'fuellung',
        insuranceType: 'PKV',
        hasMKV: false,
        dictation: 'Zahn 25 approximal Karies. Minimalinvasive Präparation. Schmelzrandanschrägung. Selektive Schmelzätzung. Universaladhäsiv. Nanohybrid-Komposit. Konturierung, Politur.',
        expected: {
            mustContain: ['25', 'Komposit'],
            mustNotContain: ['Vitalexstirpation', 'Spülung'],
            expectedTooth: '25',
        },
    },
    {
        id: 'F09_sekundärkaries',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: true,
        dictation: 'Zahn 37 okklusale Sekundärkaries an alter Amalgamfüllung. Amalgam vollständig entfernt mit Kofferdam-Schutz. Neue Kompositrestauration in Adhäsivtechnik. MKV unterschrieben.',
        expected: {
            mustContain: ['37', 'Komposit'],
            mustNotContain: ['NaOCl', 'Wurzelbehandlung'],
            expectedTooth: '37',
        },
    },
    {
        id: 'F10_milchzahn',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 84 mesiale Karies. Lokalanästhesie. Exkavation. Glasionomerzement-Restauration aufgrund des geplanten Zahnwechsels.',
        expected: {
            mustContain: ['84'],
            mustNotContain: ['Wurzelkanal', 'Obturation'],
            expectedTooth: '84',
        },
        // P12.8c: Changed from skip to expectUnsupported - now properly handled
        expectUnsupported: 'milchzahn',
    },
];

// ═══════════════════════════════════════════════════════════════
// ENDO CASES (10)
// ═══════════════════════════════════════════════════════════════

export const ENDO_FIXTURES: RealCaseFixture[] = [
    {
        id: 'E01_trepanation_t1',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 46 mit irreversibler Pulpitis. Trepanation durchgeführt. Pulpa eröffnet. Spülung mit NaOCl 3%. Provisorischer Verschluss mit Cavit.',
        expected: {
            mustContain: ['46'],
            mustNotContain: ['Komposit', 'Mehrschichttechnik', 'Politur'],
            expectedTooth: '46',
            requiredQuestions: ['endo_step', 'canal_count'],
        },
    },
    {
        id: 'E02_aufbereitung_t2',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 36 Fortsetzung Wurzelbehandlung. 3 Kanäle dargestellt. Arbeitslänge elektrometrisch bestimmt. Aufbereitung mit NiTi-Feilen bis ISO 35. Spülung NaOCl und EDTA. Medikamentöse Einlage Kalziumhydroxid.',
        expected: {
            mustContain: ['36'],
            mustNotContain: ['Matrize', 'Adhäsivtechnik'],
            expectedTooth: '36',
        },
    },
    {
        id: 'E03_wurzelfüllung_t3',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 26 Wurzelfüllung. 3 Kanäle trocken und beschwerdefrei. Obturation mit Guttapercha und Sealer in Warmfülltechnik. Röntgenkontrolle zeigt suffiziente Füllung. Provisorischer Verschluss.',
        expected: {
            mustContain: ['26'],
            mustNotContain: ['Komposit', 'Mehrschichttechnik'],
            expectedTooth: '26',
        },
    },
    {
        id: 'E04_apikale_parodontitis',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 16 apikale Parodontitis röntgenologisch bestätigt. Vitalexstirpation. 4 Kanäle dargestellt (mb1, mb2, db, p). Arbeitslänge mit Apexlocator. Initiale Aufbereitung. Einlage CaOH.',
        expected: {
            mustContain: ['16'],
            mustNotContain: ['Politur', 'Matrize'],
            expectedTooth: '16',
            requiredQuestions: ['canal_count'],
        },
    },
    {
        id: 'E05_revision',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 21 Revision insuffiziente Wurzelfüllung. Alte Guttapercha entfernt. 1 Kanal revidiert. Spülung NaOCl. Neue medikamentöse Einlage.',
        expected: {
            mustContain: ['21'],
            mustNotContain: ['Mehrschichttechnik', 'Kofferdam'],
            expectedTooth: '21',
        },
    },
    {
        id: 'E06_pkv_maschinell',
        treatmentId: 'endo',
        insuranceType: 'PKV',
        hasMKV: false,
        dictation: 'Zahn 14 irreversible Pulpitis. Maschinelle Aufbereitung mit Reziprok-System. 1 Kanal. Ultraschallaktivierte Spülung. Thermoplastische Obturation geplant.',
        expected: {
            mustContain: ['14'],
            mustNotContain: ['Matrize', 'Adhäsiv'],
            expectedTooth: '14',
        },
    },
    {
        id: 'E07_molares_behandlung',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 47 Pulpanekrose nach Trauma. Trepanation unter Kofferdam. 2 Kanäle (m, d) identifiziert. Arbeitslänge röntgenologisch. Aufbereitung Step-back. NaOCl 5.25%.',
        expected: {
            mustContain: ['47'],
            mustNotContain: ['Komposit', 'Politur'],
            expectedTooth: '47',
        },
    },
    {
        id: 'E08_inzisivus',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 11 avital nach Trauma. Wurzelbehandlung. 1 Kanal, weiter Kanal. Arbeitslänge elektrometrisch. Aufbereitung bis ISO 50. Spülung. Medikamentöse Einlage.',
        expected: {
            mustContain: ['11'],
            mustNotContain: ['mod', 'Matrize'],
            expectedTooth: '11',
        },
    },
    {
        id: 'E09_praemolar_pkv',
        treatmentId: 'endo',
        insuranceType: 'PKV',
        hasMKV: false,
        dictation: 'Zahn 24 akute Pulpitis. Notfall-Trepanation. 2 Kanäle (b, p) sondiert. Initiale Aufbereitung. Spülung. Schmerzmedikation. Termin zur Weiterbehandlung vereinbart.',
        expected: {
            mustContain: ['24'],
            mustNotContain: ['Komposit', 'Mehrschichttechnik'],
            expectedTooth: '24',
        },
    },
    {
        id: 'E10_abschluss_obturation',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 46 Abschluss Wurzelbehandlung. Patient beschwerdefrei. 3 Kanäle trocken. Wurzelfüllung mit Guttapercha laterale Kondensation. Röntgenkontrolle unauffällig. Aufbaufüllung folgt separat.',
        expected: {
            mustContain: ['46'],
            mustNotContain: ['Adhäsiv', 'Politur'],
            expectedTooth: '46',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════════════════════

export const ALL_FIXTURES: RealCaseFixture[] = [
    ...FUELLUNG_FIXTURES,
    ...ENDO_FIXTURES,
];

export default ALL_FIXTURES;
