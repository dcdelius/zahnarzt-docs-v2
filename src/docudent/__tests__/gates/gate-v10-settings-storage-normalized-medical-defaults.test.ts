import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const USE_SETTINGS_PATH = join(ROOT, 'src/docudent/v10/settings/useSettings.ts');

function extractFunctionBody(source: string, functionName: string): string {
    const marker = `function ${functionName}`;
    const start = source.indexOf(marker);
    if (start < 0) return '';
    const nextFn = source.indexOf('\nfunction ', start + marker.length);
    return nextFn < 0 ? source.slice(start) : source.slice(start, nextFn);
}

describe('gate-v10-settings-storage-normalized-medical-defaults', () => {
    it('persists shared medical defaults via medicalDefaults, not legacy mirror fields', () => {
        const source = readFileSync(USE_SETTINGS_PATH, 'utf-8');

        const practiceSanitizer = extractFunctionBody(source, 'sanitizePracticeForFirestore');
        const userSanitizer = extractFunctionBody(source, 'sanitizeUserForFirestore');

        expect(practiceSanitizer).toContain('medicalDefaults: settings.medicalDefaults');
        expect(userSanitizer).toContain('medicalDefaults: settings.medicalDefaults');

        const blockedPracticeLegacyKeys = [
            'defaultIsolation: settings.defaultIsolation',
            'defaultAnestheticAgentId: settings.defaultAnestheticAgentId',
        ];
        const blockedUserLegacyKeys = [
            'defaultLAType: settings.defaultLAType',
            'defaultLATypeUkPosterior: settings.defaultLATypeUkPosterior',
            'defaultAnestheticAgentId: settings.defaultAnestheticAgentId',
            'defaultIsolation: settings.defaultIsolation',
            'defaultCappingMaterial: settings.defaultCappingMaterial',
        ];

        for (const key of blockedPracticeLegacyKeys) {
            expect(practiceSanitizer).not.toContain(key);
        }
        for (const key of blockedUserLegacyKeys) {
            expect(userSanitizer).not.toContain(key);
        }
    });
});
