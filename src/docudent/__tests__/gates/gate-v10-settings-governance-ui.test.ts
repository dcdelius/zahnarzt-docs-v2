import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-settings-governance-ui', () => {
    it('exposes governance lock controls in practice scope', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/pages/SettingsPageV10.tsx'),
            'utf8'
        );

        expect(source).toContain('<Band label="Governance"');
        expect(source).toContain('Behandler-Behandlungen an Praxisliste koppeln');
        expect(source).toContain('Behandler-Materialdefaults (Füllung) sperren');
        expect(source).toContain('lockUserOverrides');
    });

    it('disables user controls when governance locks are active', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/pages/SettingsPageV10.tsx'),
            'utf8'
        );

        expect(source).toContain('disabled={isTreatmentOverrideLocked}');
        expect(source).toContain('disabled={isFuellungMaterialDefaultsLocked}');
        expect(source).toContain('Praxis-Governance aktiv: Behandlungsliste wird zentral durch die Praxis gesteuert.');
        expect(source).toContain('Praxis-Governance aktiv: Material-Defaults werden zentral vorgegeben.');
    });
});
