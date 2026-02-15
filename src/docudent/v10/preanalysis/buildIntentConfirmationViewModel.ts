import type { TreatmentIntentBundleV1, TreatmentIntentV1 } from './treatmentIntentContract';

type ConfirmationOption = {
    treatmentId: string;
    label: string;
    selected: boolean;
};

export type IntentConfirmationLane = {
    laneId: string;
    intentId: string;
    tooth?: string;
    treatmentId: string;
    label: string;
    confidence: number;
    confidenceLabel: 'high' | 'medium' | 'low';
    evidencePreview: string;
    requiresDecision: boolean;
    options: ConfirmationOption[];
};

export type IntentConfirmationViewModel = {
    totalIntents: number;
    requiresDecisionCount: number;
    autoConfirmedCount: number;
    canConfirmAllWithoutEdits: boolean;
    lanes: IntentConfirmationLane[];
};

const TREATMENT_LABELS: Record<string, string> = {
    fuellung: 'Fuellung',
    endo: 'Endo',
    extraction_stub: 'Extraktion',
};

const FALLBACK_OPTIONS = ['fuellung', 'endo', 'extraction_stub'];

function treatmentLabel(treatmentId: string): string {
    return TREATMENT_LABELS[treatmentId] ?? treatmentId;
}

function confidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
}

function firstEvidenceStart(intent: TreatmentIntentV1): number {
    return intent.evidenceSpans[0]?.start ?? Number.MAX_SAFE_INTEGER;
}

function buildOptions(intent: TreatmentIntentV1): ConfirmationOption[] {
    const ordered = [intent.treatmentId, ...FALLBACK_OPTIONS.filter(id => id !== intent.treatmentId)];
    return ordered.map((treatmentId, index) => ({
        treatmentId,
        label: treatmentLabel(treatmentId),
        selected: index === 0,
    }));
}

export function buildIntentConfirmationViewModel(bundle: TreatmentIntentBundleV1): IntentConfirmationViewModel {
    const lanes = [...bundle.intents]
        .sort((a, b) => {
            const aStart = firstEvidenceStart(a);
            const bStart = firstEvidenceStart(b);
            if (aStart !== bStart) return aStart - bStart;
            return a.intentId.localeCompare(b.intentId);
        })
        .map((intent, index): IntentConfirmationLane => {
            const evidencePreview = intent.evidenceSpans[0]?.text ?? '';
            const requiresDecision = Boolean(bundle.needsConfirmation || intent.uncertainty || confidenceLabel(intent.confidence) === 'low');
            const label = intent.tooth
                ? `Zahn ${intent.tooth} - ${treatmentLabel(intent.treatmentId)}`
                : treatmentLabel(intent.treatmentId);
            return {
                laneId: `lane-${index + 1}`,
                intentId: intent.intentId,
                tooth: intent.tooth,
                treatmentId: intent.treatmentId,
                label,
                confidence: intent.confidence,
                confidenceLabel: confidenceLabel(intent.confidence),
                evidencePreview,
                requiresDecision,
                options: buildOptions(intent),
            };
        });

    const requiresDecisionCount = lanes.filter(lane => lane.requiresDecision).length;
    const autoConfirmedCount = lanes.length - requiresDecisionCount;

    return {
        totalIntents: lanes.length,
        requiresDecisionCount,
        autoConfirmedCount,
        canConfirmAllWithoutEdits: requiresDecisionCount === 0,
        lanes,
    };
}
