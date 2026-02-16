import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function read(relPath: string): string {
    return readFileSync(join(ROOT, relPath), 'utf-8');
}

describe('gate-v10-server-openai-env-boundary', () => {
    it('does not allow VITE_OPENAI_API_KEY fallback in server execution paths', () => {
        const preanalysis = read('src/docudent/v10/preanalysis/detectTreatmentIntents.ts');
        const extraction = read('src/docudent/core/extraction/extractionService.ts');
        const functionsIndex = read('functions/src/index.ts');

        expect(preanalysis).not.toContain('VITE_OPENAI_API_KEY');
        expect(extraction).not.toContain('VITE_OPENAI_API_KEY');
        expect(functionsIndex).not.toContain('process.env.VITE_OPENAI_API_KEY');
    });

    it('keeps OPENAI_API_KEY as canonical server key source', () => {
        const extraction = read('src/docudent/core/extraction/extractionService.ts');
        const functionsIndex = read('functions/src/index.ts');
        const preanalysis = read('src/docudent/v10/preanalysis/detectTreatmentIntents.ts');

        expect(extraction).toContain('OPENAI_API_KEY');
        expect(preanalysis).toContain('OPENAI_API_KEY');
        expect(extraction).not.toContain('REACT_APP_OPENAI_API_KEY');
        expect(preanalysis).not.toContain('REACT_APP_OPENAI_API_KEY');
        expect(functionsIndex).toContain('process.env.OPENAI_API_KEY');
    });
});
