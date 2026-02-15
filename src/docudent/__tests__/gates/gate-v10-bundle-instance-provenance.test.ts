import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const RUN_BUNDLE_PATH = join(__dirname, '../../v10/pipeline/runV10Bundle.ts');

describe('gate-v10-bundle-instance-provenance', () => {
    it('dedupes questions per instance scope, not globally by id', () => {
        const content = readFileSync(RUN_BUNDLE_PATH, 'utf-8');
        expect(content).toContain("const scopeKey = `${item.question.instanceId ?? 'global'}::${item.question.id}`");
    });

    it('fails fast when billing codes miss instance provenance', () => {
        const content = readFileSync(RUN_BUNDLE_PATH, 'utf-8');
        expect(content).toContain('Invariant violation: bundle billing code without instanceId');
    });
});
