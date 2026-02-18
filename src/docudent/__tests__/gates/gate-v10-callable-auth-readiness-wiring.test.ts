import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(file: string): string {
    return readFileSync(join(process.cwd(), file), 'utf8');
}

describe('gate-v10-callable-auth-readiness-wiring', () => {
    it('wires callable auth readiness into preanalysis and extraction gateway clients', () => {
        const preanalysisGateway = read('src/docudent/v10/preanalysis/preanalysisGatewayClient.ts');
        const extractionGateway = read('src/docudent/core/extraction/extractionGatewayClient.ts');

        expect(preanalysisGateway).toContain('ensureCallableAuthReady');
        expect(preanalysisGateway).toContain('await ensureCallableAuthReady(');

        expect(extractionGateway).toContain('ensureCallableAuthReady');
        expect(extractionGateway).toContain('await ensureCallableAuthReady(');
    });
});

