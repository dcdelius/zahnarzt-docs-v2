import type { PracticeSettings } from './settingsTypes';

export interface SettingsCapabilities {
    canManageUsers: boolean;
    canEditUserTreatmentSelection: boolean;
    canEditUserFuellungMaterialDefaults: boolean;
}

function isPracticeAdminRole(role?: string | null): boolean {
    const value = String(role || '').toLowerCase();
    return value.includes('practice_admin') || value.includes('admin') || value.includes('owner') || value.includes('praxis');
}

export function deriveSettingsCapabilities(
    actorRole: string | null | undefined,
    practice: PracticeSettings | undefined
): SettingsCapabilities {
    const canManageUsers = isPracticeAdminRole(actorRole);
    return {
        canManageUsers,
        canEditUserTreatmentSelection: practice?.lockUserOverrides?.enabledTreatments !== true,
        canEditUserFuellungMaterialDefaults: practice?.lockUserOverrides?.fuellungMaterialDefaults !== true,
    };
}
