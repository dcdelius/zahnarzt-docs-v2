/**
 * Aufklärung Registry — Contextual Disclosure Clauses (Prompt C)
 * 
 * SSOT-safe registry that maps CONDITIONS → TEXT MODULES for Aufklärung.
 * 
 * Conditions reference:
 * - CANONICAL_CHIP_IDS (SSOT)
 * - answers (canonical keys)
 * - extracted data signals (cavityDepth, diagnosis)
 * 
 * Text is verbosity-aware: kurz / mittel / lang variants.
 * 
 * ❌ FORBIDDEN: Raw chip strings, billing code decisions
 * ✅ REQUIRED: All chip IDs from CANONICAL_CHIP_IDS
 */

import { CANONICAL_CHIP_IDS } from '../../../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type VerbosityLevel = 'kurz' | 'mittel' | 'lang';

export interface AufklaerungClauseCondition {
    /** If any of these chips are active, clause applies */
    anyChips?: string[];
    /** If these answer keys have specific values */
    requiresAnswers?: Record<string, unknown>;
    /** If these extracted fields have specific values */
    requiresExtracted?: Record<string, unknown>;
}

export interface AufklaerungClause {
    /** Stable ID for testing/reference */
    id: string;
    /** Human-readable description */
    description: string;
    /** Conditions that trigger this clause */
    when: AufklaerungClauseCondition;
    /** Text by verbosity level */
    text: {
        kurz: string;
        mittel: string;
        lang: string;
    };
    /** Priority (lower = appears first) */
    priority: number;
}

// ═══════════════════════════════════════════════════════════════
// FUELLUNG AUFKLÄRUNG CLAUSES
// ═══════════════════════════════════════════════════════════════

export const FUELLUNG_AUFKLAERUNG_CLAUSES: AufklaerungClause[] = [
    // ────────────────────────────────────────────────────────────
    // Anesthesia risks
    // ────────────────────────────────────────────────────────────
    {
        id: 'anesthesia_risks',
        description: 'Anesthesia-related risks (any LA)',
        when: {
            anyChips: [
                CANONICAL_CHIP_IDS.LA_LEITUNG,
                CANONICAL_CHIP_IDS.LA_INFILTR,
            ],
        },
        text: {
            kurz: 'LA-Risiken besprochen.',
            mittel: 'Risiken der Lokalanästhesie wurden besprochen (Hämatom, Nervschädigung, allergische Reaktion).',
            lang: 'Die Risiken der Lokalanästhesie wurden ausführlich besprochen, einschließlich möglicher Hämatome an der Einstichstelle, vorübergehender oder selten dauerhafter Nervschädigung sowie allergischer Reaktionen auf das Anästhetikum.',
        },
        priority: 10,
    },

    // ────────────────────────────────────────────────────────────
    // Deep cavity / pulp proximity / endo risk
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_risk_deep',
        description: 'Endo risk for deep cavities or pulp-near situations',
        when: {
            requiresExtracted: { cavityDepth: 'tief' },
        },
        text: {
            kurz: 'Endo-Risiko bei tiefer Kavität besprochen.',
            mittel: 'Aufgrund der pulpanahen Lage wurde über das Risiko einer späteren Wurzelkanalbehandlung aufgeklärt.',
            lang: 'Aufgrund der pulpanahen Lage und der tiefen Kavität wurde der Patient ausführlich über das erhöhte Risiko einer späteren Wurzelkanalbehandlung (Endodontie) aufgeklärt. Eine Vitalitätsprüfung ist für Kontrolltermine empfohlen.',
        },
        priority: 20,
    },
    {
        id: 'endo_risk_capping',
        description: 'Endo risk when capping/pulp capping performed',
        when: {
            anyChips: [CANONICAL_CHIP_IDS.CP],
        },
        text: {
            kurz: 'CP: Endo-Risiko besprochen.',
            mittel: 'Bei der indirekten Überkappung (Cp) wurde über das Risiko einer späteren Vitalitätsverlust aufgeklärt.',
            lang: 'Eine indirekte Überkappung (Cp) wurde durchgeführt. Der Patient wurde über das Risiko eines späteren Vitalitätsverlusts der Pulpa und die daraus möglicherweise resultierende Notwendigkeit einer Wurzelkanalbehandlung aufgeklärt.',
        },
        priority: 21,
    },

    // ────────────────────────────────────────────────────────────
    // MKV (Mehrkosten) explanation
    // ────────────────────────────────────────────────────────────
    {
        id: 'mkv_explanation',
        description: 'MKV cost explanation for premium techniques',
        when: {
            anyChips: [
                CANONICAL_CHIP_IDS.MEHRSCHICHT,
                CANONICAL_CHIP_IDS.ADHAESIV,
            ],
        },
        text: {
            kurz: 'MKV-Aufklärung erfolgt.',
            mittel: 'Über die Mehrkosten der Mehrschichttechnik und/oder Adhäsivtechnik wurde aufgeklärt.',
            lang: 'Der Patient wurde über die Mehrkosten der gewählten Füllungstechnik (Mehrschichttechnik / Adhäsivtechnik) aufgeklärt. Diese Kosten werden nicht von der gesetzlichen Krankenversicherung übernommen und sind vom Patienten selbst zu tragen.',
        },
        priority: 30,
    },

    // ────────────────────────────────────────────────────────────
    // General filling risks (always applicable)
    // ────────────────────────────────────────────────────────────
    {
        id: 'filling_general_risks',
        description: 'General risks of composite fillings',
        when: {
            // Always applicable when composit chip present
            anyChips: [CANONICAL_CHIP_IDS.KOMPOSIT_BASIC],
        },
        text: {
            kurz: 'Füllungsrisiken besprochen.',
            mittel: 'Allgemeine Risiken der Kompositfüllung (Randspalten, Verfärbung, postoperative Sensibilität) wurden besprochen.',
            lang: 'Die allgemeinen Risiken der Kompositfüllung wurden ausführlich besprochen: mögliche Randspalten, Verfärbung des Füllungsrandes über die Zeit, postoperative Sensibilität auf Temperaturen sowie die begrenzte Lebensdauer der Restauration.',
        },
        priority: 40,
    },
];

// ═══════════════════════════════════════════════════════════════
// ENDO AUFKLÄRUNG CLAUSES
// ═══════════════════════════════════════════════════════════════

export const ENDO_AUFKLAERUNG_CLAUSES: AufklaerungClause[] = [
    // ────────────────────────────────────────────────────────────
    // General endo risks (always for endo treatment)
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_general_risks',
        description: 'General risks of endodontic treatment',
        when: {
            // Always applies for endo (no chip required - treatment context)
        },
        text: {
            kurz: 'Endo-Risiken/Alternativen bespr.',
            mittel: 'Risiken der Wurzelkanalbehandlung wurden besprochen: Instrumentenfraktur, Perforation, unvollständige Reinigung.',
            lang: 'Die Risiken der Wurzelkanalbehandlung wurden ausführlich besprochen: mögliche Instrumentenfraktur im Kanal, Perforation der Kanalwand, unvollständige Reinigung bei komplexer Kanalanatomie, sowie das Risiko eines Misserfolgs trotz korrekter Behandlung.',
        },
        priority: 10,
    },

    // ────────────────────────────────────────────────────────────
    // Instrument fracture risk
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_instrument_fracture',
        description: 'Instrument fracture risk during preparation',
        when: {
            requiresAnswers: { endo_step: 'start' },
        },
        text: {
            kurz: 'Instrumentenfraktur-Risiko bespr.',
            mittel: 'Über das Risiko einer Instrumentenfraktur bei Kanalaufbereitung wurde aufgeklärt.',
            lang: 'Der Patient wurde über das Risiko einer Instrumentenfraktur während der Kanalaufbereitung aufgeklärt. Sollte dies auftreten, kann das Fragment je nach Lage im Kanal belassen, umgangen oder chirurgisch entfernt werden.',
        },
        priority: 15,
    },

    // ────────────────────────────────────────────────────────────
    // Flare-up / post-op pain
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_flareup_pain',
        description: 'Post-operative pain and flare-up risk',
        when: {
            // Always applies
        },
        text: {
            kurz: 'Postop. Schmerzen/Flare-up mögl.',
            mittel: 'Über postoperative Beschwerden und mögliche Flare-up-Reaktionen wurde aufgeklärt.',
            lang: 'Der Patient wurde über mögliche postoperative Beschwerden aufgeklärt: Druckempfindlichkeit des Zahns, Schwellung, sowie die Möglichkeit eines Flare-ups (akute Exazerbation) in den ersten Tagen nach der Behandlung. Analgetika wurden ggf. empfohlen.',
        },
        priority: 20,
    },

    // ────────────────────────────────────────────────────────────
    // Alternatives (extraction)
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_alternatives_extraction',
        description: 'Alternative: extraction',
        when: {
            // Always applies
        },
        text: {
            kurz: 'Alternative Extraktion bespr.',
            mittel: 'Als Alternative zur Wurzelkanalbehandlung wurde die Extraktion besprochen.',
            lang: 'Als Alternative zur Wurzelkanalbehandlung wurde die Extraktion des Zahns mit anschließendem Lückenmanagement (Implantat, Brücke, herausnehmbarer Zahnersatz) besprochen. Die Vor- und Nachteile beider Optionen wurden erläutert.',
        },
        priority: 25,
    },

    // ────────────────────────────────────────────────────────────
    // Microscope note (if settings.mikroskop=true)
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_mikroskop_note',
        description: 'Microscope-assisted treatment note',
        when: {
            requiresExtracted: { mikroskop: true },
        },
        text: {
            kurz: 'Mikroskop-Behandlung.',
            mittel: 'Die Behandlung erfolgt unter Verwendung des Dentalmikroskops für verbesserte Sicht.',
            lang: 'Die Wurzelkanalbehandlung erfolgt unter Verwendung des Dentalmikroskops (OP-Mikroskop). Dies ermöglicht eine präzisere Darstellung der Kanalanatomie, bessere Identifikation von Zusatzkanälen und erhöhte Erfolgschancen der Behandlung.',
        },
        priority: 30,
    },

    // ────────────────────────────────────────────────────────────
    // Kofferdam note
    // ────────────────────────────────────────────────────────────
    {
        id: 'endo_kofferdam_note',
        description: 'Rubber dam isolation note',
        when: {
            anyChips: [CANONICAL_CHIP_IDS.KOFFERDAM],
        },
        text: {
            kurz: 'Kofferdam für Keimkontrolle.',
            mittel: 'Die Behandlung erfolgt unter absoluter Trockenlegung (Kofferdam) zur Keimkontrolle.',
            lang: 'Die Wurzelkanalbehandlung erfolgt unter absoluter Trockenlegung mittels Kofferdam. Dies ist der Goldstandard zur Vermeidung von Speichel- und Bakterienkontamination während der Behandlung und erhöht die Erfolgsprognose deutlich.',
        },
        priority: 35,
    },
];

// ═══════════════════════════════════════════════════════════════
// EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════

export interface AufklaerungEvalContext {
    activeChips: string[];
    answers: Map<string, unknown>;
    extracted?: Record<string, unknown>;
}

/**
 * Evaluate which clauses apply given the context.
 */
export function evaluateAufklaerungClauses(
    clauses: AufklaerungClause[],
    context: AufklaerungEvalContext
): AufklaerungClause[] {
    return clauses
        .filter(clause => {
            const { when } = clause;

            // Check anyChips
            if (when.anyChips && when.anyChips.length > 0) {
                const hasAnyChip = when.anyChips.some(chipId =>
                    context.activeChips.includes(chipId)
                );
                if (!hasAnyChip) return false;
            }

            // Check requiresAnswers
            if (when.requiresAnswers) {
                for (const [key, expectedValue] of Object.entries(when.requiresAnswers)) {
                    const actualValue = context.answers.get(key);
                    if (actualValue !== expectedValue) return false;
                }
            }

            // Check requiresExtracted
            if (when.requiresExtracted && context.extracted) {
                for (const [key, expectedValue] of Object.entries(when.requiresExtracted)) {
                    const actualValue = context.extracted[key];
                    if (actualValue !== expectedValue) return false;
                }
            }

            return true;
        })
        .sort((a, b) => a.priority - b.priority);
}

/**
 * Build Aufklärung text from applicable clauses.
 */
export function buildAufklaerungFromClauses(
    clauses: AufklaerungClause[],
    context: AufklaerungEvalContext,
    verbosity: VerbosityLevel
): { text: string; clauseIds: string[] } {
    const applicable = evaluateAufklaerungClauses(clauses, context);

    const texts = applicable.map(clause => clause.text[verbosity]);
    const clauseIds = applicable.map(clause => clause.id);

    return {
        text: texts.join(' '),
        clauseIds,
    };
}
