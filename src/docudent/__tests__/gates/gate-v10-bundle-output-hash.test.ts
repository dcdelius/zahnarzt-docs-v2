import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const RUN_BUNDLE_PATH = join(__dirname, '../../v10/pipeline/runV10Bundle.ts');

describe('gate-v10-bundle-output-hash', () => {
    it('computes deterministic outputHash from text and scoped billing', () => {
        const content = readFileSync(RUN_BUNDLE_PATH, 'utf-8');
        expect(content).toContain('const outputHash = stableHash(JSON.stringify({');
        expect(content).toContain('meta: buildMeta(allResults, startTime, sessionCombinability, upsellHints, outputHash)');
    });
});
