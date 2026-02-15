/**
 * Gate Test: Documentation Standard v2 (GIGAPROMPT 7)
 *
 * Contract: V10 documentation output must meet these requirements:
 * - [Dokumentation] always contains: Zahn+Flächen + Maßnahme + Diagnose/Depth
 * - [Befund] section only for textLength='lang' when depth facts present
 * - [MKV] section suppressed when nurKasse=true
 * - "nur Kassenleistung" text present when nurKasse
 * - Adhäsiv/Mehrschicht line present when mehrkostenConfirmed
 *
 * @fast < 3s
 * @deterministic
 */

import { describe, test, expect, it } from 'vitest';
import { composeDocumentationV10 } from '../../v10/output/composeDocumentationV10';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DocStandardCase {
    id: string;
    description: string;
    input: Parameters<typeof composeDocumentationV10>[0];
    expected: {
        hasDokumentationSection?: boolean;
        hasAbrechnungSection?: boolean;
        hasMkvSection?: boolean;
        hasHinweiseSection?: boolean;
        dokumentationContains?: string[];
        dokumentationNotContains?: string[];
        fullTextContains?: string[];
        fullTextNotContains?: string[];
    };
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════

const DOC_STANDARD_CASES: DocStandardCase[] = [
    // ─── Case 1: Basic GKV filling ────
    {
        id: 'gkv_basic',
        description: 'GKV basic filling has Dokumentation, Abrechnung, Hinweise',
        input: {
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: '',
                    billingRefs: ['BEMA_13'],
                    chips: ['fuellung_grundleistung'],
                    facts: {
                        surfaces: ['m', 'o', 'd'],
                        cariesDepth: 'normal',
                        materialMentioned: 'komposit',
                    },
                },
            },
            answers: new Map(),
            insuranceType: 'GKV',
            textLength: 'mittel',
        },
        expected: {
            hasDokumentationSection: true,
            hasAbrechnungSection: true,
            hasMkvSection: false, // No MKV for GKV
            hasHinweiseSection: true,
            dokumentationContains: ['Zahn 36', 'MOD', 'Komposit'],
        },
    },

    // ─── Case 2: MKV with mehrkostenConfirmed and adhesiveTechnique ────
    {
        id: 'mkv_confirmed',
        description: 'MKV with adhesiveTechnique has MKV section and Adhäsiv line',
        input: {
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: '',
                    billingRefs: ['BEMA_13', 'GOZ_2100'],
                    chips: ['fuellung_grundleistung', 'mehrkosten_confirmed'],
                    facts: {
                        surfaces: ['m', 'o', 'd'],
                        materialMentioned: 'komposit',
                        mehrkostenConfirmed: true,
                        // GIGAPROMPT 10: Adhäsiv line requires adhesiveTechnique or mkvJustification
                        adhesiveTechnique: true,
                    },
                },
            },
            answers: new Map(),
            insuranceType: 'MKV',
            textLength: 'mittel',
            mkvAmount: 120,
        },
        expected: {
            hasDokumentationSection: true,
            hasAbrechnungSection: true,
            hasMkvSection: true,
            hasHinweiseSection: true,
            dokumentationContains: ['Adhäsive Füllungstechnik'],
            fullTextContains: ['Mehrkostenvereinbarung', '120 €'],
        },
    },

    // ─── Case 3: MKV + nurKasse ────
    {
        id: 'mkv_nur_kasse',
        description: 'MKV + nurKasse suppresses MKV section, adds clarification',
        input: {
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: '',
                    billingRefs: ['BEMA_13'],
                    chips: ['fuellung_grundleistung'],
                    facts: {
                        surfaces: ['o'],
                        materialMentioned: 'giz',
                        nurKasse: true,
                    },
                },
            },
            answers: new Map(),
            insuranceType: 'MKV',
            textLength: 'mittel',
        },
        expected: {
            hasDokumentationSection: true,
            hasAbrechnungSection: true,
            hasMkvSection: false, // Suppressed due to nurKasse
            hasHinweiseSection: true,
            fullTextContains: ['nur Kassenleistung'],
            fullTextNotContains: ['Mehrkostenvereinbarung'],
        },
    },

    // ─── Case 4: PKV only GOZ ────
    {
        id: 'pkv_basic',
        description: 'PKV has no BEMA, no MKV section',
        input: {
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: '',
                    billingRefs: ['GOZ_2100'],
                    chips: ['fuellung_grundleistung'],
                    facts: {
                        surfaces: ['m', 'o', 'd'],
                        materialMentioned: 'komposit',
                    },
                },
            },
            answers: new Map(),
            insuranceType: 'PKV',
            textLength: 'mittel',
        },
        expected: {
            hasDokumentationSection: true,
            hasAbrechnungSection: true,
            hasMkvSection: false, // No MKV for PKV
            hasHinweiseSection: true,
            fullTextContains: ['Privatleistung (GOZ)'],
            fullTextNotContains: ['Kassenleistung (BEMA)'],
        },
    },

    // ─── Case 5: Anesthesia triggers Hinweis ────
    {
        id: 'with_anesthesia',
        description: 'Anesthesia triggers post-LA warning in Hinweise',
        input: {
            perInstance: {
                'fuellung-36-1': {
                    instanceId: 'fuellung-36-1',
                    teeth: ['36'],
                    text: '',
                    billingRefs: ['BEMA_13'],
                    chips: ['fuellung_grundleistung', 'la_infiltr'],
                    facts: {
                        surfaces: ['o'],
                        anesthesia: 'infiltr',
                    },
                },
            },
            answers: new Map(),
            insuranceType: 'GKV',
            textLength: 'mittel',
        },
        expected: {
            hasHinweiseSection: true,
            fullTextContains: ['Nach Lokalanästhesie', 'Betäubung'],
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getSectionById(sections: { id: string }[], id: string) {
    return sections.find(s => s.id === id);
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('gate-documentation-standard-v2', () => {
    describe('Documentation Structure Cases', () => {
        for (const tc of DOC_STANDARD_CASES) {
            test(`[${tc.id}] ${tc.description}`, () => {
                const result = composeDocumentationV10(tc.input);

                console.log(`[${tc.id}] Sections:`, result.sections.map(s => s.id));
                console.log(`[${tc.id}] FullText preview:`, result.fullText.slice(0, 200));

                // ─── Section presence ───────────────────────────────
                if (tc.expected.hasDokumentationSection !== undefined) {
                    expect(
                        !!getSectionById(result.sections, 'dokumentation'),
                        `[${tc.id}] Dokumentation section presence`
                    ).toBe(tc.expected.hasDokumentationSection);
                }

                if (tc.expected.hasAbrechnungSection !== undefined) {
                    expect(
                        !!getSectionById(result.sections, 'abrechnung'),
                        `[${tc.id}] Abrechnung section presence`
                    ).toBe(tc.expected.hasAbrechnungSection);
                }

                if (tc.expected.hasMkvSection !== undefined) {
                    expect(
                        !!getSectionById(result.sections, 'mkv'),
                        `[${tc.id}] MKV section presence`
                    ).toBe(tc.expected.hasMkvSection);
                }

                if (tc.expected.hasHinweiseSection !== undefined) {
                    expect(
                        !!getSectionById(result.sections, 'hinweise'),
                        `[${tc.id}] Hinweise section presence`
                    ).toBe(tc.expected.hasHinweiseSection);
                }

                // ─── Dokumentation content ──────────────────────────
                const dokSection = getSectionById(result.sections, 'dokumentation');
                if (tc.expected.dokumentationContains && dokSection) {
                    for (const text of tc.expected.dokumentationContains) {
                        expect(
                            dokSection.content?.toLowerCase().includes(text.toLowerCase()),
                            `[${tc.id}] Dokumentation should contain "${text}"`
                        ).toBe(true);
                    }
                }

                if (tc.expected.dokumentationNotContains && dokSection) {
                    for (const text of tc.expected.dokumentationNotContains) {
                        expect(
                            dokSection.content?.toLowerCase().includes(text.toLowerCase()),
                            `[${tc.id}] Dokumentation should NOT contain "${text}"`
                        ).toBe(false);
                    }
                }

                // ─── Full text content ──────────────────────────────
                if (tc.expected.fullTextContains) {
                    for (const text of tc.expected.fullTextContains) {
                        expect(
                            result.fullText.toLowerCase().includes(text.toLowerCase()),
                            `[${tc.id}] FullText should contain "${text}"`
                        ).toBe(true);
                    }
                }

                if (tc.expected.fullTextNotContains) {
                    for (const text of tc.expected.fullTextNotContains) {
                        expect(
                            result.fullText.toLowerCase().includes(text.toLowerCase()),
                            `[${tc.id}] FullText should NOT contain "${text}"`
                        ).toBe(false);
                    }
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT: DOKUMENTATION INVARIANTS
    // ═══════════════════════════════════════════════════════════════

    describe('Dokumentation Section Invariants', () => {
        it('Always contains tooth number', () => {
            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-36-1': {
                        instanceId: 'fuellung-36-1',
                        teeth: ['36'],
                        text: '',
                        billingRefs: [],
                        chips: [],
                        facts: {},
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            const dokSection = getSectionById(result.sections, 'dokumentation');
            expect(dokSection?.content).toContain('Zahn 36');
        });

        it('Surfaces display as uppercase abbreviation', () => {
            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-36-1': {
                        instanceId: 'fuellung-36-1',
                        teeth: ['36'],
                        text: '',
                        billingRefs: [],
                        chips: [],
                        facts: { surfaces: ['m', 'o', 'd'] },
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            const dokSection = getSectionById(result.sections, 'dokumentation');
            expect(dokSection?.content).toContain('MOD');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT: TEXT LENGTH VARIANTS
    // ═══════════════════════════════════════════════════════════════

    describe('Text Length Variants', () => {
        it('kurz: minimal text, no diagnosis line', () => {
            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-36-1': {
                        instanceId: 'fuellung-36-1',
                        teeth: ['36'],
                        text: '',
                        billingRefs: [],
                        chips: [],
                        facts: {
                            surfaces: ['o'],
                            cariesDepth: 'profunda',
                        },
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
            });

            const dokSection = getSectionById(result.sections, 'dokumentation');
            expect(dokSection?.content).not.toContain('Diagnose:');
        });

        it('lang: includes isolation and finishing lines', () => {
            const result = composeDocumentationV10({
                perInstance: {
                    'fuellung-36-1': {
                        instanceId: 'fuellung-36-1',
                        teeth: ['36'],
                        text: '',
                        billingRefs: [],
                        chips: [],
                        facts: {
                            surfaces: ['o'],
                            kofferdamUsed: true,
                        },
                    },
                },
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'lang',
            });

            const dokSection = getSectionById(result.sections, 'dokumentation');
            expect(dokSection?.content).toContain('Kofferdam');
            expect(dokSection?.content).toContain('Politur');
        });
    });
});
