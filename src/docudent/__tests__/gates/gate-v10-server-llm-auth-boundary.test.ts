import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const FUNCTIONS_INDEX = join(ROOT, 'functions/src/index.ts');

function readFunctionsIndex(): string {
    return readFileSync(FUNCTIONS_INDEX, 'utf-8');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertCallableRequiresAuth(content: string, callableName: string) {
    const pattern = new RegExp(
        `export const ${escapeRegExp(callableName)} = functions\\.https\\.onCall\\([\\s\\S]*?\\n\\);`,
        'm'
    );
    const match = content.match(pattern);
    expect(match, `${callableName} callable block missing`).not.toBeNull();

    const callableBlock = match?.[0] ?? '';
    expect(callableBlock).toContain('context');
    expect(callableBlock).toContain('if (!context.auth)');
    expect(callableBlock).toContain("throw new functions.https.HttpsError('unauthenticated', 'Login required')");
}

describe('gate-v10-server-llm-auth-boundary', () => {
    it('requires authenticated callers for all active LLM gateways', () => {
        const content = readFunctionsIndex();
        assertCallableRequiresAuth(content, 'detectTreatmentIntentsV1');
        assertCallableRequiresAuth(content, 'extractFromDictationV1');
        assertCallableRequiresAuth(content, 'transcribeAudioV1');
        assertCallableRequiresAuth(content, 'refineDocumentationTextV1');
    });
});
