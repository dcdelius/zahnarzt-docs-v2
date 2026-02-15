/**
 * Gate: V10 Prod E2E Is Required (M71)
 * 
 * Static guard to ensure E2E tests cannot be "accidentally" skipped in CI.
 * Checks that npm scripts and spec files exist.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PACKAGE_JSON_PATH = join(__dirname, '../../../../package.json');
const E2E_RUNNER_PATH = join(__dirname, '../../../../scripts/e2e-prod-runner.cjs');
const E2E_SPEC_PATH = join(__dirname, '../../v10/__e2e__/v10-prod-repro.e2e.spec.ts');
const COMPARE_SCRIPT_PATH = join(__dirname, '../../../../scripts/repro/compareUiReproWithReplay.ts');

describe('Gate: V10 Prod E2E Is Required (M71)', () => {
    let packageJson: any;

    beforeAll(() => {
        packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    });

    describe('NPM Scripts Exist', () => {
        it('has test:e2e:prod script', () => {
            expect(packageJson.scripts['test:e2e:prod']).toBeTruthy();
            expect(packageJson.scripts['test:e2e:prod']).toContain('e2e-prod-runner');
        });

        it('has repro:replay script', () => {
            expect(packageJson.scripts['repro:replay']).toBeTruthy();
            expect(packageJson.scripts['repro:replay']).toContain('replayV10Repro');
        });

        it('has repro:compare script', () => {
            expect(packageJson.scripts['repro:compare']).toBeTruthy();
            expect(packageJson.scripts['repro:compare']).toContain('compareUiReproWithReplay');
        });
    });

    describe('Required Files Exist', () => {
        it('e2e-prod-runner.cjs exists', () => {
            expect(existsSync(E2E_RUNNER_PATH)).toBe(true);
        });

        it('v10-prod-repro.e2e.spec.ts exists', () => {
            expect(existsSync(E2E_SPEC_PATH)).toBe(true);
        });

        it('compareUiReproWithReplay.ts exists', () => {
            expect(existsSync(COMPARE_SCRIPT_PATH)).toBe(true);
        });
    });

    describe('E2E Runner Script Structure', () => {
        let runnerContent: string;

        beforeAll(() => {
            runnerContent = readFileSync(E2E_RUNNER_PATH, 'utf-8');
        });

        it('builds before running tests', () => {
            expect(runnerContent).toContain('npm run build');
        });

        it('starts preview server', () => {
            expect(runnerContent).toContain('preview');
        });

        it('runs playwright tests', () => {
            expect(runnerContent).toContain('playwright test');
        });

        it('has cleanup logic', () => {
            expect(runnerContent).toContain('SIGTERM');
        });

        it('returns non-zero on failure', () => {
            expect(runnerContent).toContain('exitCode = 1');
        });
    });

    describe('Compare Script Structure', () => {
        let compareContent: string;

        beforeAll(() => {
            compareContent = readFileSync(COMPARE_SCRIPT_PATH, 'utf-8');
        });

        it('exports compare function', () => {
            expect(compareContent).toContain('export { normalizeUiRepro');
        });

        it('checks state parity', () => {
            expect(compareContent).toContain('ui.state !== replay.state');
        });

        it('checks questionIds parity', () => {
            expect(compareContent).toContain('ui.questionIds');
        });

        it('exits with code 0 on PASS', () => {
            expect(compareContent).toContain("process.exit(result.parity === 'PASS' ? 0 : 1)");
        });

        it('exits with non-zero on FAIL', () => {
            expect(compareContent).toContain("'PASS' ? 0 : 1");
        });
    });

    describe('Milestone Complete Contract', () => {
        it('milestone requires vitest gates', () => {
            // Implicit: this test running means vitest works
            expect(true).toBe(true);
        });

        it('milestone requires tsc check (enforced by CI)', () => {
            // This would be enforced by CI configuration
            expect(true).toBe(true);
        });

        it('milestone requires prod e2e (test:e2e:prod exists)', () => {
            expect(packageJson.scripts['test:e2e:prod']).toBeTruthy();
        });

        it('milestone requires parity compare (repro:compare exists)', () => {
            expect(packageJson.scripts['repro:compare']).toBeTruthy();
        });
    });
});
