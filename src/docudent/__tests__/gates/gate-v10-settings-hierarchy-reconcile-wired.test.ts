import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-settings-hierarchy-reconcile-wired', () => {
    it('useSettings wires hierarchy reconciliation on load and save paths', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/settings/useSettings.ts'),
            'utf8'
        );

        expect(source).toContain("import { reconcileUserWithPracticeHierarchy } from './hierarchyPolicy'");
        expect(source).toContain('reconcileUserWithPracticeHierarchy(practiceNext, migratedStandards.next)');
        expect(source).toContain('reconcileUserWithPracticeHierarchy(next, userSettings)');
        expect(source).toContain('reconcileUserWithPracticeHierarchy(practiceSettings, merged)');
    });
});
