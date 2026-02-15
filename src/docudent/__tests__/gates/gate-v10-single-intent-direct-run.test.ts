import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');

describe('gate-v10-single-intent-direct-run', () => {
    it('bypasses bundle orchestrator for single-intent detections', () => {
        const content = readFileSync(V10_PAGE_PATH, 'utf-8');
        expect(content).toContain('if (segments.length === 1) {');
        expect(content).toContain('await runPipeline({');
    });
});
