/**
 * Festzuschuss Verified Case Pack v1
 * 
 * 10 real-world verified Festzuschuss cases with evidence pointers
 * to KZV-Berlin primary sources (PDFs + HTML befundklasse pages).
 * 
 * Coverage: Befundklasse 1–3, all bonus statuses
 * Year: 2025
 * 
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL SOURCES (Verified 2025-12-14)
 * ═══════════════════════════════════════════════════════════════
 * PDF: https://www.kzv-berlin.de/fileadmin/user_upload/Abrechnung/PDF-Dateien/Abrechnungshilfe_1_2025.pdf
 * HTML: https://www.kzv-berlin.de/fuer-praxen/abrechnung/zahnersatz/festzuschuesse/befundklasse-{1,2,3}
 * 
 * Page locations in PDF:
 * - Befundklasse 1: page 13
 * - Befundklasse 2: pages 14–15
 * - Befundklasse 3: page 15
 */

import type { BonusStatus } from '../core/billing/knowledgeBase/logic/festzuschussMapper';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PdfEvidence {
    /** URL to the PDF source document */
    url: string;
    /** Page number in the PDF (1-indexed) */
    page: number;
    /** Hint to locate the relevant table/section */
    tableHint: string;
    /** Exact text excerpt showing the amount (German comma format) */
    excerpt: string;
}

export interface HtmlEvidence {
    /** URL to the HTML source page */
    url: string;
    /** Relevant text excerpt from the page */
    excerpt: string;
}

export interface FestzuschussFixture {
    /** Unique case identifier: FZ-{year}-{code}-{bonus} */
    id: string;
    /** Year of the Festzuschuss values */
    year: number;
    /** FZ codes to calculate (e.g. ["FZ_1.1"]) */
    fzCodes: string[];
    /** Bonus status for calculation */
    bonusStatus: BonusStatus;
    /** Expected calculation result */
    expected: {
        gesamtbetrag: number;
        einzelbetraege: Array<{ befund: string; betrag: number }>;
    };
    /** Evidence from primary sources */
    evidence: {
        pdf?: PdfEvidence;
        htmlRules?: HtmlEvidence[];
    };
    /** Optional description of the clinical scenario */
    description?: string;
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL SOURCE URLS (Verified 2025-12-14)
// ═══════════════════════════════════════════════════════════════

/** The ONE canonical PDF source for all Festzuschuss 2025 amounts */
export const CANONICAL_PDF_URL =
    'https://www.kzv-berlin.de/fileadmin/user_upload/Abrechnung/PDF-Dateien/Abrechnungshilfe_1_2025.pdf';

/** The canonical prefix for HTML befundklasse pages */
export const CANONICAL_HTML_PREFIX =
    'https://www.kzv-berlin.de/fuer-praxen/abrechnung/zahnersatz/festzuschuesse/';

const HTML_SOURCES = {
    befundklasse_1: `${CANONICAL_HTML_PREFIX}befundklasse-1`,
    befundklasse_2: `${CANONICAL_HTML_PREFIX}befundklasse-2`,
    befundklasse_3: `${CANONICAL_HTML_PREFIX}befundklasse-3`,
} as const;

/** Expected PDF page numbers per Befundklasse */
export const PDF_PAGE_RANGES = {
    '1': [13],           // Befundklasse 1: page 13
    '2': [14, 15],       // Befundklasse 2: pages 14–15
    '3': [15],           // Befundklasse 3: page 15
} as const;

// ═══════════════════════════════════════════════════════════════
// VERIFIED FIXTURES (10 cases)
// ═══════════════════════════════════════════════════════════════

export const FESTZUSCHUSS_CASES_V1: FestzuschussFixture[] = [
    // ───────────────────────────────────────────────────────────
    // BEFUNDKLASSE 1: Kronen (PDF page 13)
    // ───────────────────────────────────────────────────────────
    {
        id: 'FZ-2025-1.1-ohne',
        year: 2025,
        fzCodes: ['FZ_1.1'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 229.25,
            einzelbetraege: [{ befund: 'FZ_1.1', betrag: 229.25 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 13,
                tableHint: 'Befundklasse 1 – Festzuschuss-Tabelle',
                excerpt: '1.1 … 229,25 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_1,
                    excerpt: 'Befund 1.1 – Erhaltungswürdiger Zahn mit weitgehender Zerstörung der klinischen Krone',
                },
            ],
        },
        description: 'Einzelkrone Metall/NEM bei weitgehender Zerstörung',
    },

    {
        id: 'FZ-2025-1.1-10jahre',
        year: 2025,
        fzCodes: ['FZ_1.1'],
        bonusStatus: '10_jahre',
        expected: {
            gesamtbetrag: 286.57,
            einzelbetraege: [{ befund: 'FZ_1.1', betrag: 286.57 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 13,
                tableHint: 'Befundklasse 1 – Spalte 10-Jahres-Bonus',
                excerpt: '1.1 … 286,57 EUR (75%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_1,
                    excerpt: 'Bonus nach 10 Jahren: 75% des Regelbetrages',
                },
            ],
        },
        description: 'Einzelkrone mit 10-Jahres-Bonus',
    },

    {
        id: 'FZ-2025-1.3-ohne',
        year: 2025,
        fzCodes: ['FZ_1.3'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 58.41,
            einzelbetraege: [{ befund: 'FZ_1.3', betrag: 58.41 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 13,
                tableHint: 'Befundklasse 1 – Festzuschuss-Tabelle',
                excerpt: '1.3 … 58,41 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_1,
                    excerpt: 'Befund 1.3 – Wiederherstellung der Funktion einer Krone',
                },
            ],
        },
        description: 'Kronenreparatur/Wiederherstellung',
    },

    {
        id: 'FZ-2025-1.4-ohne',
        year: 2025,
        fzCodes: ['FZ_1.4'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 55.31,
            einzelbetraege: [{ befund: 'FZ_1.4', betrag: 55.31 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 13,
                tableHint: 'Befundklasse 1 – Festzuschuss-Tabelle',
                excerpt: '1.4 … 55,31 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_1,
                    excerpt: 'Befund 1.4 – Langzeitprovisorium bei PAR-Behandlung',
                },
            ],
        },
        description: 'Langzeitprovisorium bei PAR-Behandlung',
    },

    // ───────────────────────────────────────────────────────────
    // BEFUNDKLASSE 2: Brücken (PDF pages 14–15)
    // ───────────────────────────────────────────────────────────
    {
        id: 'FZ-2025-2.1-ohne',
        year: 2025,
        fzCodes: ['FZ_2.1'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 513.90,
            einzelbetraege: [{ befund: 'FZ_2.1', betrag: 513.90 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 14,
                tableHint: 'Befundklasse 2 – Festzuschuss-Tabelle',
                excerpt: '2.1 … 513,90 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_2,
                    excerpt: 'Befund 2.1 – Brücke bei Fehlen von zwei nebeneinander liegenden Zähnen',
                },
            ],
        },
        description: '3-gliedrige Brücke bei 2 fehlenden Zähnen',
    },

    {
        id: 'FZ-2025-2.1-haertefall',
        year: 2025,
        fzCodes: ['FZ_2.1'],
        bonusStatus: 'haertefall',
        expected: {
            gesamtbetrag: 856.50,
            einzelbetraege: [{ befund: 'FZ_2.1', betrag: 856.50 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 14,
                tableHint: 'Befundklasse 2 – Spalte Härtefall',
                excerpt: '2.1 … 856,50 EUR (100%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_2,
                    excerpt: 'Härtefall: Verdopplung des Festzuschusses auf 100%',
                },
            ],
        },
        description: '3-gliedrige Brücke – Härtefallregelung',
    },

    {
        id: 'FZ-2025-2.6-ohne',
        year: 2025,
        fzCodes: ['FZ_2.6'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 100.63,
            einzelbetraege: [{ befund: 'FZ_2.6', betrag: 100.63 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 14,
                tableHint: 'Befundklasse 2 – Festzuschuss-Tabelle',
                excerpt: '2.6 … 100,63 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_2,
                    excerpt: 'Befund 2.6 – Freiendbrücke mit Anhänger',
                },
            ],
        },
        description: 'Freiendbrücke Anhänger bei fehlendem 2. Molar',
    },

    {
        id: 'FZ-2025-2.7-ohne',
        year: 2025,
        fzCodes: ['FZ_2.7'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 58.41,
            einzelbetraege: [{ befund: 'FZ_2.7', betrag: 58.41 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 15,
                tableHint: 'Befundklasse 2 – Festzuschuss-Tabelle (Fortsetzung)',
                excerpt: '2.7 … 58,41 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_2,
                    excerpt: 'Befund 2.7 – Wiederherstellung der Funktion einer Brücke',
                },
            ],
        },
        description: 'Brückenreparatur/Wiederherstellung',
    },

    // ───────────────────────────────────────────────────────────
    // BEFUNDKLASSE 3: Prothesen (PDF page 15)
    // ───────────────────────────────────────────────────────────
    {
        id: 'FZ-2025-3.1-ohne',
        year: 2025,
        fzCodes: ['FZ_3.1'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 634.49,
            einzelbetraege: [{ befund: 'FZ_3.1', betrag: 634.49 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 15,
                tableHint: 'Befundklasse 3 – Festzuschuss-Tabelle',
                excerpt: '3.1 … 634,49 EUR (60%)',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_3,
                    excerpt: 'Befund 3.1 – Teilprothese (Modellguss) bei Restzahnbestand',
                },
            ],
        },
        description: 'Modellgussprothese bei Restzahnbestand',
    },

    {
        id: 'FZ-2025-3.2a-ohne',
        year: 2025,
        fzCodes: ['FZ_3.2a'],
        bonusStatus: 'ohne',
        expected: {
            gesamtbetrag: 482.46,
            einzelbetraege: [{ befund: 'FZ_3.2a', betrag: 482.46 }],
        },
        evidence: {
            pdf: {
                url: CANONICAL_PDF_URL,
                page: 15,
                tableHint: 'Befundklasse 3 – Festzuschuss-Tabelle',
                excerpt: '3.2 … 482,46 EUR (60%) – je Teleskopkrone',
            },
            htmlRules: [
                {
                    url: HTML_SOURCES.befundklasse_3,
                    excerpt: 'Befund 3.2 – je Teleskop-/Konuskrone (max. 2x im Kiefer)',
                },
            ],
        },
        description: 'Erste Teleskopkrone (max. 2x pro Kiefer im Verblendbereich 15–25/34–44)',
    },
];

// ═══════════════════════════════════════════════════════════════
// EXPORT SUMMARY & META
// ═══════════════════════════════════════════════════════════════

export const CASE_PACK_META = {
    version: 'v1',
    year: 2025,
    count: FESTZUSCHUSS_CASES_V1.length,
    lastVerified: '2025-12-14',

    // Canonical source URLs (for guard tests)
    sourcePdf: CANONICAL_PDF_URL,
    sourceHtmlPrefix: CANONICAL_HTML_PREFIX,

    coverage: {
        befundklassen: ['1', '2', '3'],
        fzCodes: ['1.1', '1.3', '1.4', '2.1', '2.6', '2.7', '3.1', '3.2a'],
        bonusStatuses: ['ohne', '10_jahre', 'haertefall'] as BonusStatus[],
    },

    pdfPageRanges: PDF_PAGE_RANGES,
};
