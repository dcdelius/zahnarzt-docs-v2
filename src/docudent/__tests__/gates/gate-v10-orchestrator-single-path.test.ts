import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-orchestrator-single-path', () => {
    it('multi-treatment runV10Bundle delegates to pipeline runV10Bundle', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/multitreatment/runV10Bundle.ts'),
            'utf8'
        );

        expect(source).toContain("from '../pipeline/runV10Bundle'");
        expect(source).toContain('return runPipelineBundle(input, opts);');
    });
});
