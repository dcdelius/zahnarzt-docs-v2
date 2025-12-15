/**
 * Wiederherstellungen Verified Case Pack v1
 * 
 * 12 real-world Wiederherstellungen/Erweiterungen cases with evidence pointers
 * from the official KZV Handbuch Wiederherstellungen PDF.
 * 
 * Coverage: FZ 2.7, 6.1, 6.2, 6.3, 6.5, 6.5.1
 * Source: KZVH/KZVN (KZV), Wiederherstellungen – 3. Auflage 2014
 * 
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL SOURCE (Verified 2025-12-14)
 * ═══════════════════════════════════════════════════════════════
 * PDF: https://www.kzv-berlin.de/fileadmin/user_upload_kzv/Praxis-Service/1_Abrechnung/2_Zahnersatz/Handbuch_Wiederherstellungen.pdf
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PdfEvidence {
    /** URL to the PDF source document */
    url: string;
    /** Page number in the PDF (1-indexed) */
    page: number;
    /** Exact text excerpt showing the codes (from PDF) */
    excerpt: string;
}

export interface WiederherstellungFixture {
    /** Unique case identifier: WDH-{section}.{number} */
    id: string;
    /** Title of the case scenario */
    title: string;
    /** 1-2 line scenario description */
    scenario: string;
    /** FZ codes for this case */
    fz_codes: string[];
    /** Expected BEMA codes */
    bema_codes: string[];
    /** Expected GOZ codes (if applicable) */
    goz_codes?: string[];
    /** Expected BEL-II codes */
    bel_ii_codes: string[];
    /** Evidence from primary source */
    evidence: {
        pdf: PdfEvidence;
    };
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL SOURCE URL (Verified 2025-12-14)
// ═══════════════════════════════════════════════════════════════

/** The ONE canonical PDF source for all Wiederherstellungen cases */
export const CANONICAL_PDF_URL =
    'https://www.kzv-berlin.de/fileadmin/user_upload_kzv/Praxis-Service/1_Abrechnung/2_Zahnersatz/Handbuch_Wiederherstellungen.pdf';

export const SOURCE_META = {
    publisher: 'KZVH/KZVN (KZV), Wiederherstellungen – 3. Auflage 2014',
    extracted_on: '2025-12-14',
    notes: 'All cases are copied as structured fixtures from the PDF text. Page numbers are 1-indexed as shown in the PDF.',
};

// ═══════════════════════════════════════════════════════════════
// VERIFIED FIXTURES (12 cases)
// ═══════════════════════════════════════════════════════════════

export const WIEDERHERSTELLUNGEN_CASES_V1: WiederherstellungFixture[] = [
    // ───────────────────────────────────────────────────────────
    // SECTION 1: Brücken-Wiederherstellungen (FZ 2.7)
    // ───────────────────────────────────────────────────────────
    {
        id: 'WDH-1.17',
        title: 'Erneuerung eines Brückengliedes (Keramikverblendung)',
        scenario: 'Keramikverblendung eines Brückengliedes muss erneuert werden. Reparatur erfolgt mit BEMA 98e plus Brückenglied BEMA 93.',
        fz_codes: ['FZ_2.7'],
        bema_codes: ['BEMA_98e', 'BEMA_93'],
        bel_ii_codes: ['BEL_II_1220', 'BEL_II_8010', 'BEL_II_8030'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 35,
                excerpt: '1.17 Erneuerung eines Brückengliedes (Keramikverblendung) ... FZ 2.7 ... BEMA 98e Reparatur einer prothetischen Versorgung ... BEMA 93 Brückenglied ... BEL II 122 0 ... 801 0 ... 803 0 ...',
            },
        },
    },

    {
        id: 'WDH-1.18.1',
        title: 'Wiederherstellung eines Verblendbereiches (Keramikverblendung)',
        scenario: 'Verblendbereich einer Brücke muss repariert werden. Keramik-Wiederherstellung mit BEMA 98e und 89 Zuschlag.',
        fz_codes: ['FZ_2.7'],
        bema_codes: ['BEMA_98e', 'BEMA_89'],
        bel_ii_codes: ['BEL_II_1220', 'BEL_II_8010'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 36,
                excerpt: '1.18.1 Wiederherstellung eines Verblendbereiches (Keramikverblendung) ... FZ 2.7 ... BEMA 98e ... BEMA 89 Zuschlag ... BEL II 122 0 ... 801 0 ...',
            },
        },
    },

    {
        id: 'WDH-1.18.2',
        title: 'Wiederherstellung der Funktion einer Brücke (Lötstellen)',
        scenario: 'Lötstellen einer Brücke müssen repariert werden. Technische Wiederherstellung mit Löt-Leistungen.',
        fz_codes: ['FZ_2.7'],
        bema_codes: ['BEMA_98e', 'BEMA_89'],
        bel_ii_codes: ['BEL_II_3010', 'BEL_II_8010', 'BEL_II_8070'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 37,
                excerpt: '1.18.2 Wiederherstellung der Funktion einer Brücke (Lötstellen) ... FZ 2.7 ... BEMA 98e ... BEMA 89 ... BEL II 301 0 ... 801 0 ... 807 0 ...',
            },
        },
    },

    // ───────────────────────────────────────────────────────────
    // SECTION 2: Prothesen-Wiederherstellungen (FZ 6.x)
    // ───────────────────────────────────────────────────────────
    {
        id: 'WDH-2.1',
        title: 'Einarbeiten von 2 Prothesenzähnen ohne Abformung',
        scenario: 'Zwei Prothesenzähne werden ohne Abformung eingearbeitet. Einfache Reparatur nach BEMA 100a.',
        fz_codes: ['FZ_6.1'],
        bema_codes: ['BEMA_100a'],
        bel_ii_codes: ['BEL_II_8010', 'BEL_II_8023', 'BEL_II_8027'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 38,
                excerpt: '2.1 Einarbeiten von 2 Prothesenzähnen ohne Abformung ... FZ 6.1 ... BEMA 100a Wiederherstellung ohne Abformung ... BEL II 801 0 ... 2x 802 3 ... ggf. 802 7 ...',
            },
        },
    },

    {
        id: 'WDH-2.2',
        title: 'Einarbeiten von 4 Prothesenzähnen mit Abformung',
        scenario: 'Vier Prothesenzähne werden mit Abformung eingearbeitet. Umfangreichere Reparatur nach BEMA 100b.',
        fz_codes: ['FZ_6.2'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8023', 'BEL_II_8027'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 39,
                excerpt: '2.2 Einarbeiten von 4 Prothesenzähnen mit Abformung ... FZ 6.2 ... BEMA 100b Wiederherstellung mit Abformung ... BEL II 001 0 ... 012 0 ... 801 0 ... 4x 802 3 ... ggf. 802 7 ...',
            },
        },
    },

    {
        id: 'WDH-2.3',
        title: 'Einarbeiten von 1 Prothesenzahn im Seitenzahnbereich (mit Abformung)',
        scenario: 'Ein einzelner Seitenzahn wird mit Abformung in die Prothese eingearbeitet.',
        fz_codes: ['FZ_6.2'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8023', 'BEL_II_8027'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 39,
                excerpt: '2.3 Einarbeiten von 1 Prothesenzahn ... FZ 6.2 ... BEMA 100b ... BEL II 001 0 ... 012 0 ... 801 0 ... 802 3 ... ggf. 802 7 ...',
            },
        },
    },

    {
        id: 'WDH-2.4',
        title: 'Wiederbefestigung von 1 Zahn',
        scenario: 'Ein Prothesenzahn wird wiederbefestigt. Reparatur mit Abformung erforderlich.',
        fz_codes: ['FZ_6.2'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8023', 'BEL_II_8027'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 40,
                excerpt: '2.4 Wiederbefestigung von 1 Zahn ... FZ 6.2 ... BEMA 100b ... BEL II 001 0 ... 012 0 ... 801 0 ... 802 3 ... ggf. 802 7 ...',
            },
        },
    },

    {
        id: 'WDH-2.5',
        title: 'Bruchreparatur eines Kunststoffsattels und Einarbeiten von 2 Prothesenzähnen',
        scenario: 'Kombinierte Reparatur: Kunststoffsattelbruch plus Einarbeiten von zwei Zähnen.',
        fz_codes: ['FZ_6.2'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8022', 'BEL_II_8023', 'BEL_II_8027'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 41,
                excerpt: '2.5 Bruchreparatur eines Kunststoffsattels und Einarbeiten von 2 Prothesenzähnen ... FZ 6.2 ... BEMA 100b ... BEL II 001 0 ... 012 0 ... 801 0 ... 802 2 LE Bruch ... 2x 802 3 ... ggf. 802 7 ...',
            },
        },
    },

    {
        id: 'WDH-2.6',
        title: 'Erweiterung um 1 Zahn und gegossene Retention',
        scenario: 'Prothesenerweiterung um einen Zahn mit gegossener Retention.',
        fz_codes: ['FZ_6.5'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8027', 'BEL_II_8040'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 42,
                excerpt: '2.6 Erweiterung um 1 Zahn und gegossene Retention ... FZ 6.5 ... BEMA 100b ... BEL II 001 0 ... 012 0 ... 801 0 ... ggf. 802 7 ... 804 0 Retention, gegossen ...',
            },
        },
    },

    {
        id: 'WDH-2.7',
        title: 'Erweiterung um 4 Zähne und gegossene Retention(en)',
        scenario: 'Umfangreiche Prothesenerweiterung um vier Zähne mit gegossener Retention.',
        fz_codes: ['FZ_6.5', 'FZ_6.5.1', 'FZ_6.5.1', 'FZ_6.5.1'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8027', 'BEL_II_8040'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 42,
                excerpt: '2.7 Erweiterung um 4 Zähne und gegossene Retention(en) ... FZ 6.5 ... 3x 6.5.1 ... BEMA 100b ... BEL II ... 801 0 ... ggf. 802 7 ... 804 0 Retention, gegossen ...',
            },
        },
    },

    {
        id: 'WDH-2.8',
        title: 'Erneuerung eines gegossenen zweiarmigen Halteelementes',
        scenario: 'Halteelement (Klammer) einer Modellgussprothese muss erneuert werden.',
        fz_codes: ['FZ_6.3'],
        bema_codes: ['BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_2031', 'BEL_II_2120', 'BEL_II_8010', 'BEL_II_8025', 'BEL_II_8027', 'BEL_II_8070'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 43,
                excerpt: '2.8 Erneuerung eines gegossenen zweiarmigen Halteelementes ... FZ 6.3 ... BEMA 100b ... BEL II ... 203 1 Zweiarmige gegossene Haltevorrichtung ... 212 0 ... 801 0 ... 802 5 ... ggf. 807 0 ...',
            },
        },
    },

    {
        id: 'WDH-2.10',
        title: 'Bruchreparatur Metallbasis + Erweiterung um 2 Zähne mit gegossener Retention + Wiederbefestigung eines Zahnes (zweizeitig)',
        scenario: 'Komplexe zweizeitige Reparatur: Metallbasisbruch, Erweiterung und Wiederbefestigung.',
        fz_codes: ['FZ_6.3', 'FZ_6.5', 'FZ_6.5.1'],
        bema_codes: ['BEMA_100b', 'BEMA_100b'],
        bel_ii_codes: ['BEL_II_0010', 'BEL_II_0120', 'BEL_II_8010', 'BEL_II_8022', 'BEL_II_8023', 'BEL_II_8027', 'BEL_II_8040', 'BEL_II_8070'],
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 45,
                excerpt: '2.10 Bruchreparatur einer Metallbasis, Erweiterung um 2 Zähne mit einer gegossenen Retention und Wiederbefestigung eines Zahnes ... FZ 6.3 ... 6.5 ... 6.5.1 ... BEMA 2x 100b ... BEL II ... 2x 801 0 ... 802 2 ... 3x 802 3 ... 804 0 ... 807 0 ...',
            },
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// EXPORT SUMMARY & META
// ═══════════════════════════════════════════════════════════════

export const CASE_PACK_META = {
    version: 'v1',
    count: WIEDERHERSTELLUNGEN_CASES_V1.length,
    lastVerified: '2025-12-14',

    // Canonical source URL (for guard tests)
    sourcePdf: CANONICAL_PDF_URL,
    sourcePublisher: SOURCE_META.publisher,

    coverage: {
        /** Unique FZ codes used across all cases */
        fzCodes: ['FZ_2.7', 'FZ_6.1', 'FZ_6.2', 'FZ_6.3', 'FZ_6.5', 'FZ_6.5.1'],
        /** Page range in PDF */
        pdfPages: { min: 35, max: 45 },
        /** Case categories */
        categories: ['Brücken-Wiederherstellungen', 'Prothesen-Wiederherstellungen'],
    },
};
