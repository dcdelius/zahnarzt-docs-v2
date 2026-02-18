import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveEnvValue, resolveFirstDefined } from '../../../../scripts/v10/shared/resolveEnv';

const createdDirs: string[] = [];

afterEach(() => {
    while (createdDirs.length > 0) {
        const dir = createdDirs.pop();
        if (!dir) continue;
        rmSync(dir, { recursive: true, force: true });
    }
});

function createTempEnvSet(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'docudent-env-resolver-'));
    createdDirs.push(dir);
    const paths: Record<string, string> = {};
    for (const [name, content] of Object.entries(files)) {
        const full = join(dir, name);
        writeFileSync(full, content, 'utf8');
        paths[name] = full;
    }
    return paths;
}

function withEnvUnset(keys: string[], fn: () => void) {
    const snapshot = new Map<string, string | undefined>();
    for (const key of keys) {
        snapshot.set(key, process.env[key]);
        delete process.env[key];
    }
    try {
        fn();
    } finally {
        for (const key of keys) {
            const value = snapshot.get(key);
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

describe('gate-v10-preanalysis-env-resolver', () => {
    it('resolves values by precedence .env.e2e.local > .env.local > .env', () => {
        const paths = createTempEnvSet({
            '.env': 'PLAYWRIGHT_BASE_URL=https://env.example\n',
            '.env.local': 'PLAYWRIGHT_BASE_URL=https://local.example\n',
            '.env.e2e.local': 'PLAYWRIGHT_BASE_URL=https://e2e-local.example\n',
        });

        const value = resolveEnvValue('PLAYWRIGHT_BASE_URL', [
            paths['.env.e2e.local'],
            paths['.env.local'],
            paths['.env'],
        ]);

        expect(value).toBe('https://e2e-local.example');
    });

    it('supports first-defined resolution across multiple env names', () => {
        const paths = createTempEnvSet({
            '.env': 'VITE_FIREBASE_API_KEY=firebase-vite-key\n',
        });
        withEnvUnset(['FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'], () => {
            const value = resolveFirstDefined(
                ['FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'],
                [paths['.env']]
            );

            expect(value).toBe('firebase-vite-key');
        });
    });

    it('falls back to process.env when present', () => {
        const previous = process.env.PLAYWRIGHT_BASE_URL;
        process.env.PLAYWRIGHT_BASE_URL = 'https://process.example';
        try {
            const value = resolveEnvValue('PLAYWRIGHT_BASE_URL', []);
            expect(value).toBe('https://process.example');
        } finally {
            if (previous === undefined) delete process.env.PLAYWRIGHT_BASE_URL;
            else process.env.PLAYWRIGHT_BASE_URL = previous;
        }
    });
});
