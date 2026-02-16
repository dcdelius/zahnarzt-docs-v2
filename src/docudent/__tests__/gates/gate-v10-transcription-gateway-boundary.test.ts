import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const DOC_PAGE_PATH = join(ROOT, 'src/docudent/v10/pages/DocudentV10Page.tsx');
const CLIENT_PATH = join(ROOT, 'src/docudent/v10/audio/transcriptionGatewayClient.ts');

describe('gate-v10-transcription-gateway-boundary', () => {
    it('uses transcription gateway client in V10 page', () => {
        const source = readFileSync(DOC_PAGE_PATH, 'utf-8');
        expect(source).toContain("callTranscriptionGateway");
    });

    it('does not wire OpenAI API key directly in V10 page transcription path', () => {
        const source = readFileSync(DOC_PAGE_PATH, 'utf-8');
        expect(source).not.toContain('VITE_OPENAI_API_KEY');
        expect(source).not.toContain('WhisperService');
    });

    it('transcription gateway client calls callable cloud function', () => {
        const source = readFileSync(CLIENT_PATH, 'utf-8');
        expect(source).toContain("httpsCallable");
        expect(source).toContain("'transcribeAudioV1'");
    });
});
