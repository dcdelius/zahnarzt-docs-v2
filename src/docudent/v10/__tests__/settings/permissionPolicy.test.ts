import { describe, expect, it } from 'vitest';

import { deriveSettingsCapabilities } from '../../settings/permissionPolicy';
import type { PracticeSettings } from '../../settings/settingsTypes';

describe('deriveSettingsCapabilities', () => {
    it('allows user management for practice admin roles', () => {
        const practice: PracticeSettings = { version: '1.0.0' };
        const caps = deriveSettingsCapabilities('practice_admin', practice);
        expect(caps.canManageUsers).toBe(true);
    });

    it('disables user treatment selection when practice lock is active', () => {
        const practice: PracticeSettings = {
            version: '1.0.0',
            lockUserOverrides: { enabledTreatments: true },
        };
        const caps = deriveSettingsCapabilities('provider', practice);
        expect(caps.canEditUserTreatmentSelection).toBe(false);
    });

    it('disables user fuellung material defaults when lock is active', () => {
        const practice: PracticeSettings = {
            version: '1.0.0',
            lockUserOverrides: { fuellungMaterialDefaults: true },
        };
        const caps = deriveSettingsCapabilities('provider', practice);
        expect(caps.canEditUserFuellungMaterialDefaults).toBe(false);
    });
});
