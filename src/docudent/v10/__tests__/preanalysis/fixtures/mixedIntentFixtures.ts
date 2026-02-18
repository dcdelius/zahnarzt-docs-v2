import type { TreatmentIntentBundleV1 } from '../../../preanalysis/treatmentIntentContract';

export type PreanalysisFixture = {
    id: string;
    dictation: string;
    expected: {
        source: 'fallback';
        needsConfirmation: boolean;
        intentCount: number;
        intentChecks: Array<{
            treatmentId: 'endo' | 'fuellung' | 'extraction' | 'crown_prep';
            tooth?: string;
            phase?: string;
            uncertainty?: string;
        }>;
    };
};

export const MIXED_INTENT_FIXTURES: PreanalysisFixture[] = [
    {
        id: 'endo-build-up-same-tooth',
        dictation: 'Endo 46 abgeschlossen, danach Aufbaufuellung mit Komposit am selben Zahn, Kofferdam blieb liegen.',
        expected: {
            source: 'fallback',
            needsConfirmation: false,
            intentCount: 2,
            intentChecks: [
                { treatmentId: 'endo', tooth: '46' },
                { treatmentId: 'fuellung', tooth: '46' },
            ],
        },
    },
    {
        id: 'crown-prep-and-build-up',
        dictation: 'Zahn 16 fuer Krone beschliffen, danach adhesiver Aufbau mit Komposit, Kontaktpunkt und Okklusion kontrolliert.',
        expected: {
            source: 'fallback',
            needsConfirmation: true,
            intentCount: 2,
            intentChecks: [
                { treatmentId: 'crown_prep', tooth: '16' },
                { treatmentId: 'fuellung', tooth: '16', uncertainty: 'inferred_tooth_from_context' },
            ],
        },
    },
    {
        id: 'extraction-then-filling-multitooth',
        dictation: 'Extraktion Zahn 28 nach Luxation; danach Füllung Zahn 16 okklusal mit Komposit unter Kofferdam.',
        expected: {
            source: 'fallback',
            needsConfirmation: false,
            intentCount: 2,
            intentChecks: [
                { treatmentId: 'extraction', tooth: '28' },
                { treatmentId: 'fuellung', tooth: '16' },
            ],
        },
    },
    {
        id: 'crown-build-extraction-triple',
        dictation: 'Zahn 16 fuer Krone beschliffen, supragingival praepariert, danach am selben Zahn adhaesiver Aufbau mit Komposit; zusaetzlich Extraktion Zahn 28 mit Nahtversorgung.',
        expected: {
            source: 'fallback',
            needsConfirmation: false,
            intentCount: 3,
            intentChecks: [
                { treatmentId: 'crown_prep', tooth: '16' },
                { treatmentId: 'fuellung', tooth: '16' },
                { treatmentId: 'extraction', tooth: '28' },
            ],
        },
    },
    {
        id: 'ambiguous-single-clause-overlap',
        dictation: 'Zahn 16 Krone beschliffen mit adhaesivem Kompositaufbau in derselben Sitzung.',
        expected: {
            source: 'fallback',
            needsConfirmation: true,
            intentCount: 2,
            intentChecks: [
                { treatmentId: 'crown_prep', tooth: '16', uncertainty: 'llm_ambiguous_mapping' },
                { treatmentId: 'fuellung', tooth: '16', uncertainty: 'llm_ambiguous_mapping' },
            ],
        },
    },
    {
        id: 'cross-clause-ambiguous-tooth-context',
        dictation: 'Fuellung Zahn 36 und Zahn 14 okklusal mit Komposit, danach adhaesiver Aufbau mit Komposit.',
        expected: {
            source: 'fallback',
            needsConfirmation: false,
            intentCount: 2,
            intentChecks: [
                { treatmentId: 'fuellung', tooth: '36' },
                { treatmentId: 'fuellung', tooth: '14' },
            ],
        },
    },
    {
        id: 'low-confidence-must-confirm',
        dictation: 'Postoperative Kontrolle, reizloser Befund, Verlauf besprochen.',
        expected: {
            source: 'fallback',
            needsConfirmation: true,
            intentCount: 1,
            intentChecks: [
                { treatmentId: 'fuellung' },
            ],
        },
    },
    {
        id: 'missing-tooth-reference-requires-confirmation',
        dictation: 'Adhaesive Kompositversorgung gelegt, Kofferdam verwendet und Okklusion kontrolliert.',
        expected: {
            source: 'fallback',
            needsConfirmation: true,
            intentCount: 1,
            intentChecks: [
                { treatmentId: 'fuellung', uncertainty: 'missing_tooth_reference' },
            ],
        },
    },
];

export function stripEvidence(bundle: TreatmentIntentBundleV1): Record<string, unknown> {
    return {
        ...bundle,
        intents: bundle.intents.map(intent => ({
            ...intent,
            evidenceSpans: intent.evidenceSpans.map(span => ({
                start: span.start,
                end: span.end,
                text: span.text,
            })),
        })),
    };
}
