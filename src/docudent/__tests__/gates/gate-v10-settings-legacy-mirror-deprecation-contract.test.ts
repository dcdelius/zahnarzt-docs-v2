import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SETTINGS_TYPES_PATH = join(ROOT, 'src/docudent/v10/settings/settingsTypes.ts');

describe('gate-v10-settings-legacy-mirror-deprecation-contract', () => {
    it('marks shared legacy mirror fields as deprecated in type contract', () => {
        const source = readFileSync(SETTINGS_TYPES_PATH, 'utf-8');

        const requiredSnippets = [
            '@deprecated Legacy mirror. Canonical runtime source is',
            'defaultIsolation?:',
            'defaultAnestheticAgentId?:',
            'defaultLAType?:',
            'defaultLATypeUkPosterior?:',
            'defaultCappingMaterial?:',
        ];

        for (const snippet of requiredSnippets) {
            expect(source).toContain(snippet);
        }
    });
});
