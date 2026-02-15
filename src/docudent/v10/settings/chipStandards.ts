import type { SettingsInput } from './settingsTypes';
import { hasChipInKb } from '../renderer';

function uniqStable(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
        const trimmed = String(id ?? '').trim();
        if (!trimmed) continue;
        if (seen.has(trimmed)) continue;
        seen.add(trimmed);
        out.push(trimmed);
    }
    return out;
}

/**
 * Standard chips are auto-applied defaults (mostly documentation chips) and should always be
 * visible/overridable in the Control Center.
 */
export function getStandardChipIdsForInstance(params: {
    settings?: SettingsInput;
    treatmentId: string;
    tooth?: string;
}): string[] {
    const practice = params.settings?.practice;
    const user = params.settings?.user;

    const practiceGlobal = practice?.chipStandards?.global ?? [];
    const practicePerTreatment = practice?.chipStandards?.perTreatment?.[params.treatmentId] ?? [];
    const userGlobal = user?.chipStandards?.global ?? [];
    const userPerTreatment = user?.chipStandards?.perTreatment?.[params.treatmentId] ?? [];

    // TODO(v10): Add conditional standards (e.g. per tooth-group) once the UI model is ready.
    void params.tooth;

    const raw = uniqStable([
        ...practiceGlobal,
        ...practicePerTreatment,
        ...userGlobal,
        ...userPerTreatment,
    ]);
    return raw.filter(id => hasChipInKb(params.treatmentId, id));
}
