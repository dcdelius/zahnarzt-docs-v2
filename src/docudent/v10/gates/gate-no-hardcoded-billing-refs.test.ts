/**
 * GP6 Extended: No Hardcoded Billing Refs Gate
 * 
 * Extends previous gate to check:
 * - medical_kb.v1.json rules
 * - V10 UI pages/hooks/components
 * - Truthcases and golden artifacts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BILLING_PATTERN = /\b(GOZ|BEMA|BEL|GOÄ|GOA)_[0-9a-zA-Z_]+\b/g;

function getFilesInDir(dir: string, ext: string): string[] {
    try {
        return fs.readdirSync(dir)
            .filter(f => f.endsWith(ext))
            .map(f => path.join(dir, f));
    } catch {
        return [];
    }
}

function checkFilesForBillingCodes(files: string[]): string[] {
    const violations: string[] = [];
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(BILLING_PATTERN);
        if (matches) {
            violations.push(`${file}: ${matches.join(', ')}`);
        }
    }
    return violations;
}

describe('GP6: No Hardcoded Billing Refs - Extended', () => {
    it('no billing codes in pipeline source files', () => {
        const files = getFilesInDir('src/docudent/v10/pipeline', '.ts');
        const violations = checkFilesForBillingCodes(files);
        expect(violations).toEqual([]);
    });

    it('no billing codes in medical KB rules (outside sourceRefs)', () => {
        const kbPath = 'src/docudent/medical_kb/medical_kb.v1.json';
        const content = fs.readFileSync(kbPath, 'utf-8');
        const lines = content.split('\n');
        const violations: string[] = [];

        lines.forEach((line, i) => {
            // Skip sourceRefs, anchorId, and note lines
            if (line.includes('sourceRefs') || line.includes('anchorId') || line.includes('note')) {
                return;
            }
            const matches = line.match(BILLING_PATTERN);
            if (matches) {
                violations.push(`Line ${i + 1}: ${matches.join(', ')}`);
            }
        });

        expect(violations).toEqual([]);
    });

    it('no billing codes in hooks', () => {
        const files = getFilesInDir('src/docudent/v10/hooks', '.ts');
        const violations = checkFilesForBillingCodes(files);
        expect(violations).toEqual([]);
    });

    it('no billing codes in page components', () => {
        const files = getFilesInDir('src/docudent/v10/pages', '.tsx');
        const violations = checkFilesForBillingCodes(files);
        expect(violations).toEqual([]);
    });

    it('no billing codes in golden artifacts (outside docs)', () => {
        const goldenDir = 'src/docudent/v10/golden';
        const files = getFilesInDir(goldenDir, '.ts');
        const violations = checkFilesForBillingCodes(files);
        expect(violations).toEqual([]);
    });

    it('no billing codes in truthcase tests', () => {
        const testDir = 'src/docudent/v10/__tests__';
        const files = getFilesInDir(testDir, '.ts');
        const violations = checkFilesForBillingCodes(files);
        expect(violations).toEqual([]);
    });
});

describe('GP6: Medical KB Rules Integrity', () => {
    it('all rules emit chips, not billing codes', () => {
        const kbPath = 'src/docudent/medical_kb/medical_kb.v1.json';
        const content = fs.readFileSync(kbPath, 'utf-8');
        const kb = JSON.parse(content);

        const violations: string[] = [];

        kb.rules?.forEach((rule: { id: string; then?: Array<{ type: string; target: string }> }) => {
            rule.then?.forEach((action) => {
                if (action.type === 'emit_chip') {
                    // Chip targets should not be billing codes
                    if (BILLING_PATTERN.test(action.target)) {
                        violations.push(`Rule ${rule.id} emits billing code: ${action.target}`);
                    }
                }
            });
        });

        expect(violations).toEqual([]);
    });
});
