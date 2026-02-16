import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SETTINGS_PAGE_PATH = join(ROOT, 'src/docudent/v10/pages/SettingsPageV10.tsx');
const SETTINGS_DRAWER_PATH = join(ROOT, 'src/docudent/v10/components/V10SettingsDrawer.tsx');

describe('gate-v10-settings-medical-default-write-path', () => {
    it('routes global medical-default writes through medicalDefaults patch helpers', () => {
        const settingsPage = readFileSync(SETTINGS_PAGE_PATH, 'utf-8');
        const settingsDrawer = readFileSync(SETTINGS_DRAWER_PATH, 'utf-8');

        expect(settingsPage).toContain('patchUserDefaultLAType(');
        expect(settingsPage).toContain('patchUserDefaultLATypeUkPosterior(');
        expect(settingsPage).toContain('patchUserDefaultAnestheticAgentId(');
        expect(settingsPage).toContain('patchUserDefaultIsolation(');
        expect(settingsPage).toContain('patchUserDefaultCappingMaterial(');
        expect(settingsPage).toContain('patchPracticeDefaultAnestheticAgentId(');

        expect(settingsDrawer).toContain('patchUserDefaultLAType(');
        expect(settingsDrawer).toContain('patchUserDefaultCappingMaterial(');
        expect(settingsDrawer).toContain('patchPracticeDefaultIsolation(');

        // Prevent drift back to direct legacy field writes in UI components.
        const directLegacyWritePatterns = [
            /updateUser\(\{\s*defaultLAType\s*:/m,
            /updateUser\(\{\s*defaultLATypeUkPosterior\s*:/m,
            /updateUser\(\{\s*defaultAnestheticAgentId\s*:/m,
            /updateUser\(\{\s*defaultIsolation\s*:/m,
            /updateUser\(\{\s*defaultCappingMaterial\s*:/m,
            /updatePractice\(\{\s*defaultAnestheticAgentId\s*:/m,
            /onUpdate\(\{\s*defaultLAType\s*:/m,
            /onUpdate\(\{\s*defaultCappingMaterial\s*:/m,
            /onUpdate\(\{\s*defaultIsolation\s*:/m,
        ];

        for (const pattern of directLegacyWritePatterns) {
            expect(settingsPage).not.toMatch(pattern);
            expect(settingsDrawer).not.toMatch(pattern);
        }
    });
});
