import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const FILES = [
    'src/docudent/v10/preanalysis/detectTreatmentIntents.ts',
    'src/docudent/v10/preanalysis/treatmentIntentContract.ts',
    'src/docudent/v10/llm/textRefiner.ts',
    'src/docudent/v10/llm/llmBoundaryContract.ts',
    'src/services/WhisperService.js',
];

function read(relPath: string): string {
    return readFileSync(join(ROOT, relPath), 'utf-8');
}

describe('gate-v10-llm-ssot-boundary', () => {
    it('LLM layer must not import billing engines or billing DB directly', () => {
        const violations: string[] = [];

        for (const file of FILES) {
            const source = read(file);
            const importsBillingEngine = /from\s+['"][^'"]*\/billing\//.test(source)
                || /from\s+['"][^'"]*billingDb/.test(source);
            if (importsBillingEngine) violations.push(file);
        }

        expect(violations).toEqual([]);
    });

    it('LLM layer source must not contain hardcoded billing code literals', () => {
        const violations: string[] = [];
        const literalPattern = /\b(?:BEMA|GOZ|GOAE|GOÄ|BEL)_?\d+[a-z]?\b/i;

        for (const file of FILES) {
            const source = read(file);
            if (literalPattern.test(source)) {
                violations.push(file);
            }
        }

        expect(violations).toEqual([]);
    });

    it('preanalysis contract remains strict and billing-agnostic', () => {
        const source = read('src/docudent/v10/preanalysis/treatmentIntentContract.ts');
        expect(source).toContain('}).strict()');
        expect(source).toContain('sharedFacts must not contain billing signals');
    });

    it('preanalysis prompt explicitly forbids billing fields', () => {
        const source = read('src/docudent/v10/preanalysis/detectTreatmentIntents.ts');
        expect(source).toContain('Keine Billing-Codes/Felder ausgeben');
    });
});
