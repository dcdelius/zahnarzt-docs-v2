import type { ContractContext, ProcedureFacts } from '../types';
import type { SettingsInput } from '../../settings/settingsTypes';
import { getStandardChipIdsForInstance } from '../../settings/chipStandards';
import { defaultTreatmentKbProvider } from '../../kb/treatment';

export function resolveContractContext(params: {
    facts: ProcedureFacts;
    settings?: SettingsInput;
    treatmentId?: string;
    tooth?: string;
    kbReleaseId?: string;
}): ContractContext {
    const { facts, settings, treatmentId, tooth, kbReleaseId } = params;
    const standardChips = treatmentId
        ? getStandardChipIdsForInstance({ settings, treatmentId, tooth })
        : [];
    const availableChips = treatmentId
        ? (defaultTreatmentKbProvider.getTreatmentKb(treatmentId, kbReleaseId)?.chips ?? []).map(chip => chip.id)
        : [];
    const strictKzv = settings?.practice?.strictKzvMode === true;

    return {
        values: {
            ...(facts.global ?? {}),
            standardChips,
            availableChips,
            strictKzv,
        },
    };
}
