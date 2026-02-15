import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-settings-capabilities-ui-wired', () => {
    it('settings page derives capabilities from policy and uses them in UI guards', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/pages/SettingsPageV10.tsx'),
            'utf8'
        );

        expect(source).toContain("import { deriveSettingsCapabilities } from '../settings/permissionPolicy'");
        expect(source).toContain("import { useAuth } from '../../../contexts/AuthContext'");
        expect(source).toContain('const { actorRole } = useAuth();');
        expect(source).toContain('const capabilities = useMemo(');
        expect(source).toContain('deriveSettingsCapabilities(actorRole, practiceSettings)');
        expect(source).not.toContain('const actorRole = users.find(u => u.id === selectedUser)?.role;');
        expect(source).toContain('if (!capabilities.canManageUsers)');
        expect(source).toContain('capabilities.canManageUsers ? (');
    });
});
