import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MEDICAL_DEFAULTS_PATH = join(ROOT, 'src/docudent/v10/settings/medicalDefaults.ts');

function extractFunctionBody(source: string, functionName: string): string {
    const marker = `export function ${functionName}`;
    const start = source.indexOf(marker);
    if (start < 0) return '';
    const nextFn = source.indexOf('\nexport function ', start + marker.length);
    return nextFn < 0 ? source.slice(start) : source.slice(start, nextFn);
}

describe('gate-v10-settings-medical-default-patch-no-legacy-keys', () => {
    it('keeps patch helpers writing normalized medicalDefaults only', () => {
        const source = readFileSync(MEDICAL_DEFAULTS_PATH, 'utf-8');
        const patchFunctions = [
            'patchPracticeDefaultAnestheticAgentId',
            'patchPracticeDefaultIsolation',
            'patchUserDefaultLAType',
            'patchUserDefaultLATypeUkPosterior',
            'patchUserDefaultAnestheticAgentId',
            'patchUserDefaultIsolation',
            'patchUserDefaultCappingMaterial',
        ];

        const blockedLegacyAssignments = [
            'defaultAnestheticAgentId:',
            'defaultIsolation:',
            'defaultLAType:',
            'defaultLATypeUkPosterior:',
            'defaultCappingMaterial:',
        ];

        for (const fn of patchFunctions) {
            const body = extractFunctionBody(source, fn);
            expect(body).toContain('medicalDefaults:');
            for (const blocked of blockedLegacyAssignments) {
                expect(body).not.toContain(blocked);
            }
        }
    });
});
