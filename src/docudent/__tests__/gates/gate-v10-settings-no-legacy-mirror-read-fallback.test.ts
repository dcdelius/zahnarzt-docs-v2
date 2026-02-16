import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MEDICAL_DEFAULTS_PATH = join(ROOT, 'src/docudent/v10/settings/medicalDefaults.ts');

describe('gate-v10-settings-no-legacy-mirror-read-fallback', () => {
    it('keeps exported runtime getters on canonical medicalDefaults only', () => {
        const source = readFileSync(MEDICAL_DEFAULTS_PATH, 'utf-8');

        expect(source).toContain('export function getPracticeDefaultIsolation');
        expect(source).toContain('return practice?.medicalDefaults?.isolation?.defaultMode;');
        expect(source).toContain('export function getPracticeDefaultAnestheticAgentId');
        expect(source).toContain('return practice?.medicalDefaults?.anesthesia?.defaultAgentId;');

        expect(source).toContain('export function getUserDefaultLAType');
        expect(source).toContain('return user?.medicalDefaults?.anesthesia?.defaultType;');
        expect(source).toContain('export function getUserDefaultLATypeUkPosterior');
        expect(source).toContain('return user?.medicalDefaults?.anesthesia?.ukPosteriorType;');
        expect(source).toContain('export function getUserDefaultAnestheticAgentId');
        expect(source).toContain('return user?.medicalDefaults?.anesthesia?.defaultAgentId;');
        expect(source).toContain('export function getUserDefaultIsolation');
        expect(source).toContain('return user?.medicalDefaults?.isolation?.defaultMode;');
        expect(source).toContain('export function getUserDefaultCappingMaterial');
        expect(source).toContain('return user?.medicalDefaults?.restorative?.defaultCappingMaterial;');
    });
});
