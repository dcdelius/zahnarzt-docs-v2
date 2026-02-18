import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const COMPOSER_PATH = join(ROOT, 'src/docudent/v10/llm/forensicComposer.ts');
const CLIENT_PATH = join(ROOT, 'src/docudent/v10/llm/forensicComposerGatewayClient.ts');

describe('gate-v10-forensic-composer-gateway-boundary', () => {
    it('does not use browser VITE_OPENAI_API_KEY in forensic composer', () => {
        const source = readFileSync(COMPOSER_PATH, 'utf-8');
        expect(source).not.toContain('VITE_OPENAI_API_KEY');
    });

    it('routes browser forensic composition through gateway client', () => {
        const source = readFileSync(COMPOSER_PATH, 'utf-8');
        expect(source).toContain('callForensicComposerGateway');
    });

    it('gateway client calls callable cloud function', () => {
        const source = readFileSync(CLIENT_PATH, 'utf-8');
        expect(source).toContain('httpsCallable');
        expect(source).toContain("'composeForensicDocumentationV1'");
    });
});
