import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE_PATH = join(__dirname, '../../../../src/docudent/v10/pages/DocudentV10Page.tsx');

describe('gate-v10-intent-confirm-explicit-decision', () => {
    it('requires explicit treatment mapping before confirm in intent panel', () => {
        const content = readFileSync(PAGE_PATH, 'utf-8');
        expect(content).toContain('buildInitialIntentSelections');
        expect(content).toContain('getUnresolvedIntentIds');
        expect(content).toContain('disabled={unresolvedIntentIds.length > 0}');
        expect(content).toContain('Bitte ordne');
    });
});
