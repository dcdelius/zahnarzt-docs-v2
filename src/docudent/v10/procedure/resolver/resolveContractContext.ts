import type { ContractContext, ProcedureFacts } from '../types';
import type { SettingsInput } from '../../settings/settingsTypes';
import { getStandardChipIdsForInstance } from '../../settings/chipStandards';
import { defaultTreatmentKbProvider } from '../../kb/treatment';

export function resolveContractContext(params: {
    facts: ProcedureFacts;
    settings?: SettingsInput;
    treatmentId?: string;
    tooth?: string;
}): ContractContext {
    const { facts, settings, treatmentId, tooth } = params;
    const standardChips = treatmentId
        ? getStandardChipIdsForInstance({ settings, treatmentId, tooth })
        : [];
    const availableChips = treatmentId
        ? (defaultTreatmentKbProvider.getTreatmentKb(treatmentId)?.chips ?? []).map(chip => chip.id)
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
