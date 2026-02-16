import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const DETECT_PREANALYSIS_PATH = join(__dirname, '../../v10/preanalysis/detectTreatmentIntents.ts');

describe('gate-v10-preanalysis-gateway-boundary', () => {
    it('routes browser preanalysis through backend gateway client', () => {
        const content = readFileSync(DETECT_PREANALYSIS_PATH, 'utf-8');
        expect(content).toContain("import('./preanalysisGatewayClient')");
    });

    it('does not use browser import.meta OpenAI key in active preanalysis path', () => {
        const content = readFileSync(DETECT_PREANALYSIS_PATH, 'utf-8');
        expect(content).not.toContain('import.meta.env?.VITE_OPENAI_API_KEY');
    });
});
