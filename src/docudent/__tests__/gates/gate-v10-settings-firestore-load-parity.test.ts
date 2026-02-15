import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relPath: string): string {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('gate-v10-settings-firestore-load-parity', () => {
    it('hydrates strict KZV and chip standards from practice settings', () => {
        const source = read('src/docudent/v10/settings/useSettings.ts');

        expect(source).toContain('strictKzvMode: data.strictKzvMode');
        expect(source).toContain('chipStandards: data.chipStandards');
    });

    it('hydrates user anesthetic default from firestore', () => {
        const source = read('src/docudent/v10/settings/useSettings.ts');

        expect(source).toContain('defaultAnestheticAgentId: data.defaultAnestheticAgentId');
    });
});
