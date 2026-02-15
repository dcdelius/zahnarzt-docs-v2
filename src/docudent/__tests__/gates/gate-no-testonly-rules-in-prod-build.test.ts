/**
 * Gate: No test-only rules in prod build
 * 
 * Ensures the production kombinationen.json contains no test-only rules.
 * Test rules must be in kombinationen.test_only.json and merged only in test/e2e mode.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('gate-no-testonly-rules-in-prod-build', () => {
    const prodPath = join(__dirname, '../../core/billing/knowledgeBase/regeln/kombinationen.json');
    const testOnlyPath = join(__dirname, '../../core/billing/knowledgeBase/regeln/kombinationen.test_only.json');

    it('prod kombinationen.json has no _testOnly marker', () => {
        const content = readFileSync(prodPath, 'utf-8');
        expect(content).not.toContain('_testOnly');
    });

    it('prod kombinationen.json has no TEST_ prefixed codes', () => {
        const rules = JSON.parse(readFileSync(prodPath, 'utf-8'));

        for (const rule of rules) {
            const betrifft = rule.betrifft || [];
            for (const code of betrifft) {
                expect(code).not.toMatch(/^TEST_/);
            }
        }
    });

    it('prod kombinationen.json has no E2E TEST in title', () => {
        const rules = JSON.parse(readFileSync(prodPath, 'utf-8'));

        for (const rule of rules) {
            expect(rule.titel).not.toContain('[E2E TEST]');
        }
    });

    it('test_only file exists and has _testOnly marker', () => {
        const content = readFileSync(testOnlyPath, 'utf-8');
        expect(content).toContain('_testOnly');
    });

    it('test_only file has TEST_ prefixed codes', () => {
        const rules = JSON.parse(readFileSync(testOnlyPath, 'utf-8'));

        const allCodes = rules.flatMap((r: any) => r.betrifft || []);
        const testCodes = allCodes.filter((c: string) => c.startsWith('TEST_'));

        expect(testCodes.length).toBeGreaterThan(0);
    });

    it('test_only rules have _testOnly: true', () => {
        const rules = JSON.parse(readFileSync(testOnlyPath, 'utf-8'));

        for (const rule of rules) {
            expect(rule._testOnly).toBe(true);
        }
    });
});
