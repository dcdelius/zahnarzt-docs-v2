import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE_PATH = join(__dirname, '../../../../src/docudent/v10/pages/DocudentV10Page.tsx');
const DEBUG_DRAWER_PATH = join(__dirname, '../../../../src/docudent/v10/components/V10DebugDrawer.tsx');

describe('gate-v10-llm-runtime-visibility', () => {
    it('keeps runtime meta marker and fallback banner in V10 page', () => {
        const page = readFileSync(PAGE_PATH, 'utf-8');
        expect(page).toContain('data-testid="v10-llm-runtime-meta"');
        expect(page).toContain('data-testid="v10-llm-fallback-banner"');
        expect(page).toContain('shouldShowLlmFallbackBanner');
    });

    it('keeps runtime diagnostics section in debug drawer', () => {
        const drawer = readFileSync(DEBUG_DRAWER_PATH, 'utf-8');
        expect(drawer).toContain('data-testid="v10-debug-llm-runtime-card"');
        expect(drawer).toContain('Preanalysis source');
        expect(drawer).toContain('Extraction llmError');
    });
});
