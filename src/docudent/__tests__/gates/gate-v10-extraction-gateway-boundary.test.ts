import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const EXTRACTION_SERVICE_PATH = join(__dirname, '../../core/extraction/extractionService.ts');

describe('gate-v10-extraction-gateway-boundary', () => {
    it('routes browser extraction through backend gateway client', () => {
        const content = readFileSync(EXTRACTION_SERVICE_PATH, 'utf-8');
        expect(content).toContain("import('./extractionGatewayClient')");
    });

    it('does not use browser import.meta OpenAI key in active extraction path', () => {
        const content = readFileSync(EXTRACTION_SERVICE_PATH, 'utf-8');
        expect(content).not.toContain('import.meta.env?.VITE_OPENAI_API_KEY');
    });
});
