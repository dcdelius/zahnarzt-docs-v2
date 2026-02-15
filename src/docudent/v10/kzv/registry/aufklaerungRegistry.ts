/**
 * Aufklärung Registry — Contextual Disclosure Clauses (V10 KZV)
 *
 * Copied from legacy KZV registry for V10 use.
 */

import { CANONICAL_CHIP_IDS } from '../../../contracts/canonicalIds';

export type VerbosityLevel = 'kurz' | 'mittel' | 'lang';

export interface AufklaerungClauseCondition {
    anyChips?: string[];
    requiresAnswers?: Record<string, unknown>;
    requiresExtracted?: Record<string, unknown>;
}

export interface AufklaerungClause {
    id: string;
    description: string;
    when: AufklaerungClauseCondition;
    text: {
        kurz: string;
        mittel: string;
        lang: string;
    };
    priority: number;
}

export const FUELLUNG_AUFKLAERUNG_CLAUSES: AufklaerungClause[] = [
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
    {
        id: 'filling_general_risks',
        description: 'General risks of composite fillings',
        when: {
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

export const ENDO_AUFKLAERUNG_CLAUSES: AufklaerungClause[] = [
    {
        id: 'endo_general_risks',
        description: 'General risks of endodontic treatment',
        when: {},
        text: {
            kurz: 'Endo-Risiken/Alternativen bespr.',
            mittel: 'Risiken der Wurzelkanalbehandlung wurden besprochen: Instrumentenfraktur, Perforation, unvollständige Reinigung.',
            lang: 'Die Risiken der Wurzelkanalbehandlung wurden ausführlich besprochen: mögliche Instrumentenfraktur im Kanal, Perforation der Kanalwand, unvollständige Reinigung bei komplexer Kanalanatomie, sowie das Risiko eines Misserfolgs trotz korrekter Behandlung.',
        },
        priority: 10,
    },
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
    {
        id: 'endo_flareup_pain',
        description: 'Post-operative pain and flare-up risk',
        when: {},
        text: {
            kurz: 'Postop. Schmerzen/Flare-up mögl.',
            mittel: 'Über postoperative Beschwerden und mögliche Flare-up-Reaktionen wurde aufgeklärt.',
            lang: 'Der Patient wurde über mögliche postoperative Beschwerden aufgeklärt: Druckempfindlichkeit des Zahns, Schwellung, sowie die Möglichkeit eines Flare-ups (akute Exazerbation) in den ersten Tagen nach der Behandlung. Analgetika wurden ggf. empfohlen.',
        },
        priority: 20,
    },
];

export interface AufklaerungEvalContext {
    activeChips: string[];
    answers: Map<string, unknown>;
    extracted: Record<string, unknown>;
}

export interface AufklaerungEvalResult {
    text: string;
    clauseIds: string[];
}

export function buildAufklaerungFromClauses(
    clauses: AufklaerungClause[],
    context: AufklaerungEvalContext,
    verbosity: VerbosityLevel
): AufklaerungEvalResult {
    const hits = clauses
        .filter(clause => matchesClause(clause, context))
        .sort((a, b) => a.priority - b.priority);

    const texts = hits.map(clause => clause.text[verbosity]);
    return {
        text: texts.join(' '),
        clauseIds: hits.map(clause => clause.id),
    };
}

function matchesClause(
    clause: AufklaerungClause,
    context: AufklaerungEvalContext
): boolean {
    const { anyChips, requiresAnswers, requiresExtracted } = clause.when;

    if (anyChips && anyChips.length > 0) {
        const hasChip = anyChips.some(id => context.activeChips.includes(id));
        if (!hasChip) return false;
    }

    if (requiresAnswers) {
        for (const [key, value] of Object.entries(requiresAnswers)) {
            if (context.answers.get(key) !== value) return false;
        }
    }

    if (requiresExtracted) {
        for (const [key, value] of Object.entries(requiresExtracted)) {
            if ((context.extracted as any)[key] !== value) return false;
        }
    }

    return true;
}
