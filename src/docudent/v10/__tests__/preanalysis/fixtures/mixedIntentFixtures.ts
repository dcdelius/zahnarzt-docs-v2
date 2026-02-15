import type { TreatmentIntentBundleV1 } from '../../../preanalysis/treatmentIntentContract';

export type PreanalysisFixture = {
    id: string;
    dictation: string;
    expected: {
        source: 'fallback';
        needsConfirmation: boolean;
        intentCount: number;
        intentChecks: Array<{
            treatmentId: 'endo' | 'fuellung' | 'extraction_stub';
            tooth?: string;
            phase?: string;
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
                { treatmentId: 'fuellung', tooth: '16', phase: 'kronenpraep_candidate' },
                { treatmentId: 'fuellung', tooth: '16' },
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

