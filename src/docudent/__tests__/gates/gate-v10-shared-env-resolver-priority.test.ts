import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESOLVER_PATH = join(__dirname, '../../../../scripts/v10/shared/resolveEnv.ts');

describe('gate-v10-shared-env-resolver-priority', () => {
    it('keeps .env.e2e.local as highest-priority file for hosted test tooling', () => {
        const source = readFileSync(RESOLVER_PATH, 'utf-8');
        expect(source).toContain("const DEFAULT_ENV_FILES = ['.env.e2e.local', '.env.local', '.env']");
    });
});

