import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const REFINER_PATH = join(ROOT, 'src/docudent/v10/llm/textRefiner.ts');
const CLIENT_PATH = join(ROOT, 'src/docudent/v10/llm/textRefinerGatewayClient.ts');

describe('gate-v10-text-refiner-gateway-boundary', () => {
    it('does not use browser VITE_OPENAI_API_KEY in text refiner', () => {
        const source = readFileSync(REFINER_PATH, 'utf-8');
        expect(source).not.toContain('VITE_OPENAI_API_KEY');
    });

    it('routes browser text refinement through gateway client', () => {
        const source = readFileSync(REFINER_PATH, 'utf-8');
        expect(source).toContain('callTextRefinerGateway');
    });

    it('gateway client calls callable cloud function', () => {
        const source = readFileSync(CLIENT_PATH, 'utf-8');
        expect(source).toContain("httpsCallable");
        expect(source).toContain("'refineDocumentationTextV1'");
    });
});
