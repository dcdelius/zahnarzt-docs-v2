/**
 * Gate: Billing No Legacy Imports Runtime
 *
 * Ensures v7/v10 runtime does not import from v6/_legacy/core/services.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Billing No Legacy Imports Runtime', () => {
    const forbiddenPatterns = [
        /from\s+['"].*v6\//,
        /from\s+['"].*_legacy/,
        /from\s+['"].*core\/services/,
    ];

    // Allowed exceptions (legitimate production imports, not legacy)
    const allowedExceptions = [
        // V10 selectExtractor needs to import the real LLM extractor for production
        {
            file: 'extraction/selectExtractor.ts',
            pattern: /from\s+['"].*core\/services/,
            reason: 'Legitimate LLM extractor import for production use',
        },
        // G55: LLM adapter is the isolated bridge to core/services (documented exception)
        {
            file: 'extraction/adapters/llmExtractorAdapter.ts',
            pattern: /from\s+['"].*core\/services/,
            reason: 'Isolated adapter for core/services - documented exception',
        },
    ];

    function checkDirectory(dirPath: string): string[] {
        const violations: string[] = [];

        if (!fs.existsSync(dirPath)) return violations;

        const files = fs.readdirSync(dirPath, { recursive: true }) as string[];

        for (const file of files) {
            if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
            if (file.includes('__tests__')) continue;
            if (file.includes('__test__')) continue;
            if (file.includes('.test.')) continue;

            const fullPath = path.join(dirPath, file);
            if (!fs.statSync(fullPath).isFile()) continue;

            const content = fs.readFileSync(fullPath, 'utf-8');

            for (const pattern of forbiddenPatterns) {
                if (pattern.test(content)) {
                    // Check if this is an allowed exception
                    const isAllowed = allowedExceptions.some(
                        (exc) => file.includes(exc.file) && exc.pattern.source === pattern.source
                    );
                    if (!isAllowed) {
                        violations.push(`${file} imports forbidden pattern: ${pattern.source}`);
                    }
                }
            }
        }

        return violations;
    }

    it('v10 runtime has no legacy imports', () => {
        const v10Path = path.join(process.cwd(), 'src/docudent/v10');
        const violations = checkDirectory(v10Path);

        expect(violations, violations.join('\n')).toHaveLength(0);
    });

    it('v7 runtime has no legacy imports', () => {
        const v7Path = path.join(process.cwd(), 'src/docudent/v7');
        const violations = checkDirectory(v7Path);

        expect(violations, violations.join('\n')).toHaveLength(0);
    });
});
