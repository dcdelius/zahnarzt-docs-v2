import type { TreatmentIntentBundleV1 } from './treatmentIntentContract';
import type { IntentConfirmationViewModel } from './buildIntentConfirmationViewModel';

export type IntentSelectionMap = Record<string, string | undefined>;

export function buildInitialIntentSelections(
    bundle: TreatmentIntentBundleV1,
    viewModel: IntentConfirmationViewModel
): IntentSelectionMap {
    const laneByIntentId = new Map(viewModel.lanes.map(lane => [lane.intentId, lane]));
    const initial: IntentSelectionMap = {};

    for (const intent of bundle.intents) {
        const lane = laneByIntentId.get(intent.intentId);
        if (!lane) {
            initial[intent.intentId] = intent.treatmentId;
            continue;
        }
        initial[intent.intentId] = lane.requiresDecision ? undefined : intent.treatmentId;
    }

    return initial;
}

export function getUnresolvedIntentIds(
    viewModel: IntentConfirmationViewModel,
    selections: IntentSelectionMap
): string[] {
    return viewModel.lanes
        .filter(lane => lane.requiresDecision)
        .filter(lane => !selections[lane.intentId])
        .map(lane => lane.intentId);
}
